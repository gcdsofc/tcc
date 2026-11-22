import { Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import {
  badRequest, callService, conflict, CurrentPrincipal, Database, forbidden, notFound, Public, TenantEndpoint, TenantPrincipal, text, unavailable,
} from '../../../libs/common/src';
import { canCloseRefused, canExecute, estimateTotal, isSettled, paymentFits, validateEstimateItems } from './domain';

const ALL_TENANT_ROLES = ['tenant_admin', 'attendant', 'mechanic', 'finance', 'customer'] as const;

/**
 * Ordens de serviço: abertura, diagnóstico, orçamento versionado, decisão do cliente,
 * conversa, execução, prontidão, pagamentos e encerramento. Tudo filtrado pelo tenant do token.
 */
@Controller()
export class OrdersController {
  constructor(private readonly db: Database) {}

  @Get('health')
  @Public()
  async health() {
    try { await this.db.query('select 1'); } catch { throw unavailable('Banco de dados indisponível.'); }
    return { service: 'workorders', status: 'ok' };
  }

  @Get('orders')
  @TenantEndpoint(...ALL_TENANT_ROLES)
  async list(@CurrentPrincipal() p: TenantPrincipal) {
    const result = this.isCustomer(p)
      ? await this.db.query('select * from orders where tenant_id=$1 and customer_identity_id=$2 order by opened_at desc', [p.activeTenantId, p.userId])
      : await this.db.query('select * from orders where tenant_id=$1 order by opened_at desc', [p.activeTenantId]);
    return result.rows;
  }

  @Get('history')
  @TenantEndpoint('customer')
  async history(@CurrentPrincipal() p: TenantPrincipal) {
    return (await this.db.query('select * from orders where tenant_id=$1 and customer_identity_id=$2 order by opened_at desc', [p.activeTenantId, p.userId])).rows;
  }

  @Post('orders')
  @TenantEndpoint('tenant_admin', 'attendant')
  async open(@CurrentPrincipal() p: TenantPrincipal, @Body() body: Record<string, unknown>) {
    const customerId = text(body?.customerId, 64);
    const vehicleId = text(body?.vehicleId, 64);
    const problem = text(body?.problem, 2000);
    if (!customerId || !vehicleId || !problem) throw badRequest('Cliente, veículo e problema são obrigatórios.');
    // O serviço de clientes confirma que cliente e veículo são da mesma oficina (sem acessar o banco dele).
    const owner = await callService<{ identityUserId: string | null }>(
      process.env.CUSTOMER_URL,
      `/internal/validate/${encodeURIComponent(customerId)}/${encodeURIComponent(vehicleId)}`,
      { headers: { 'x-tenant-id': p.activeTenantId } },
    );
    if (owner.status === 0 || owner.status >= 500) throw unavailable('Serviço de clientes temporariamente indisponível.');
    if (!owner.ok) throw badRequest('Cliente ou veículo não pertence a esta oficina.', 'FOREIGN_RECORD');
    const created = await this.db.query(
      `insert into orders(id,tenant_id,customer_id,vehicle_id,customer_identity_id,created_by,problem,status)
       values(gen_random_uuid(),$1,$2,$3,$4,$5,$6,'open') returning *`,
      [p.activeTenantId, customerId, vehicleId, owner.data?.identityUserId ?? null, p.userId, problem],
    );
    return created.rows[0];
  }

  @Get('orders/:id')
  @TenantEndpoint(...ALL_TENANT_ROLES)
  async detail(@CurrentPrincipal() p: TenantPrincipal, @Param('id') id: string) {
    const order = await this.findOrder(id, p);
    if (this.isCustomer(p) && order.customer_identity_id !== p.userId) throw forbidden('Acesso negado.');
    const [estimates, messages, executions, payments] = await Promise.all([
      this.db.query(
        `select e.*,coalesce(json_agg(i) filter(where i.id is not null),'[]') items from estimates e
         left join estimate_items i on i.estimate_id=e.id where e.order_id=$1 and e.tenant_id=$2 group by e.id order by e.version desc`,
        [order.id, order.tenant_id],
      ),
      this.db.query('select id,sender_name,sender_type,body,created_at from messages where order_id=$1 and tenant_id=$2 order by created_at', [order.id, order.tenant_id]),
      this.db.query('select description,performed_at from executions where order_id=$1 and tenant_id=$2 order by performed_at', [order.id, order.tenant_id]),
      this.db.query('select amount,method,created_at from payments where order_id=$1 and tenant_id=$2', [order.id, order.tenant_id]),
    ]);
    return { ...order, estimates: estimates.rows, messages: messages.rows, executions: executions.rows, payments: payments.rows };
  }

  @Post('orders/:id/diagnosis')
  @TenantEndpoint('tenant_admin', 'mechanic')
  @HttpCode(200)
  async diagnosis(@CurrentPrincipal() p: TenantPrincipal, @Param('id') id: string, @Body() body: Record<string, unknown>) {
    const order = await this.findOrder(id, p, false);
    if (!order || !['open', 'diagnosis', 'awaiting_approval'].includes(order.status)) throw conflict('Ordem não permite alteração de diagnóstico.');
    const diagnosis = text(body?.diagnosis, 4000);
    if (!diagnosis) throw badRequest('Diagnóstico obrigatório.');
    const updated = await this.db.query(`update orders set diagnosis=$1,status='diagnosis',updated_at=now() where id=$2 and tenant_id=$3 returning *`, [diagnosis, order.id, order.tenant_id]);
    return updated.rows[0];
  }

  @Post('orders/:id/estimates')
  @TenantEndpoint('tenant_admin', 'attendant', 'mechanic')
  async estimate(@CurrentPrincipal() p: TenantPrincipal, @Param('id') id: string, @Body() body: Record<string, unknown>) {
    const order = await this.findOrder(id, p, false);
    if (!order || ['closed_refused', 'closed', 'ready'].includes(order.status)) throw conflict('Ordem encerrada não aceita orçamento.');
    let items;
    try { items = validateEstimateItems(body?.items); } catch (error) { throw badRequest((error as Error).message); }
    const total = estimateTotal(items);
    return this.db.transaction(async (client) => {
      const version = (await client.query('select coalesce(max(version),0)+1 n from estimates where order_id=$1', [order.id])).rows[0].n;
      const created = await client.query(
        `insert into estimates(id,tenant_id,order_id,version,status,total,created_by) values(gen_random_uuid(),$1,$2,$3,'pending',$4,$5) returning *`,
        [order.tenant_id, order.id, version, total, p.userId],
      );
      for (const item of items) {
        await client.query('insert into estimate_items(id,estimate_id,kind,description,quantity,unit_price) values(gen_random_uuid(),$1,$2,$3,$4,$5)', [created.rows[0].id, item.kind, item.description, item.quantity, item.unitPrice]);
      }
      // A versão nova substitui a pendente anterior; versões e decisões antigas continuam no histórico.
      await client.query(`update estimates set status='superseded' where order_id=$1 and id<>$2 and status='pending'`, [order.id, created.rows[0].id]);
      await client.query(`update orders set status='awaiting_approval',updated_at=now() where id=$1`, [order.id]);
      return { ...created.rows[0], items };
    });
  }

  @Post('orders/:id/decision')
  @TenantEndpoint('customer')
  @HttpCode(200)
  async decide(@CurrentPrincipal() p: TenantPrincipal, @Param('id') id: string, @Body() body: Record<string, unknown>) {
    const decision = body?.decision;
    if (decision !== 'approved' && decision !== 'refused') throw badRequest('Decisão inválida.');
    const order = await this.findOrder(id, p, false);
    if (!order || order.customer_identity_id !== p.userId) throw notFound('Ordem não encontrada para este cliente.');
    const estimateId = text(body?.estimateId, 64);
    const estimate = await this.db.query(`select id from estimates where id::text=$1 and order_id=$2 and tenant_id=$3 and status='pending'`, [estimateId, order.id, order.tenant_id]);
    if (!estimate.rowCount) throw conflict('Somente a versão pendente pode receber decisão.');
    await this.db.transaction(async (client) => {
      await client.query('insert into decisions(id,tenant_id,estimate_id,user_id,decision,reason) values(gen_random_uuid(),$1,$2,$3,$4,$5)', [order.tenant_id, estimate.rows[0].id, p.userId, decision, text(body?.reason, 1000) || null]);
      await client.query('update estimates set status=$1 where id=$2', [decision, estimate.rows[0].id]);
      await client.query('update orders set status=$1,updated_at=now() where id=$2', [decision === 'approved' ? 'approved' : 'awaiting_approval', order.id]);
    });
    return { ok: true, decision };
  }

  @Post('orders/:id/messages')
  @TenantEndpoint('customer', 'tenant_admin', 'attendant', 'mechanic')
  async message(@CurrentPrincipal() p: TenantPrincipal, @Param('id') id: string, @Body() body: Record<string, unknown>) {
    const order = await this.findOrder(id, p);
    if (this.isCustomer(p) && order.customer_identity_id !== p.userId) throw forbidden('Acesso negado.');
    if (String(order.status).startsWith('closed')) throw conflict('Ordem encerrada; conversa somente para consulta.');
    const message = String(body?.body ?? '').trim();
    if (!message || message.length > 4000) throw badRequest('Mensagem deve conter de 1 a 4000 caracteres.');
    const created = await this.db.query(
      `insert into messages(id,tenant_id,order_id,user_id,sender_name,sender_type,body) values(gen_random_uuid(),$1,$2,$3,$4,$5,$6)
       returning id,sender_name,sender_type,body,created_at`,
      [order.tenant_id, order.id, p.userId, p.name, this.isCustomer(p) ? 'customer' : 'staff', message],
    );
    return created.rows[0];
  }

  @Post('orders/:id/execute')
  @TenantEndpoint('tenant_admin', 'mechanic')
  async execute(@CurrentPrincipal() p: TenantPrincipal, @Param('id') id: string, @Body() body: Record<string, unknown>) {
    const order = await this.findOrder(id, p);
    const approved = await this.db.query(`select id from estimates where order_id=$1 and tenant_id=$2 and status='approved' order by version desc limit 1`, [order.id, order.tenant_id]);
    if (!canExecute(order.status, (approved.rowCount ?? 0) > 0)) throw conflict('A ordem exige aprovação do orçamento vigente antes da execução.');
    const item = await this.db.query(`select id,description from estimate_items where id::text=$1 and estimate_id=$2 and kind='service'`, [text(body?.estimateItemId, 64), approved.rows[0].id]);
    if (!item.rowCount) throw badRequest('Selecione um serviço incluído no orçamento aprovado.');
    const created = await this.db.query(
      'insert into executions(id,tenant_id,order_id,estimate_item_id,description,performed_by) values(gen_random_uuid(),$1,$2,$3,$4,$5) returning *',
      [order.tenant_id, order.id, item.rows[0].id, item.rows[0].description, p.userId],
    );
    await this.db.query(`update orders set status='in_progress',updated_at=now() where id=$1`, [order.id]);
    return created.rows[0];
  }

  @Post('orders/:id/close-refused')
  @TenantEndpoint('tenant_admin', 'attendant')
  @HttpCode(200)
  async closeRefused(@CurrentPrincipal() p: TenantPrincipal, @Param('id') id: string, @Body() body: Record<string, unknown>) {
    const order = await this.findOrder(id, p);
    const latest = await this.db.query('select status from estimates where order_id=$1 order by version desc limit 1', [order.id]);
    if (!latest.rowCount || !canCloseRefused(latest.rows[0].status)) throw conflict('A versão mais recente precisa estar recusada pelo cliente.');
    const updated = await this.db.query(`update orders set status='closed_refused',closed_reason=$1,updated_at=now() where id=$2 returning *`, [text(body?.reason, 1000) || null, order.id]);
    return updated.rows[0];
  }

  @Post('orders/:id/ready')
  @TenantEndpoint('tenant_admin', 'mechanic')
  @HttpCode(200)
  async ready(@CurrentPrincipal() p: TenantPrincipal, @Param('id') id: string) {
    const order = await this.findOrder(id, p);
    const executed = await this.db.query<{ n: number }>('select count(*)::int n from executions where order_id=$1', [order.id]);
    if (!executed.rows[0].n) throw conflict('Registre ao menos um serviço executado.');
    return (await this.db.query(`update orders set status='ready',updated_at=now() where id=$1 returning *`, [order.id])).rows[0];
  }

  @Post('orders/:id/payments')
  @TenantEndpoint('tenant_admin', 'finance')
  async pay(@CurrentPrincipal() p: TenantPrincipal, @Param('id') id: string, @Body() body: Record<string, unknown>) {
    const order = await this.findOrder(id, p, false);
    if (!order || order.status !== 'ready') throw conflict('A ordem deve estar pronta para retirada antes do pagamento.');
    const amount = Number(body?.amount);
    const method = text(body?.method, 60);
    if (!(amount > 0) || !method) throw badRequest('Valor e forma de pagamento são obrigatórios.');
    const { total, paid } = await this.balance(order);
    if (!paymentFits(amount, paid, total)) throw conflict('O pagamento excede o saldo da ordem.');
    const created = await this.db.query('insert into payments(id,tenant_id,order_id,amount,method,recorded_by) values(gen_random_uuid(),$1,$2,$3,$4,$5) returning *', [order.tenant_id, order.id, amount, method, p.userId]);
    return created.rows[0];
  }

  @Post('orders/:id/close')
  @TenantEndpoint('tenant_admin', 'finance')
  @HttpCode(200)
  async close(@CurrentPrincipal() p: TenantPrincipal, @Param('id') id: string) {
    const order = await this.findOrder(id, p, false);
    if (!order || order.status !== 'ready') throw conflict('A ordem precisa estar pronta para retirada antes do encerramento.');
    const { total, paid } = await this.balance(order);
    if (!isSettled(total, paid)) throw conflict(`A ordem ainda possui saldo pendente de ${(total - paid).toFixed(2)}.`, 'OUTSTANDING_BALANCE');
    return (await this.db.query(`update orders set status='closed',updated_at=now() where id=$1 and tenant_id=$2 returning *`, [order.id, order.tenant_id])).rows[0];
  }

  private isCustomer(p: TenantPrincipal): boolean {
    return p.roles.includes('customer');
  }

  /** Busca a ordem só dentro da oficina ativa; ordem de outra oficina é tratada como inexistente. */
  private async findOrder(id: string, p: TenantPrincipal, required?: true): Promise<any>;
  private async findOrder(id: string, p: TenantPrincipal, required: false): Promise<any | undefined>;
  private async findOrder(id: string, p: TenantPrincipal, required = true) {
    const found = await this.db.query('select * from orders where id::text=$1 and tenant_id=$2', [id, p.activeTenantId]);
    if (!found.rowCount && required) throw notFound('Ordem não encontrada.');
    return found.rows[0];
  }

  private async balance(order: { id: string; tenant_id: string }) {
    const total = Number((await this.db.query(`select total from estimates where order_id=$1 and tenant_id=$2 and status='approved' order by version desc limit 1`, [order.id, order.tenant_id])).rows[0]?.total ?? 0);
    const paid = Number((await this.db.query('select coalesce(sum(amount),0) total from payments where order_id=$1 and tenant_id=$2', [order.id, order.tenant_id])).rows[0].total);
    return { total, paid };
  }
}
