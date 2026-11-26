import { useState, type FormEvent } from 'react';
import { useSession } from '../../app/session';
import { useTenantData } from '../../app/tenant-data';
import { useAsync, useResource } from '../../app/hooks';
import { capabilities } from '../../app/permissions';
import { currency, formatDate, formatDateTime, orderVehicleModel } from '../../app/format';
import { workordersService } from '../../services/workorders';
import { Feedback, Loading, OrderStatusPill, SectionTitle } from '../../components/ui';
import { Icon } from '../../components/Icon';
import type { Decision, EstimateItemInput, OrderDetail } from '../../types/api';
import { EstimateCard, EstimateForm } from './Estimates';
import { Conversation } from './Conversation';
import { PaymentPanel } from './PaymentPanel';

interface OrderDetailPageProps {
  orderId: string;
  onBack: () => void;
}

function DiagnosisBlock({
  order,
  canDiagnose,
  busy,
  onSave,
}: {
  order: OrderDetail;
  canDiagnose: boolean;
  busy: boolean;
  onSave: (text: string) => Promise<boolean>;
}) {
  const [text, setText] = useState(order.diagnosis || '');

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void onSave(text.trim());
  };

  return (
    <div className="diagnosis-block">
      <b>Diagnóstico</b>
      <p>{order.diagnosis || 'Ainda não registrado.'}</p>
      {canDiagnose && (
        <form onSubmit={submit}>
          <label className="visually-hidden" htmlFor="diagnosis-text">
            Diagnóstico técnico
          </label>
          <textarea
            id="diagnosis-text"
            placeholder="Descreva o diagnóstico técnico"
            value={text}
            onChange={(event) => setText(event.target.value)}
            required
          />
          <button className="secondary" disabled={busy}>
            {busy ? 'Salvando…' : 'Salvar diagnóstico'}
          </button>
        </form>
      )}
    </div>
  );
}

function ExecutionBlock({
  order,
  busy,
  onExecute,
}: {
  order: OrderDetail;
  busy: boolean;
  onExecute: (itemId: string) => Promise<boolean>;
}) {
  const [itemId, setItemId] = useState('');
  const services = (order.estimates.find((e) => e.status === 'approved')?.items || []).filter(
    (item) => item.kind === 'service',
  );

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void onExecute(itemId).then((ok) => {
      if (ok) setItemId('');
    });
  };

  return (
    <div className="workflow-action">
      <b>Orçamento aprovado</b>
      <p>Registre os serviços conforme forem realizados.</p>
      <form onSubmit={submit}>
        <label className="visually-hidden" htmlFor="execute-item">
          Serviço autorizado
        </label>
        <select id="execute-item" required value={itemId} onChange={(event) => setItemId(event.target.value)}>
          <option value="" disabled>
            Selecione serviço autorizado
          </option>
          {services.map((item) => (
            <option key={item.id} value={item.id}>
              {item.description}
            </option>
          ))}
        </select>
        <button className="primary" disabled={busy}>
          Registrar serviço executado
        </button>
      </form>
    </div>
  );
}

function CloseRefusalForm({ busy, onClose }: { busy: boolean; onClose: (reason: string) => Promise<boolean> }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');

  if (!open) {
    return (
      <button type="button" className="danger-button full-width" disabled={busy} onClick={() => setOpen(true)}>
        Encerrar por recusa definitiva
      </button>
    );
  }

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void onClose(reason).then((ok) => {
      if (ok) setOpen(false);
    });
  };

  return (
    <form className="decision-form" onSubmit={submit}>
      <label>
        Observação do encerramento <span className="optional">Opcional</span>
        <textarea
          value={reason}
          maxLength={1000}
          placeholder="Registre uma observação para o histórico."
          onChange={(event) => setReason(event.target.value)}
        />
      </label>
      <div className="decision-actions">
        <button type="button" className="secondary" onClick={() => setOpen(false)}>
          Voltar
        </button>
        <button type="submit" className="danger-button" disabled={busy}>
          {busy ? 'Encerrando…' : 'Confirmar encerramento'}
        </button>
      </div>
    </form>
  );
}

