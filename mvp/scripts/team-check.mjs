// Verifica a gestão de equipe pelo administrador da oficina (RF-005) contra o ambiente rodando.
// Cria uma oficina temporária pelo console da plataforma e a exclui no fim, sem tocar nos dados de demonstração.
import assert from 'node:assert/strict';
const root = process.env.APP_URL || 'http://localhost:8080';
async function call(path, { token, method = 'GET', body, expect = 200 } = {}) {
  const r = await fetch(root + path, { method, headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const data = await r.json().catch(() => ({}));
  assert.equal(r.status, expect, `${method} ${path}: ${JSON.stringify(data)}`);
  return data;
}
const login = (email, password = 'GarageOps2026!') => call('/api/identity/auth/login', { method: 'POST', body: { email, password } });
const select = async (email, tenantId, password) => (await call('/api/identity/auth/select-office', { token: (await login(email, password)).token, method: 'POST', body: { tenantId } })).token;

const run = Date.now();
const P = (await login('plataforma@garageops.local')).token;
const adminEmail = `admin-equipe-${run}@demo.local`;
const tenant = await call('/api/identity/platform/tenants', { token: P, method: 'POST', expect: 201, body: { name: 'Oficina Teste Equipe', slug: `teste-equipe-${run}`, ownerName: 'Admin Equipe', ownerEmail: adminEmail, ownerPhone: '+5511960000000', ownerPassword: 'SenhaInicial2026!' } });
try {
  const A = await select(adminEmail, tenant.id, 'SenhaInicial2026!');

  // Lista começa só com o administrador.
  let team = await call('/api/identity/team', { token: A });
  assert.equal(team.length, 1);
  assert.deepEqual(team[0].roles, ['tenant_admin']);

  // Cadastra um mecânico novo, que consegue entrar e abrir a oficina com o papel certo.
  const mechEmail = `mecanico-${run}@demo.local`;
  const mech = await call('/api/identity/team', { token: A, method: 'POST', expect: 201, body: { name: 'Mecânico Novo', email: mechEmail, phone: '+5511960000001', role: 'mechanic', password: 'SenhaMecanico2026!' } });
  assert.equal(mech.account, 'created');
  const mechLogin = await login(mechEmail, 'SenhaMecanico2026!');
  assert.deepEqual(mechLogin.offices.map((o) => o.roles), [['mechanic']]);
  const M = await select(mechEmail, tenant.id, 'SenhaMecanico2026!');
  await call('/api/orders/orders', { token: M });

  // Reaproveita a conta global de quem já existe (Bruno), sem pedir senha.
  const reused = await call('/api/identity/team', { token: A, method: 'POST', expect: 201, body: { name: 'Bruno', email: 'bruno@cliente.demo.local', phone: '+5511991000302', role: 'attendant' } });
  assert.equal(reused.account, 'existing');
  await call('/api/identity/team', { token: A, method: 'POST', expect: 409, body: { name: 'Bruno', email: 'bruno@cliente.demo.local', phone: '+5511991000302', role: 'finance' } });

  // Recusas: dados faltando, papel de cliente, conta da plataforma, conta nova sem senha.
  await call('/api/identity/team', { token: A, method: 'POST', expect: 400, body: { name: '', email: 'x@demo.local', phone: '1', role: 'mechanic', password: 'SenhaValida2026!' } });
  await call('/api/identity/team', { token: A, method: 'POST', expect: 400, body: { name: 'X', email: `c-${run}@demo.local`, phone: '1', role: 'customer', password: 'SenhaValida2026!' } });
  await call('/api/identity/team', { token: A, method: 'POST', expect: 400, body: { name: 'X', email: 'plataforma@garageops.local', phone: '1', role: 'mechanic' } });
  await call('/api/identity/team', { token: A, method: 'POST', expect: 400, body: { name: 'X', email: `semsenha-${run}@demo.local`, phone: '1', role: 'mechanic' } });

  // Troca papel, desativa (some da lista de oficinas e não abre mais) e reativa.
  await call(`/api/identity/team/${mech.id}`, { token: A, method: 'PATCH', body: { role: 'finance' } });
  assert.deepEqual((await login(mechEmail, 'SenhaMecanico2026!')).offices[0].roles, ['finance']);
  await call(`/api/identity/team/${mech.id}`, { token: A, method: 'PATCH', body: { status: 'inactive' } });
  assert.equal((await login(mechEmail, 'SenhaMecanico2026!')).offices.length, 0);
  await call('/api/identity/auth/select-office', { token: mechLogin.token, method: 'POST', body: { tenantId: tenant.id }, expect: 403 });
  await call(`/api/identity/team/${mech.id}`, { token: A, method: 'PATCH', body: { status: 'active' } });

  // O administrador não altera o próprio acesso, e a oficina não fica sem administrador.
  team = await call('/api/identity/team', { token: A });
  const self = team.find((m) => m.roles.includes('tenant_admin'));
  await call(`/api/identity/team/${self.id}`, { token: A, method: 'PATCH', body: { status: 'inactive' }, expect: 403 });
  await call(`/api/identity/team/${mech.id}`, { token: A, method: 'PATCH', body: { role: 'tenant_admin' } });
  const M2 = await select(mechEmail, tenant.id, 'SenhaMecanico2026!');
  await call(`/api/identity/team/${self.id}`, { token: M2, method: 'PATCH', body: { role: 'attendant' } });
  await call(`/api/identity/team/${mech.id}`, { token: A, method: 'PATCH', body: { status: 'inactive' }, expect: 403 }); // A não é mais admin
  const A2 = await select(mechEmail, tenant.id, 'SenhaMecanico2026!');
  await call(`/api/identity/team/${self.id}`, { token: A2, method: 'PATCH', body: { role: 'tenant_admin' } });

  // Isolamento: outra oficina e outros papéis não veem nem alteram esta equipe.
  const otherAdmin = await select('admin1@demo.garageops.local', '00000000-0000-4000-8000-000000000001');
  await call(`/api/identity/team/${mech.id}`, { token: otherAdmin, method: 'PATCH', body: { status: 'inactive' }, expect: 404 });
  assert.ok(!(await call('/api/identity/team', { token: otherAdmin })).some((m) => m.id === mech.id));
  const attendant = await select('atendente.a@demo.garageops.local', '00000000-0000-4000-8000-000000000001');
  await call('/api/identity/team', { token: attendant, expect: 403 });
  await call('/api/identity/team', { token: P, expect: 403 });

  console.log('Equipe verificada: cadastro, conta reaproveitada, troca de papel, desativação, proteção do último administrador e isolamento entre oficinas.');
} finally {
  await call(`/api/identity/platform/tenants/${tenant.id}`, { token: P, method: 'DELETE', body: { confirmSlug: tenant.slug }, expect: 204 });
}
