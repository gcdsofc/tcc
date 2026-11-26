import assert from 'node:assert/strict';
// Regressões de bugs corrigidos:
// 1. A ordem de serviço vem "autodescritiva": nome do cliente e placa/marca/modelo do veículo,
//    para todos os papéis da oficina (inclusive mecânico e financeiro), na lista e no detalhe.
// 2. Ordem encerrada não volta para "pronta" nem é reencerrada por recusa.
// 3. Convite de cliente não reativa um membro da equipe que foi desativado.
// 4. Telefone canônico: o mesmo número digitado de formas diferentes é a mesma pessoa.
const root = process.env.APP_URL || 'http://localhost:8080';
async function call(path, { token, method = 'GET', body, expect = 200 } = {}) {
  const r = await fetch(root + path, { method, headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const data = await r.json().catch(() => ({}));
  assert.equal(r.status, expect, `${method} ${path}: ${JSON.stringify(data)}`);
  return data;
}
const login = (email) => call('/api/identity/auth/login', { method: 'POST', body: { email, password: 'GarageOps2026!' } });
const select = async (email, tenantId) => (await call('/api/identity/auth/select-office', { token: (await login(email)).token, method: 'POST', body: { tenantId } })).token;

const tenantA = '00000000-0000-4000-8000-000000000001';
const admin = await select('admin1@demo.garageops.local', tenantA);
const customers = await call('/api/customers/customers', { token: admin });
const vehicles = await call('/api/customers/vehicles', { token: admin });
const customerId = '00000000-0000-4000-8000-000000000601', vehicleId = '00000000-0000-4000-8000-000000000701';
const expectedCustomer = customers.find((c) => c.id === customerId);
const expectedVehicle = vehicles.find((v) => v.id === vehicleId);
assert.ok(expectedCustomer && expectedVehicle, 'Cliente e veículo demonstrativos devem existir na oficina A');
const order = await call('/api/orders/orders', { token: admin, method: 'POST', body: { customerId, vehicleId, problem: 'Conferência de cliente e veículo na ordem' }, expect: 201 });

const roles = {
  'administrador': admin,
  'atendente': await select('atendente.a@demo.garageops.local', tenantA),
  'mecânico': await select('mecanico.a@demo.garageops.local', tenantA),
  'financeiro': await select('financeiro.a@demo.garageops.local', tenantA),
  'cliente (Ana)': await select('ana@cliente.demo.local', tenantA),
};
for (const [role, token] of Object.entries(roles)) {
  const detail = await call(`/api/orders/orders/${order.id}`, { token });
  const listed = (await call('/api/orders/orders', { token })).find((o) => o.id === order.id);
  assert.ok(listed, `${role}: a ordem deve aparecer na lista`);
  for (const [where, o] of [['detalhe', detail], ['lista', listed]]) {
    assert.equal(o.customer_name, expectedCustomer.name, `${role} (${where}): nome do cliente`);
    assert.equal(o.vehicle_plate, expectedVehicle.plate, `${role} (${where}): placa`);
    assert.equal(o.vehicle_make, expectedVehicle.make, `${role} (${where}): marca`);
    assert.equal(o.vehicle_model, expectedVehicle.model, `${role} (${where}): modelo`);
  }
  // Não deve vazar dados de contato do cliente pela ordem.
  assert.equal(detail.customer_phone, undefined);
  assert.equal(detail.customer_email, undefined);
}
// Toda ordem listada (de qualquer cliente) para o mecânico vem com cliente e veículo resolvidos.
const mechanicList = await call('/api/orders/orders', { token: roles['mecânico'] });
for (const o of mechanicList) assert.ok(o.customer_name && o.vehicle_plate, `ordem ${o.id} sem cliente/veículo para o mecânico`);

// 2. Fluxo completo até o encerramento pago; depois disso, "pronta" deve ser recusado (409).
const mech = roles['mecânico'], ana = roles['cliente (Ana)'], fin = roles['financeiro'], att = roles['atendente'];
const estimate = await call(`/api/orders/orders/${order.id}/estimates`, { token: mech, method: 'POST', body: { items: [{ kind: 'service', description: 'Serviço de teste', quantity: 1, unitPrice: 100 }] }, expect: 201 });
await call(`/api/orders/orders/${order.id}/decision`, { token: ana, method: 'POST', body: { estimateId: estimate.id, decision: 'approved' } });
const item = (await call(`/api/orders/orders/${order.id}`, { token: mech })).estimates[0].items[0];
await call(`/api/orders/orders/${order.id}/ready`, { token: mech, method: 'POST', expect: 409 }); // ainda não está em execução
await call(`/api/orders/orders/${order.id}/execute`, { token: mech, method: 'POST', body: { estimateItemId: item.id }, expect: 201 });
await call(`/api/orders/orders/${order.id}/ready`, { token: mech, method: 'POST' });
await call(`/api/orders/orders/${order.id}/payments`, { token: fin, method: 'POST', body: { amount: 100, method: 'Pix' }, expect: 201 });
await call(`/api/orders/orders/${order.id}/close`, { token: fin, method: 'POST' });
await call(`/api/orders/orders/${order.id}/ready`, { token: mech, method: 'POST', expect: 409 });
assert.equal((await call(`/api/orders/orders/${order.id}`, { token: mech })).status, 'closed', 'Ordem paga continua encerrada');
const refused = await call('/api/orders/orders', { token: att, method: 'POST', body: { customerId, vehicleId, problem: 'Recusa definitiva' }, expect: 201 });
const refusedEstimate = await call(`/api/orders/orders/${refused.id}/estimates`, { token: att, method: 'POST', body: { items: [{ kind: 'part', description: 'Peça', quantity: 1, unitPrice: 10 }] }, expect: 201 });
await call(`/api/orders/orders/${refused.id}/decision`, { token: ana, method: 'POST', body: { estimateId: refusedEstimate.id, decision: 'refused' } });
await call(`/api/orders/orders/${refused.id}/close-refused`, { token: att, method: 'POST', body: { reason: 'Cliente desistiu' } });
await call(`/api/orders/orders/${refused.id}/close-refused`, { token: att, method: 'POST', body: { reason: 'outra' }, expect: 409 });
assert.equal((await call(`/api/orders/orders/${refused.id}`, { token: att })).closed_reason, 'Cliente desistiu', 'Motivo original preservado');

// 3. Membro desativado tenta voltar aceitando um convite de cliente com o próprio telefone.
const stamp = Date.now();
const phone = `+55119${String(stamp).slice(-8)}`;
const email = `desativado-${stamp}@demo.local`;
const member = await call('/api/identity/team', { token: admin, method: 'POST', body: { name: 'Mecânico Desativado', email, phone, role: 'mechanic', password: 'SenhaInicialForte1!' }, expect: 201 });
await call(`/api/identity/team/${member.id}`, { token: admin, method: 'PATCH', body: { status: 'inactive' } });
await call('/api/customers/customers', { token: admin, method: 'POST', body: { name: 'Mecânico Desativado', phone }, expect: 201 });
const invite = await call('/api/identity/invites', { token: admin, method: 'POST', body: { customerName: 'Mecânico Desativado', phone }, expect: 201 });
const ex = await call('/api/identity/auth/login', { method: 'POST', body: { email, password: 'SenhaInicialForte1!' } });
assert.equal(ex.offices.length, 0);
await call('/api/identity/invites/accept', { token: ex.token, method: 'POST', body: { token: invite.activationUrl.split('token=')[1], code: invite.devCode }, expect: 409 });
assert.equal((await call('/api/identity/tenants', { token: ex.token })).length, 0, 'Membro desativado continua sem acesso');
assert.equal((await call('/api/identity/team', { token: admin })).find((m) => m.id === member.id).status, 'inactive');

// 4a. Cadastro: a Ana (+5511991000301) já é cliente da oficina A; o mesmo número em outro formato é duplicado.
await call('/api/customers/customers', { token: admin, method: 'POST', body: { name: 'Ana de novo', phone: '(11) 99100-0301' }, expect: 409 });
// 4b. Convite: a Ana já tem acesso à oficina A, mesmo com o número digitado de outra forma.
await call('/api/identity/invites', { token: admin, method: 'POST', body: { customerName: 'Ana Cliente', phone: '11 99100 0301' }, expect: 409 });
// 4c. Pessoa nova: conta criada pelo convite da oficina D; a oficina E cadastra o mesmo número em outro formato.
const digits = String(Date.now()).slice(-8);
const officeD = await select('admin4@demo.garageops.local', '00000000-0000-4000-8000-000000000004');
const officeE = await select('admin5@demo.garageops.local', '00000000-0000-4000-8000-000000000005');
const personEmail = `telefone-${digits}@demo.local`;
const customerD = await call('/api/customers/customers', { token: officeD, method: 'POST', body: { name: 'Cliente Telefone', phone: `+55 (21) 9${digits.slice(0, 4)}-${digits.slice(4)}`, email: personEmail }, expect: 201 });
assert.equal(customerD.phone, `55219${digits}`, 'Telefone gravado no formato canônico');
const inviteD = await call('/api/identity/invites', { token: officeD, method: 'POST', body: { customerName: customerD.name, phone: customerD.phone }, expect: 201 });
const personPassword = 'SenhaClienteForte1!';
const person = await call('/api/identity/invites/activate', { method: 'POST', body: { token: inviteD.activationUrl.split('token=')[1], code: inviteD.devCode, name: customerD.name, email: personEmail, password: personPassword }, expect: 201 });
await call('/api/customers/customers', { token: officeE, method: 'POST', body: { name: 'Cliente Telefone', phone: `(21) 9${digits}` }, expect: 201 });
const inviteE = await call('/api/identity/invites', { token: officeE, method: 'POST', body: { customerName: 'Cliente Telefone', phone: `021 9${digits}` }, expect: 201 });
const tokenE = inviteE.activationUrl.split('token=')[1];
const verify = await call('/api/identity/invites/verify', { method: 'POST', body: { token: tokenE, code: inviteE.devCode }, expect: 409 });
assert.equal(verify.error, 'EXISTING_ACCOUNT', 'Mesmo telefone: não oferece segunda conta');
await call('/api/identity/invites/accept', { token: person.token, method: 'POST', body: { token: tokenE, code: inviteE.devCode } });
const personOffices = await call('/api/identity/tenants', { token: person.token });
assert.deepEqual(personOffices.map((o) => o.id).sort(), ['00000000-0000-4000-8000-000000000004', '00000000-0000-4000-8000-000000000005']);
await call('/api/identity/invites', { token: officeE, method: 'POST', body: { customerName: 'Cliente Telefone', phone: `+55219${digits}` }, expect: 409 });

console.log(`Ordens autodescritivas: ${Object.keys(roles).join(', ')} veem "${expectedCustomer.name}" e ${expectedVehicle.plate} (${expectedVehicle.make} ${expectedVehicle.model}); ${mechanicList.length} ordem(ns) da fila do mecânico resolvidas. Ordem encerrada não reabre nem é reencerrada. Convite não reativa membro desativado. Telefone em formatos diferentes é a mesma pessoa (cadastro e convite).`);