export function OrderDetailPage({ orderId, onBack }: OrderDetailPageProps) {
  const { tenantToken, tenantRoles } = useSession();
  const tenant = useTenantData();
  const can = capabilities(tenantRoles);
  const { busy, error, notice, run, setError, setNotice } = useAsync();

  const resource = useResource<OrderDetail>(
    (signal) => workordersService.getOrder(tenantToken, orderId, signal),
    [tenantToken, orderId],
  );
  const order = resource.data;

  const runCommand = (fn: () => Promise<unknown>, success?: string) =>
    run(async () => {
      await fn();
      resource.reload();
      await tenant.reload();
    }, success);

  if (resource.loading && !order) {
    return (
      <>
        <button type="button" className="back-link" onClick={onBack}>
          <Icon name="chevron-left" size={16} /> Voltar para as ordens
        </button>
        <Loading label="Carregando a ordem…" />
      </>
    );
  }

  if (!order) {
    return (
      <>
        <button type="button" className="back-link" onClick={onBack}>
          <Icon name="chevron-left" size={16} /> Voltar para as ordens
        </button>
        <Feedback error={resource.error || 'Não foi possível abrir esta ordem.'} />
      </>
    );
  }

  const approved = order.estimates.find((estimate) => estimate.status === 'approved');
  const paid = order.payments.reduce((total, payment) => total + Number(payment.amount || 0), 0);
  const outstanding = Math.max(0, Number(approved?.total || 0) - paid);
  const isClosed = String(order.status).startsWith('closed');
  const canShowEstimateForm =
    can.canCreateEstimate && !['closed_refused', 'closed', 'ready'].includes(order.status);
  const latestEstimateRefused = order.estimates[0]?.status === 'refused';

  const handleDecide = (decision: Decision, estimateId: string, reason: string | null) =>
    runCommand(
      () => workordersService.decide(tenantToken, order.id, estimateId, decision, reason),
      decision === 'approved'
        ? 'Orçamento aprovado. A oficina já pode iniciar o serviço.'
        : 'Recusa registrada. Você pode conversar com a oficina antes de decidir novamente.',
    );

  const handleEstimate = (items: EstimateItemInput[]) =>
    runCommand(
      () => workordersService.submitEstimate(tenantToken, order.id, items),
      'Orçamento enviado ao cliente para aprovação.',
    );

  return (
    <>
      <button type="button" className="back-link" onClick={onBack}>
        <Icon name="chevron-left" size={16} /> Voltar para as ordens
      </button>

      <div className="page-heading detail-title">
        <div>
          <p className="eyebrow">Ordem de serviço · {order.id.slice(0, 8).toUpperCase()}</p>
          <h1>{order.problem}</h1>
          <p>Aberta em {formatDate(order.opened_at)}</p>
          <dl className="order-parties">
            <div>
              <dt>Cliente</dt>
              <dd>{order.customer_name || 'Não informado'}</dd>
            </div>
            <div>
              <dt>Veículo</dt>
              <dd>
                {order.vehicle_plate ? <span className="plate-chip">{order.vehicle_plate}</span> : 'Não informado'}
                {orderVehicleModel(order) && <span> {orderVehicleModel(order)}</span>}
              </dd>
            </div>
          </dl>
        </div>
        <OrderStatusPill status={order.status} />
      </div>

      <Feedback error={error} notice={notice} onDismiss={() => { setError(''); setNotice(''); }} />

      <div className="detail-columns">
        <section className="content-card">
          <SectionTitle
            icon="gear"
            title="Diagnóstico e orçamento"
            description="O serviço só pode começar após a aprovação do orçamento."
          />

          <DiagnosisBlock
            order={order}
            canDiagnose={can.canDiagnose}
            busy={busy}
            onSave={(text) =>
              runCommand(() => workordersService.saveDiagnosis(tenantToken, order.id, text), 'Diagnóstico salvo.')
            }
          />

          {order.estimates.map((estimate) => (
            <EstimateCard
              key={estimate.id}
              estimate={estimate}
              canDecide={can.isCustomer}
              busy={busy}
              onDecide={handleDecide}
            />
          ))}

          {!!order.executions?.length && (
            <div className="workflow-action">
              <b>Serviços executados</b>
              <ul className="execution-list">
                {order.executions.map((execution, index) => (
                  <li key={`${execution.performed_at}-${index}`}>
                    <span>{execution.description}</span>
                    <small>{formatDateTime(execution.performed_at)}</small>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {order.status === 'closed_refused' && order.closed_reason && (
            <div className="workflow-action">
              <b>Encerrada por recusa</b>
              <p>{order.closed_reason}</p>
            </div>
          )}

          {canShowEstimateForm && (
            <EstimateForm busy={busy} onSubmit={handleEstimate} onInvalid={setError} />
          )}

          {can.canDiagnose && order.status === 'approved' && (
            <ExecutionBlock
              order={order}
              busy={busy}
              onExecute={(itemId) =>
                runCommand(
                  () => workordersService.execute(tenantToken, order.id, itemId),
                  'Serviço executado registrado.',
                )
              }
            />
          )}

          {can.canDiagnose && order.status === 'in_progress' && (
            <button
              type="button"
              className="primary workflow-button"
              disabled={busy}
              onClick={() =>
                runCommand(
                  () => workordersService.markReady(tenantToken, order.id),
                  'Veículo marcado como pronto para retirada.',
                )
              }
            >
              Marcar veículo como pronto
            </button>
          )}

          {can.canFinance && order.status === 'ready' && outstanding <= 0.01 && (
            <button
              type="button"
              className="primary workflow-button"
              disabled={busy}
              onClick={() =>
                runCommand(() => workordersService.close(tenantToken, order.id), 'Ordem encerrada após a quitação.')
              }
            >
              Encerrar ordem quitada
            </button>
          )}

          {can.canFinance && order.status === 'ready' && outstanding > 0.01 && (
            <div className="workflow-action payment-summary">
              <b>O encerramento depende da quitação.</b>
              <p>
                Saldo restante: <strong>{currency(outstanding)}</strong>. Registre o pagamento no
                painel ao lado.
              </p>
            </div>
          )}
        </section>

        <aside className="content-card conversation-card">
          <Conversation
            messages={order.messages}
            canMessage={can.canMessage}
            closed={isClosed}
            busy={busy}
            onSend={(body) =>
              runCommand(
                () => workordersService.addMessage(tenantToken, order.id, body),
                'Mensagem enviada para a conversa desta ordem.',
              )
            }
          />

          {can.canCloseRefusal && latestEstimateRefused && (
            <CloseRefusalForm
              busy={busy}
              onClose={(reason) =>
                runCommand(
                  () => workordersService.closeRefused(tenantToken, order.id, reason),
                  'Ordem encerrada por recusa; o histórico foi preservado.',
                )
              }
            />
          )}

          {can.canFinance && order.status === 'ready' && (
            <PaymentPanel
              approvedTotal={Number(approved?.total || 0)}
              paid={paid}
              outstanding={outstanding}
              payments={order.payments}
              busy={busy}
              onPay={(amount, method) =>
                runCommand(
                  () => workordersService.addPayment(tenantToken, order.id, amount, method),
                  'Pagamento registrado.',
                )
              }
            />
          )}
        </aside>
      </div>
    </>
  );
}
