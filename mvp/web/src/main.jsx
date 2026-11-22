import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';

const api = async (path, { token, ...options } = {}) => {
  let response;
  try { response = await fetch(path, {
    ...options,
    cache: 'no-store',
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  }); } catch {
    // Sem resposta do servidor (fora do ar, reiniciando ou sem rede): nada foi salvo.
    const offline = Error('Não foi possível falar com o servidor. Nada foi salvo; aguarde alguns segundos e tente novamente.'); offline.status = 0; throw offline;
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) { const problem = Error(data.error || `Falha na solicitação (${response.status}).`); problem.status = response.status; throw problem; }
  return data;
};

const statusLabels = {
  open: 'Aberta', diagnosis: 'Em diagnóstico', awaiting_approval: 'Aguardando aprovação',
  approved: 'Aprovada', in_progress: 'Em execução', ready: 'Pronta para retirada',
  closed: 'Concluída e paga', closed_refused: 'Encerrada por recusa',
};

const demoAccounts = [
  { group: 'Plataforma GarageOps', accounts: [
    { label: 'Administrador da plataforma · gerencia oficinas', email: 'plataforma@garageops.local' },
  ] },
  { group: 'Garagem Central · Oficina A', accounts: [
    { label: 'Administrador', email: 'admin1@demo.garageops.local' },
    { label: 'Atendente', email: 'atendente.a@demo.garageops.local' },
    { label: 'Mecânico', email: 'mecanico.a@demo.garageops.local' },
    { label: 'Financeiro', email: 'financeiro.a@demo.garageops.local' },
  ] },
  { group: 'Horizonte · Oficina B', accounts: [
    { label: 'Administrador', email: 'admin2@demo.garageops.local' },
    { label: 'Atendente', email: 'atendente.h@demo.garageops.local' },
    { label: 'Mecânico', email: 'mecanico.h@demo.garageops.local' },
    { label: 'Financeiro', email: 'financeiro.b@demo.garageops.local' },
  ] },
  { group: 'Torque · Oficina C', accounts: [
    { label: 'Administrador', email: 'admin3@demo.garageops.local' },
    { label: 'Atendente', email: 'atendente.t@demo.garageops.local' },
    { label: 'Mecânico', email: 'mecanico.t1@demo.garageops.local' },
    { label: 'Financeiro', email: 'financeiro.c@demo.garageops.local' },
  ] },
  { group: 'Box 12 · Oficina D', accounts: [
    { label: 'Administrador', email: 'admin4@demo.garageops.local' },
    { label: 'Atendente', email: 'atendente.b1@demo.garageops.local' },
    { label: 'Mecânico', email: 'mecanico.box@demo.garageops.local' },
    { label: 'Financeiro', email: 'financeiro.d@demo.garageops.local' },
  ] },
  { group: 'Rota Auto Center · Oficina E', accounts: [
    { label: 'Administrador', email: 'admin5@demo.garageops.local' },
    { label: 'Atendente', email: 'atendente.r1@demo.garageops.local' },
    { label: 'Mecânico', email: 'mecanico.r1@demo.garageops.local' },
    { label: 'Financeiro', email: 'financeiro.e@demo.garageops.local' },
  ] },
  { group: 'Clientes', accounts: [
    { label: 'Ana · vinculada às oficinas A, B e C', email: 'ana@cliente.demo.local' },
    { label: 'Bruno · vinculado às cinco oficinas', email: 'bruno@cliente.demo.local' },
  ] },
];

function App() {
  const [globalToken, setGlobalToken] = useState(localStorage.g || '');
  const [token, setToken] = useState(localStorage.t || '');
  const [user, setUser] = useState(JSON.parse(localStorage.u || 'null'));
  const [offices, setOffices] = useState([]);
  const [office, setOffice] = useState(JSON.parse(localStorage.o || 'null'));
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [selected, setSelected] = useState(null);
  const [page, setPage] = useState('home');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [inviteData, setInviteData] = useState(null);
  const [platform, setPlatform] = useState(localStorage.p === '1');
  const [customerSearch, setCustomerSearch] = useState('');
  const [address, setAddress] = useState(emptyAddress);
  const [cepStatus, setCepStatus] = useState({ tone: '', text: '' });
  const [vehicleRef, setVehicleRef] = useState(emptyVehicleRef);
  const [inviteLogin, setInviteLogin] = useState(false);
  const [invitePreview, setInvitePreview] = useState(null);
  const [orderFilter, setOrderFilter] = useState('');
  const [orderCustomerId, setOrderCustomerId] = useState('');
  const [demoEmail, setDemoEmail] = useState('');
  const [estimateItems, setEstimateItems] = useState([{ kind: 'service', description: '', quantity: '1', unitPrice: '' }]);
  const [refusalEstimateId, setRefusalEstimateId] = useState('');
  const [refusalReason, setRefusalReason] = useState('');
  const [closingRefusal, setClosingRefusal] = useState(false);
  const [closeRefusalReason, setCloseRefusalReason] = useState('');
  const inviteToken = new URLSearchParams(location.search).get('token');
  const customerRole = office?.roles?.includes('customer');
  const staff = office?.roles?.some(role => ['owner', 'attendant'].includes(role));
  const mechanicRole = office?.roles?.includes('mechanic');
  const financeRole = office?.roles?.includes('finance');
  const owner = office?.roles?.includes('owner');
  const canRegister = office?.roles?.some(role => ['owner', 'attendant'].includes(role));
  const canOpenOrders = canRegister;
  const canDiagnose = office?.roles?.some(role => ['owner', 'mechanic'].includes(role));
  const canCreateEstimate = office?.roles?.some(role => ['owner', 'attendant', 'mechanic'].includes(role));
  const canCloseRefusal = canRegister;
  const canMessage = office?.roles?.some(role => ['owner', 'attendant', 'mechanic', 'customer'].includes(role));
  const canFinance = office?.roles?.some(role => ['owner', 'finance'].includes(role));
  const approvedEstimate = selected?.estimates?.find(estimate => estimate.status === 'approved');
  const paidAmount = (selected?.payments || []).reduce((total, payment) => total + Number(payment.amount || 0), 0);
  const outstandingAmount = Math.max(0, Number(approvedEstimate?.total || 0) - paidAmount);

  const act = async fn => {
    setError(''); setNotice(''); setBusy(true);
    try { await fn(); } catch (problem) { setError(problem.message); }
    finally { setBusy(false); }
  };

  const clearOffice = message => {
    localStorage.removeItem('t'); localStorage.removeItem('o');
    setToken(''); setOffice(null); setSelected(null); setOrders([]); setCustomers([]); setVehicles([]);
    if (message) setError(message);
  };

  const signout = () => {
    localStorage.clear(); setGlobalToken(''); setToken(''); setUser(null); setPlatform(false);
    setOffice(null); setSelected(null); setOffices([]); setOrders([]); setCustomers([]); setVehicles([]); setPage('home');
  };

  const refresh = async activeToken => {
    const currentToken = activeToken || token;
    if (!currentToken) return;
    const allowedRoles = office?.roles || [];
    const canReadPeople = allowedRoles.some(role => ['owner', 'attendant', 'mechanic', 'customer'].includes(role));
    const [orderData, customerData, vehicleData] = await Promise.all([
      api('/api/orders/orders', { token: currentToken }),
      canReadPeople ? api('/api/customers/customers', { token: currentToken }) : Promise.resolve([]),
      canReadPeople ? api('/api/customers/vehicles', { token: currentToken }) : Promise.resolve([]),
    ]);
    setOrders(orderData); setCustomers(customerData); setVehicles(vehicleData);
  };

  useEffect(() => {
    if (globalToken && !token && !platform) api('/api/identity/tenants', { token: globalToken })
      .then(setOffices).catch(() => setOffices([]));
  }, [globalToken, token, platform]);

  // A stored office token can expire or be left behind by an older session.
  // Validate it before loading tenant-specific records so the screen can recover cleanly.
  useEffect(() => {
    if (!token) return;
    let active = true;
    (async () => {
      try {
        const session = await api('/api/identity/auth/me', { token });
        if (!session.tenantId || (office?.id && session.tenantId !== office.id)) {
          if (active) clearOffice('Sua sessão estava sem uma oficina ativa. Escolha uma oficina para continuar.');
          return;
        }
        await refresh(token);
      } catch (problem) {
        if (active && problem.status === 401) signout();
        else if (active) clearOffice('Sua sessão não está ativa para esta oficina. Selecione uma oficina novamente.');
      }
    })();
    return () => { active = false; };
  }, [token]);

  const login = async event => {
    event.preventDefault();
    const formElement = event.currentTarget; const form = new FormData(formElement);
    const data = await api('/api/identity/auth/login', {
      method: 'POST', body: JSON.stringify({ email: form.get('email'), password: form.get('password') }),
    });
    localStorage.g = data.token; localStorage.u = JSON.stringify(data.user);
    if (data.platform) localStorage.p = '1'; else localStorage.removeItem('p');
    setPlatform(!!data.platform);
    setGlobalToken(data.token); setUser(data.user); setOffices(data.offices);
    setToken(''); setOffice(null); setError(''); setPage('home');
  };

  const chooseOffice = async selectedOffice => {
    const data = await api('/api/identity/auth/select-office', {
      token: globalToken, method: 'POST', body: JSON.stringify({ tenantId: selectedOffice.id }),
    });
    if (!data.token || !data.office?.id) throw Error('Não foi possível ativar esta oficina. Atualize a página e tente novamente.');
    localStorage.t = data.token; localStorage.o = JSON.stringify(data.office);
    setToken(data.token); setOffice(data.office); setSelected(null); setOrders([]); setCustomers([]); setVehicles([]); setPage('home');
    setNotice(`Oficina ${data.office.name} selecionada.`);
  };

  const addCustomer = async event => {
    event.preventDefault(); const formElement = event.currentTarget; const form = new FormData(formElement);
    await api('/api/customers/customers', { token, method: 'POST', body: JSON.stringify({
      name: form.get('name'), phone: form.get('phone'), email: form.get('email'), ...address,
    }) });
    formElement.reset(); setAddress(emptyAddress); setCepStatus({ tone: '', text: '' });
    await refresh(); setNotice('Cliente cadastrado nesta oficina.');
  };

  // Integração externa (ViaCEP) passando pelo serviço de clientes; se falhar, o endereço é digitado à mão.
  const lookupCep = async () => {
    const cep = address.cep.replace(/\D/g, '');
    if (!cep) return;
    if (cep.length !== 8) { setCepStatus({ tone: 'error', text: 'O CEP precisa ter 8 dígitos.' }); return; }
    setCepStatus({ tone: 'loading', text: 'Consultando o ViaCEP…' });
    try {
      const found = await api(`/api/customers/address/${cep}`, { token });
      setAddress(current => ({ ...current, street: found.street || '', district: found.district || '', city: found.city || '', state: found.state || '' }));
      setCepStatus({ tone: 'ok', text: 'Endereço preenchido pelo ViaCEP. Confira e informe o número.' });
    } catch (problem) {
      setCepStatus({ tone: 'error', text: `${problem.message} Você pode preencher o endereço manualmente.` });
    }
  };
  const addressField = key => ({ value: address[key], onChange: event => setAddress(current => ({ ...current, [key]: event.target.value })) });

  const addVehicle = async event => {
    event.preventDefault(); const formElement = event.currentTarget; const form = new FormData(formElement);
    if (vehicleRef.mode === 'fipe' && vehicleRef.brand && !vehicleRef.fipeCode) throw Error('Escolha marca, modelo e ano nas listas da FIPE ou use o preenchimento manual.');
    await api('/api/customers/vehicles', { token, method: 'POST', body: JSON.stringify({
      customerId: form.get('customerId'), plate: form.get('plate'), make: vehicleRef.brand.trim() || null,
      model: vehicleRef.model.trim() || null, year: Number(vehicleRef.year) || null, fipeCode: vehicleRef.fipeCode || null,
    }) });
    formElement.reset(); setVehicleRef(current => ({ ...emptyVehicleRef, mode: current.mode })); await refresh(); setNotice('Veículo cadastrado.');
  };

  const makeInvite = async event => {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    const customer = customers.find(item => item.id === form.get('customerId'));
    if (!customer) throw Error('Selecione um cliente cadastrado nesta oficina.');
    setInviteData(await api('/api/identity/invites', { token, method: 'POST', body: JSON.stringify({
      customerName: customer.name, phone: customer.phone,
    }) }));
    setNotice('Convite gerado. Compartilhe o link e o código somente com o cliente.');
  };

  const activateInvite = async event => {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    const data = await api('/api/identity/invites/activate', { method: 'POST', body: JSON.stringify({
      token: inviteToken, code: invitePreview.code, email: invitePreview.email || form.get('email'), password: form.get('password'),
    }) });
    setInvitePreview(null);
    localStorage.g = data.token; localStorage.u = JSON.stringify(data.user);
    setGlobalToken(data.token); setUser(data.user); history.replaceState({}, '', location.pathname);
    setNotice('Conta ativada. Selecione a oficina para continuar.');
  };

  const verifyInvite = async event => {
    event.preventDefault(); const code = String(new FormData(event.currentTarget).get('code') || '').trim();
    try {
      const found = await api('/api/identity/invites/verify', { method: 'POST', body: JSON.stringify({ token: inviteToken, code }) });
      setInvitePreview({ ...found, code });
    } catch (problem) {
      if (problem.status === 409 && /Já tenho conta/.test(problem.message)) { setInviteLogin(true); }
      throw problem;
    }
  };

  const acceptInvite = async event => {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    await api('/api/identity/invites/accept', { token: globalToken, method: 'POST', body: JSON.stringify({
      token: inviteToken, code: form.get('code'),
    }) });
    history.replaceState({}, '', location.pathname);
    setOffices(await api('/api/identity/tenants', { token: globalToken }));
    setNotice('Convite aceito. A oficina foi adicionada à sua conta.');
  };

  const loadOrder = async id => act(async () => {
    setEstimateItems([{ kind: 'service', description: '', quantity: '1', unitPrice: '' }]);
    setSelected(await api(`/api/orders/orders/${id}`, { token })); setPage('detail');
  });
  const newOrder = async event => {
    event.preventDefault(); const formElement = event.currentTarget; const form = new FormData(formElement);
    await api('/api/orders/orders', { token, method: 'POST', body: JSON.stringify({
      customerId: form.get('customerId'), vehicleId: form.get('vehicleId'), problem: form.get('problem'),
    }) });
    formElement.reset(); setOrderCustomerId(''); await refresh(); setNotice('Ordem de serviço criada.');
  };
  const addMessage = async event => {
    event.preventDefault(); const formElement = event.currentTarget; const form = new FormData(formElement);
    await api(`/api/orders/orders/${selected.id}/messages`, { token, method: 'POST', body: JSON.stringify({ body: form.get('body') }) });
    formElement.reset(); setSelected(await api(`/api/orders/orders/${selected.id}`, { token })); setNotice('Mensagem enviada para a conversa desta ordem.');
  };
  const decide = async (decision, estimateId, reason = null) => act(async () => {
    await api(`/api/orders/orders/${selected.id}/decision`, { token, method: 'POST', body: JSON.stringify({ estimateId, decision, reason }) });
    setSelected(await api(`/api/orders/orders/${selected.id}`, { token })); await refresh();
    setRefusalEstimateId(''); setRefusalReason('');
    setNotice(decision === 'approved' ? 'Orçamento aprovado. A oficina já pode iniciar o serviço.' : 'Recusa registrada. Você pode conversar com a oficina antes de decidir novamente.');
  });
  const submitEstimate = async event => {
    event.preventDefault();
    const items = estimateItems.map(item => ({ ...item, description: item.description.trim(), quantity: Number(item.quantity), unitPrice: Number(item.unitPrice) }));
    if (!items.length || items.some(item => !item.description || !Number.isFinite(item.quantity) || item.quantity <= 0 || !Number.isFinite(item.unitPrice) || item.unitPrice < 0)) {
      setError('Preencha a descrição, a quantidade e o preço de cada item do orçamento.'); return;
    }
    await api(`/api/orders/orders/${selected.id}/estimates`, { token, method: 'POST', body: JSON.stringify({ items }) });
    setEstimateItems([{ kind: 'service', description: '', quantity: '1', unitPrice: '' }]);
    setSelected(await api(`/api/orders/orders/${selected.id}`, { token })); await refresh();
    setNotice('Orçamento enviado ao cliente para aprovação.');
  };
  const command = async (path, body = {}) => act(async () => {
    await api(`/api/orders/orders/${selected.id}/${path}`, { token, method: 'POST', body: JSON.stringify(body) });
    setSelected(await api(`/api/orders/orders/${selected.id}`, { token })); await refresh();
    setNotice(({ diagnosis: 'Diagnóstico salvo.', ready: 'Veículo marcado como pronto para retirada.', close: 'Ordem encerrada após a quitação.', 'close-refused': 'Ordem encerrada por recusa; o histórico foi preservado.', execute: 'Serviço executado registrado.' })[path] || 'Alteração salva.');
  });

  const filteredCustomers = useMemo(() => customers.filter(customer =>
    `${customer.name} ${customer.phone} ${customer.email || ''}`.toLowerCase().includes(customerSearch.toLowerCase())), [customers, customerSearch]);
  const openCount = orders.filter(order => !['closed', 'closed_refused'].includes(order.status)).length;
  const pendingCount = orders.filter(order => order.status === 'awaiting_approval').length;
  const readyCount = orders.filter(order => order.status === 'ready').length;

  if (inviteToken && !globalToken && !inviteLogin) return <main className="auth-screen single"><section className="auth-card"><Brand/><p className="eyebrow">ATIVAÇÃO SEGURA</p><h1>Ative sua conta</h1>{!invitePreview ? <><p className="muted">Digite o código enviado ao telefone convidado. Depois de confirmado, você verá os dados que a oficina cadastrou.</p><form onSubmit={event => act(() => verifyInvite(event))}><label>Código recebido<input name="code" inputMode="numeric" autoComplete="one-time-code" maxLength="6" required/></label><button className="primary" disabled={busy}>{busy ? 'Confirmando…' : 'Confirmar código'}</button></form></> : <><p className="muted">Código confirmado. Estes são os dados que a oficina cadastrou; se algo estiver errado, peça para a oficina corrigir antes de ativar.</p><form onSubmit={event => act(() => activateInvite(event))}><label>Nome<input value={invitePreview.name} readOnly/></label>{invitePreview.email ? <label>E-mail<input value={invitePreview.email} readOnly/></label> : <label>E-mail <small>A oficina não cadastrou um e-mail; informe o seu</small><input name="email" type="email" required/></label>}<label>Crie sua senha <small>Mínimo de 12 caracteres</small><input name="password" type="password" minLength="12" autoComplete="new-password" required/></label><button className="primary" disabled={busy}>{busy ? 'Ativando…' : 'Ativar conta'}</button></form></>}<button className="secondary full-width" onClick={() => { setError(''); setInviteLogin(true); }}>Já tenho conta GarageOps: entrar</button><Feedback error={error}/></section></main>;
  if (inviteToken && globalToken && !token) return <main className="auth-screen single"><section className="auth-card"><Brand/><p className="eyebrow">NOVO VÍNCULO DE OFICINA</p><h1>Confirmar convite</h1><p className="muted">Digite o código enviado ao telefone registrado para adicionar esta oficina à sua conta.</p><form onSubmit={event => act(() => acceptInvite(event))}><label>Código recebido<input name="code" inputMode="numeric" required/></label><button className="primary">Confirmar convite</button></form><Feedback error={error}/></section></main>;
  if (!globalToken) return (
    <main className="auth-screen">
      <section className="auth-showcase">
        <div className="showcase-brand"><Brand/><span><b>GARAGEOPS</b><small>GESTÃO DE OFICINAS</small></span></div>
        <div className="showcase-copy">
          <span className="showcase-kicker"><i/> CENTRAL DE OPERAÇÕES</span>
          <h2>Do diagnóstico à entrega, cada etapa no lugar certo.</h2>
          <p>Ordens de serviço, aprovações e conversas organizadas em um espaço seguro para cada oficina.</p>
        </div>
        <div className="showcase-highlights">
          <span><b>01</b><small>Recepção e cadastro</small></span>
          <span><b>02</b><small>Diagnóstico e orçamento</small></span>
          <span><b>03</b><small>Execução e entrega</small></span>
        </div>
        <div className="showcase-wheel" aria-hidden="true"><i/><b>G</b></div>
        <div className="showcase-foot"><span/> AMBIENTE DEMONSTRATIVO · DADOS FICTÍCIOS</div>
      </section>
      <section className="auth-card">
        <Brand/>
        <p className="eyebrow">ACESSO AO GARAGEOPS</p>
        <h1>Bem-vindo de volta</h1>
        <p className="muted">Escolha um perfil para conhecer a experiência de cada pessoa no sistema.</p>
        <label className="demo-picker">Perfil de demonstração
          <select value={demoEmail} onChange={event => setDemoEmail(event.target.value)}>
            <option value="">Selecione um perfil</option>
            {demoAccounts.map(group => <optgroup label={group.group} key={group.group}>
              {group.accounts.map(account => <option key={account.email} value={account.email}>{account.label}</option>)}
            </optgroup>)}
          </select>
        </label>
        <form onSubmit={event => act(() => login(event))}>
          <label>E-mail<input name="email" type="email" required placeholder="seu.email@exemplo.com" value={demoEmail} onChange={event => setDemoEmail(event.target.value)}/></label>
          <label>Senha<input name="password" type="password" required defaultValue="GarageOps2026!"/></label>
          <button className="primary" disabled={busy}>{busy ? 'Entrando…' : 'Entrar no sistema'} <span>→</span></button>
        </form>
        <small className="auth-footnote">As contas de demonstração usam a senha descrita no README.</small>
        <Feedback error={error}/>
      </section>
    </main>
  );

  if (platform) return <PlatformConsole token={globalToken} user={user} onSignout={signout}/>;

  if (!token) return <main className="office-screen"><header className="office-top"><div className="brand-lockup"><Brand/><div><b>OficinaPro</b><small>Plataforma de gestão GarageOps</small></div></div><button className="secondary" onClick={signout}>Sair</button></header><section className="office-intro"><p className="eyebrow">SEU ESPAÇO DE TRABALHO</p><h1>Olá, {user?.name?.split(' ')[0] || 'bem-vindo'}.</h1><p>Escolha uma oficina para acessar os atendimentos e dados autorizados à sua conta.</p></section><div className="office-grid">{offices.map(item => <button className="office-card" key={item.id} onClick={() => act(() => chooseOffice(item))}><span className="office-mark" style={{ '--brand': item.brand_color }}><i/></span><span className="office-card-content"><b>{item.name}</b><small>{(item.roles || []).map(roleLabel).join(' · ')}</small></span><span className="office-arrow">→</span></button>)}</div>{!offices.length&&<div className="empty-state"><b>Nenhuma oficina vinculada ainda</b><p>Peça ao administrador da oficina para enviar um convite de acesso ao seu telefone cadastrado.</p></div>}<Feedback error={error}/></main>;

  const navItems = [
    { id: 'home', label: customerRole ? 'Atendimentos' : mechanicRole ? 'Fila de serviços' : financeRole ? 'Ordens e pagamentos' : 'Visão geral', icon: '▦' },
    ...(staff ? [{ id: 'clients', label: 'Clientes', icon: '♙' }, { id: 'vehicles', label: 'Veículos', icon: '▰' }] : customerRole ? [{ id: 'vehicles', label: 'Meus veículos', icon: '▰' }] : mechanicRole ? [{ id: 'vehicles', label: 'Veículos da oficina', icon: '▰' }] : []),
    ...(owner ? [{ id: 'invites', label: 'Acessos', icon: '✉' }] : []),
  ];

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="sidebar-brand"><Brand/><div><b>OficinaPro</b><small>GARAGEOPS</small></div></div>
      <button className="sidebar-office" onClick={() => clearOffice()}><span className="office-dot" style={{ background: office?.brand_color }}/><span><b>{office?.name}</b><small>Oficina ativa</small></span><span className="switch-icon">⌄</span></button>
      <div className="sidebar-label">MENU PRINCIPAL</div>
      <nav className="side-nav">{navItems.map(item => <button key={item.id} className={page === item.id ? 'selected' : ''} onClick={() => { setPage(item.id); setSelected(null); setError(''); }}><span className="nav-icon">{item.icon}</span>{item.label}{item.id === 'home' && pendingCount > 0 && <i className="nav-count">{pendingCount}</i>}</button>)}</nav>
      <div className="sidebar-bottom"><div className="account-mini"><span className="avatar">{user?.name?.slice(0, 1)?.toUpperCase() || 'G'}</span><span><b>{user?.name}</b><small>{(office?.roles || []).map(roleLabel).join(' · ')}</small></span></div><button className="logout-button" onClick={signout}>Sair da conta ↗</button></div>
    </aside>

    <main className="main-area">
      <header className="topbar"><div className="breadcrumb">GarageOps <span>/</span> {navItems.find(item => item.id === page)?.label || 'Detalhes da ordem'}</div><div className="topbar-right"><span className="secure-label"><i/> Ambiente demonstrativo</span><span className="avatar small-avatar">{user?.name?.slice(0, 1)?.toUpperCase() || 'G'}</span></div></header>
      <div className="page-content">
        <Feedback error={error} notice={notice} onDismiss={() => { setError(''); setNotice(''); }}/>

        {page === 'home' && <>
          <div className="page-heading"><div><p className="eyebrow">{customerRole ? 'PORTAL DO CLIENTE' : mechanicRole ? 'ÁREA TÉCNICA' : financeRole ? 'ÁREA FINANCEIRA' : 'PAINEL DA OFICINA'}</p><h1>{customerRole ? 'Seus atendimentos' : mechanicRole ? 'Fila de serviços' : financeRole ? 'Ordens e pagamentos' : 'Visão geral'}</h1><p>{customerRole ? 'Acompanhe o andamento dos serviços dos seus veículos.' : mechanicRole ? 'Consulte ordens, registre diagnósticos e converse com os clientes.' : financeRole ? 'Consulte ordens prontas e registre os pagamentos da oficina.' : 'Acompanhe a rotina e o andamento dos serviços da oficina.'}</p></div>{staff && <button className="primary" onClick={() => setPage('clients')}>＋ Novo cliente</button>}</div>
           <section className="stat-grid"><Stat label={customerRole ? 'Atendimentos' : financeRole ? 'Prontas para cobrança' : mechanicRole ? 'Ordens em aberto' : 'Ordens em aberto'} value={customerRole ? orders.length : financeRole ? readyCount : openCount} icon="▦" tone="teal"/><Stat label="Aguardando aprovação" value={pendingCount} icon="◷" tone="amber"/><Stat label={financeRole ? 'Em execução' : 'Prontas para retirada'} value={financeRole ? orders.filter(order => order.status === 'in_progress').length : readyCount} icon="✓" tone="green"/><Stat label={customerRole ? 'Veículos vinculados' : financeRole ? 'Concluídas' : 'Clientes cadastrados'} value={customerRole ? vehicles.length : financeRole ? orders.filter(order => order.status === 'closed').length : customers.length} icon={customerRole ? '▰' : financeRole ? '✓' : '♙'} tone="blue"/></section>
          {canOpenOrders && <section className="content-card order-create"><div className="section-title"><div><span className="section-icon">＋</span><div><h2>Abrir ordem de serviço</h2><p>Registre a solicitação inicial do cliente.</p></div></div></div>{(!customers.length || !vehicles.length) ? <div className="inline-empty">Cadastre primeiro um cliente e o veículo dele na aba <button className="inline-link" onClick={() => setPage('clients')}>Clientes</button> para abrir uma ordem.</div> : <form className="order-form" onSubmit={event => act(() => newOrder(event))}><label>Cliente<select name="customerId" required value={orderCustomerId} onChange={event => setOrderCustomerId(event.target.value)}><option value="" disabled>Selecione um cliente</option>{customers.map(customer => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</select></label><label>Veículo<select name="vehicleId" required defaultValue=""><option value="" disabled>Selecione o veículo</option>{vehicles.filter(vehicle => !orderCustomerId || vehicle.customer_id === orderCustomerId).map(vehicle => <option key={vehicle.id} value={vehicle.id}>{vehicle.plate} · {vehicle.make} {vehicle.model}</option>)}</select></label><label className="problem-field">Relato do cliente<input name="problem" required placeholder="Ex.: ruído ao frear, revisão preventiva..."/></label><button className="primary" disabled={busy}>Criar ordem <span>→</span></button></form>}</section>}
          <section className="content-card"><div className="section-title list-heading"><div><span className="section-icon">▦</span><div><h2>{customerRole ? 'Histórico de atendimentos' : 'Ordens de serviço'}</h2><p>{orders.length} registro(s) nesta oficina</p></div></div><select className="filter-select" value={orderFilter} onChange={event => setOrderFilter(event.target.value)}><option value="">Todos os status</option><option value="open">Abertas</option><option value="awaiting_approval">Aguardando aprovação</option><option value="in_progress">Em execução</option><option value="ready">Prontas</option></select></div><OrderList orders={orders.filter(order => !orderFilter || order.status === orderFilter)} onOpen={loadOrder}/></section>
        </>}

        {page === 'clients' && staff && <>
          <div className="page-heading"><div><p className="eyebrow">RELACIONAMENTO</p><h1>Clientes</h1><p>Cadastre pessoas e veículos atendidos por esta oficina.</p></div><span className="count-chip">{customers.length} cliente(s)</span></div>
          {canRegister&&<section className="content-card"><div className="section-title"><div><span className="section-icon">♙</span><div><h2>Novo cliente</h2><p>O cadastro fica vinculado somente à oficina ativa.</p></div></div></div><form className="form-grid three-fields" onSubmit={event => act(() => addCustomer(event))}><label>Nome completo<input name="name" required placeholder="Nome do cliente"/></label><label>Telefone<input name="phone" type="tel" required placeholder="(11) 99999-9999"/></label><label>E-mail <span className="optional">Opcional</span><input name="email" type="email" placeholder="cliente@email.com"/></label><fieldset className="address-fields"><legend>Endereço <span className="optional">Opcional · busca automática pelo CEP (ViaCEP)</span></legend><label>CEP<span className="cep-input"><input inputMode="numeric" maxLength="9" placeholder="00000-000" {...addressField('cep')} onBlur={lookupCep} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); lookupCep(); } }}/><button type="button" className="secondary" onClick={lookupCep} disabled={cepStatus.tone === 'loading'}>Buscar</button></span></label><label className="street-field">Rua<input maxLength="160" {...addressField('street')}/></label><label>Número<input maxLength="20" {...addressField('addressNumber')}/></label><label>Bairro<input maxLength="80" {...addressField('district')}/></label><label>Cidade<input maxLength="80" {...addressField('city')}/></label><label>UF<input maxLength="2" {...addressField('state')}/></label>{cepStatus.text && <p className={`cep-status ${cepStatus.tone}`} role="status">{cepStatus.text}</p>}</fieldset><div className="form-actions"><button className="primary" disabled={busy}>Cadastrar cliente <span>→</span></button></div></form></section>}
          <section className="content-card"><div className="section-title list-heading"><div><span className="section-icon">♙</span><div><h2>Clientes cadastrados</h2><p>Os dados e veículos ficam isolados por oficina.</p></div></div><input className="search-input" value={customerSearch} onChange={event => setCustomerSearch(event.target.value)} placeholder="Buscar cliente"/></div><div className="customer-list">{filteredCustomers.map(customer => <article className="customer-row" key={customer.id}><span className="customer-avatar">{customer.name.slice(0, 1).toUpperCase()}</span><div className="customer-main"><b>{customer.name}</b><small>{customer.phone}{customer.email ? ` · ${customer.email}` : ''}</small>{customer.city && <small className="customer-address">{[customer.street && `${customer.street}${customer.address_number ? `, ${customer.address_number}` : ''}`, customer.district, `${customer.city}/${customer.state || ''}`].filter(Boolean).join(' · ')}</small>}</div><span className="vehicle-count">{vehicles.filter(vehicle => vehicle.customer_id === customer.id).length} veículo(s)</span></article>)}{!filteredCustomers.length&&<Empty title={customers.length ? 'Nenhum cliente encontrado' : 'Ainda não há clientes'} detail={customers.length ? 'Tente buscar por outro nome, telefone ou e-mail.' : 'Use o formulário acima para cadastrar o primeiro cliente.'}/>}</div></section>
        </>}

        {page === 'vehicles' && <>
          <div className="page-heading"><div><p className="eyebrow">FROTA E HISTÓRICO</p><h1>{customerRole ? 'Meus veículos' : 'Veículos'}</h1><p>{customerRole ? 'Veículos e serviços associados à oficina selecionada.' : 'Veículos cadastrados para os clientes desta oficina.'}</p></div>{staff&&<span className="count-chip">{vehicles.length} veículo(s)</span>}</div>
          {canRegister && <section className="content-card"><div className="section-title"><div><span className="section-icon">▰</span><div><h2>Novo veículo</h2><p>Vincule o veículo a um cliente já cadastrado.</p></div></div></div>{!customers.length ? <div className="inline-empty">Cadastre um cliente antes de incluir um veículo. <button className="inline-link" onClick={() => setPage('clients')}>Ir para Clientes</button></div> : <form className="form-grid vehicle-form" onSubmit={event => act(() => addVehicle(event))}><label>Cliente<select name="customerId" required defaultValue=""><option value="" disabled>Selecione</option>{customers.map(customer => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</select></label><label>Placa<input name="plate" required placeholder="ABC1D23" maxLength="8"/></label><VehicleReference token={token} value={vehicleRef} onChange={setVehicleRef}/><div className="form-actions"><button className="primary" disabled={busy}>Cadastrar veículo <span>→</span></button></div></form>}</section>}
          <section className="vehicle-grid">{vehicles.map(vehicle => <article className="vehicle-card" key={vehicle.id}><div className="vehicle-top"><span className="vehicle-symbol">▰</span><span className="plate-chip">{vehicle.plate}</span></div><h2>{vehicle.make || 'Marca não informada'} {vehicle.model || ''}</h2><p>{vehicle.year || 'Ano não informado'}{vehicle.customer_name ? ` · ${vehicle.customer_name}` : ''}</p><div className="vehicle-history">{orders.filter(order => order.vehicle_id === vehicle.id).map(order => <button className="history-link" key={order.id} onClick={() => loadOrder(order.id)}><span>{order.problem}</span><span className={`status-pill ${order.status}`}>{statusLabels[order.status] || order.status}</span></button>)}{!orders.some(order => order.vehicle_id === vehicle.id)&&<small>Nenhuma ordem registrada para este veículo.</small>}</div></article>)}{!vehicles.length&&<Empty title="Nenhum veículo cadastrado" detail="Os veículos aparecerão aqui após serem vinculados a um cliente."/>}</section>
        </>}

        {page === 'invites' && owner && <><div className="page-heading"><div><p className="eyebrow">ACESSO AO PORTAL</p><h1>Convidar cliente</h1><p>O convite associa o cliente à oficina sem expor dados pelo link.</p></div></div><section className="content-card invite-card"><div className="invite-explainer"><span className="section-icon">✉</span><div><h2>Convite de acesso</h2><p>Enviaremos um link de uso único ao telefone registrado no cadastro do cliente.</p></div></div>{customers.length ? <form className="form-grid two-fields" onSubmit={event => act(() => makeInvite(event))}><label>Cliente cadastrado<select name="customerId" required defaultValue=""><option value="" disabled>Selecione o cliente</option>{customers.map(customer => <option key={customer.id} value={customer.id}>{customer.name} · {customer.phone}</option>)}</select></label><div className="form-actions"><button className="primary" disabled={busy}>Gerar convite <span>→</span></button></div></form> : <div className="inline-empty">Cadastre o cliente antes de gerar o convite. <button className="inline-link" onClick={() => setPage('clients')}>Ir para Clientes</button></div>}{inviteData&&<div className="invite-result"><b>Convite pronto para compartilhar</b><p>Validade: {new Date(inviteData.expiresAt).toLocaleString('pt-BR')}</p><label>Link de ativação<input readOnly value={`${location.origin}${inviteData.activationUrl}`}/></label><p className="invite-code">Código de demonstração: <b>{inviteData.devCode || 'enviado pelo canal configurado'}</b></p></div>}</section></>}

        {page === 'detail' && selected && <><button className="back-link" onClick={() => setPage('home')}>← Voltar para as ordens</button><div className="page-heading detail-title"><div><p className="eyebrow">ORDEM DE SERVIÇO · {selected.id.slice(0, 8).toUpperCase()}</p><h1>{selected.problem}</h1><p>Aberta em {new Date(selected.opened_at).toLocaleDateString('pt-BR')}</p></div><span className={`status-pill ${selected.status}`}>{statusLabels[selected.status] || selected.status}</span></div><div className="detail-columns"><section className="content-card"><div className="section-title"><div><span className="section-icon">⚙</span><div><h2>Diagnóstico e orçamento</h2><p>O serviço só pode começar após a aprovação do orçamento.</p></div></div></div><div className="diagnosis-block"><b>Diagnóstico</b><p>{selected.diagnosis || 'Ainda não registrado.'}</p>{canDiagnose&&<form onSubmit={event => { event.preventDefault(); const data = new FormData(event.currentTarget); command('diagnosis', { diagnosis: data.get('diagnosis') }); }}><textarea name="diagnosis" placeholder="Descreva o diagnóstico técnico" defaultValue={selected.diagnosis || ''} required/><button className="secondary" disabled={busy}>{busy ? 'Salvando…' : 'Salvar diagnóstico'}</button></form>}</div>{selected.estimates?.map(estimate => <article className="estimate-card" key={estimate.id}><div className="estimate-title"><div><b>Orçamento · versão {estimate.version}</b><small>{new Date(estimate.created_at).toLocaleString('pt-BR')}</small></div><span className={`status-pill ${estimate.status}`}>{estimate.status === 'pending' ? 'Aguardando' : estimate.status === 'approved' ? 'Aprovado' : estimate.status === 'refused' ? 'Recusado' : 'Substituído'}</span></div>{estimate.items?.map(item => <div className="estimate-line" key={item.id}><span>{item.description}<small>{item.kind === 'part' ? 'Peça informada manualmente' : 'Serviço'} · {item.quantity} × {currency(item.unit_price)}</small></span><b>{currency(Number(item.quantity) * Number(item.unit_price))}</b></div>)}<div className="estimate-total"><span>Total</span><b>{currency(estimate.total)}</b></div>{customerRole&&estimate.status === 'pending'&&<div className="decision-actions"><button className="primary" disabled={busy} onClick={() => decide('approved', estimate.id)}>Aprovar orçamento</button><button className="danger-button" disabled={busy} onClick={() => { setRefusalEstimateId(estimate.id); setRefusalReason(''); }}>Recusar e conversar</button></div>}{refusalEstimateId===estimate.id&&<form className="decision-form" onSubmit={event=>{event.preventDefault();decide('refused',estimate.id,refusalReason);}}><label>Motivo da recusa <span className="optional">Opcional</span><textarea value={refusalReason} maxLength="1000" placeholder="Explique o que precisa ser revisto ou deixe em branco para conversar depois." onChange={event=>setRefusalReason(event.target.value)}/></label><div className="decision-actions"><button type="button" className="secondary" onClick={()=>setRefusalEstimateId('')}>Voltar</button><button type="submit" className="danger-button" disabled={busy}>{busy?'Registrando…':'Confirmar recusa'}</button></div></form>}</article>)}{canCreateEstimate&&!['closed_refused', 'closed', 'ready'].includes(selected.status)&&<form className="estimate-form" onSubmit={event => act(() => submitEstimate(event))}><h3>Preparar orçamento</h3><p>Inclua cada serviço ou peça manualmente. O cliente poderá aprovar ou recusar esta versão.</p><div className="estimate-item-list">{estimateItems.map((item,index)=><div className="estimate-item-row" key={index}><label>Tipo<select value={item.kind} onChange={event => setEstimateItems(current => current.map((row,i)=>i===index?{...row,kind:event.target.value}:row))}><option value="service">Serviço</option><option value="part">Peça</option></select></label><label>Descrição<input value={item.description} maxLength="240" placeholder={item.kind==='part'?'Ex.: pastilha de freio':'Ex.: mão de obra'} onChange={event => setEstimateItems(current => current.map((row,i)=>i===index?{...row,description:event.target.value}:row))} required/></label><label>Quantidade<input type="number" min="0.01" step="0.01" value={item.quantity} onChange={event => setEstimateItems(current => current.map((row,i)=>i===index?{...row,quantity:event.target.value}:row))} required/></label><label>Preço unitário<input type="number" min="0" step="0.01" value={item.unitPrice} onChange={event => setEstimateItems(current => current.map((row,i)=>i===index?{...row,unitPrice:event.target.value}:row))} required/></label><button type="button" className="remove-estimate-item" disabled={estimateItems.length===1} onClick={()=>setEstimateItems(current=>current.filter((_,i)=>i!==index))} aria-label="Remover item">Remover</button></div>)}</div><div className="estimate-form-actions"><button type="button" className="secondary" disabled={estimateItems.length>=30} onClick={()=>setEstimateItems(current=>[...current,{kind:'service',description:'',quantity:'1',unitPrice:''}])}>＋ Adicionar item</button><span>Total estimado <b>{currency(estimateItems.reduce((sum,item)=>sum+(Number(item.quantity)||0)*(Number(item.unitPrice)||0),0))}</b></span></div><button className="primary" disabled={busy}>{busy ? 'Enviando orçamento…' : 'Enviar para aprovação'}</button></form>}{canDiagnose&&selected.status === 'approved'&&<div className="workflow-action"><b>Orçamento aprovado</b><p>Registre os serviços conforme forem realizados.</p><form onSubmit={event => { event.preventDefault(); const data = new FormData(event.currentTarget); command('execute', { estimateItemId: data.get('estimateItemId') }); }}><select name="estimateItemId" required defaultValue=""><option value="" disabled>Selecione serviço autorizado</option>{(selected.estimates?.find(estimate => estimate.status === 'approved')?.items || []).filter(item => item.kind === 'service').map(item => <option key={item.id} value={item.id}>{item.description}</option>)}</select><button className="primary" disabled={busy}>Registrar serviço executado</button></form></div>}{canDiagnose&&selected.status === 'in_progress'&&<button className="primary workflow-button" disabled={busy} onClick={() => command('ready')}>Marcar veículo como pronto</button>}{canFinance&&selected.status === 'ready'&&outstandingAmount <= 0.01&&<button className="primary workflow-button" disabled={busy} onClick={() => command('close')}>Encerrar ordem quitada</button>}{canFinance&&selected.status === 'ready'&&outstandingAmount > 0.01&&<div className="workflow-action payment-summary"><b>O encerramento depende da quitação.</b><p>Saldo restante: <strong>{currency(outstandingAmount)}</strong>. Registre o pagamento no painel ao lado.</p></div>}</section><aside className="content-card conversation-card"><div className="section-title"><div><span className="section-icon">☷</span><div><h2>Conversa</h2><p>Mensagens registradas nesta ordem.</p></div></div></div><div className="message-list">{selected.messages?.map(message => <article className={`message ${message.sender_type === 'customer' ? 'from-customer' : ''}`} key={message.id}><b>{message.sender_name}</b><time>{new Date(message.created_at).toLocaleString('pt-BR')}</time><p>{message.body}</p></article>)}{!selected.messages?.length&&<p className="empty-note">Ainda não há mensagens.</p>}</div>{canMessage&&!String(selected.status).startsWith('closed')&&<form className="message-form" onSubmit={event => act(() => addMessage(event))}><textarea name="body" placeholder="Escreva uma mensagem..." maxLength="4000" required/><button className="primary" disabled={busy}>{busy ? 'Enviando…' : 'Enviar mensagem'}</button></form>}{canCloseRefusal&&selected.estimates?.[0]?.status === 'refused'&&(!closingRefusal?<button className="danger-button full-width" disabled={busy} onClick={()=>{setClosingRefusal(true);setCloseRefusalReason('');}}>Encerrar por recusa definitiva</button>:<form className="decision-form" onSubmit={event=>{event.preventDefault();command('close-refused',{reason:closeRefusalReason});setClosingRefusal(false);}}><label>Observação do encerramento <span className="optional">Opcional</span><textarea value={closeRefusalReason} maxLength="1000" placeholder="Registre uma observação para o histórico." onChange={event=>setCloseRefusalReason(event.target.value)}/></label><div className="decision-actions"><button type="button" className="secondary" onClick={()=>setClosingRefusal(false)}>Voltar</button><button type="submit" className="danger-button" disabled={busy}>{busy?'Encerrando…':'Confirmar encerramento'}</button></div></form>)}{canFinance&&selected.status === 'ready'&&<div className="payment-summary"><b>Resumo de pagamento</b><p>Total aprovado: {currency(approvedEstimate?.total)}</p><p>Já recebido: {currency(paidAmount)}</p><p>Saldo: <strong>{currency(outstandingAmount)}</strong></p>{(selected.payments || []).map(payment => <small className="payment-entry" key={payment.created_at}>{currency(payment.amount)} · {payment.method} · {new Date(payment.created_at).toLocaleDateString('pt-BR')}</small>)}</div>}{canFinance&&selected.status === 'ready'&&outstandingAmount > 0.01&&<form className="payment-form" onSubmit={event => { event.preventDefault(); const data = new FormData(event.currentTarget); command('payments', { amount: Number(data.get('amount')), method: data.get('method') }); }}><h3>Registrar pagamento</h3><input name="amount" type="number" min="0.01" step="0.01" max={outstandingAmount.toFixed(2)} placeholder="Valor recebido" required/><input name="method" placeholder="Forma (ex.: Pix)" required/><button className="secondary" disabled={busy}>Adicionar pagamento</button></form>}</aside></div></>}
      </div><footer className="app-footer">GarageOps · ambiente demonstrativo · dados fictícios</footer>
    </main>
  </div>;
}

// Console técnico do administrador da plataforma GarageOps.
// Mostra apenas o cadastro de cada oficina (tenant) e contagens agregadas de contas.
// Não há navegação para clientes, veículos, ordens ou pagamentos: a API também recusa.
// Marca, modelo e ano do veículo pela tabela FIPE (integração externa), com modo manual.
const emptyVehicleRef = { mode: 'fipe', brandCode: '', brand: '', modelCode: '', model: '', yearCode: '', year: '', fipeCode: '', price: '', reference: '' };

function VehicleReference({ token, value, onChange }) {
  const [brands, setBrands] = useState([]);
  const [models, setModels] = useState([]);
  const [years, setYears] = useState([]);
  const [status, setStatus] = useState({ tone: '', text: '' });
  const set = patch => onChange(current => ({ ...current, ...patch }));
  const fail = problem => {
    if (problem.status === 503) { set({ mode: 'manual' }); setStatus({ tone: 'error', text: `${problem.message}` }); }
    else setStatus({ tone: 'error', text: problem.message });
  };

  useEffect(() => {
    if (value.mode !== 'fipe' || brands.length) return;
    setStatus({ tone: 'loading', text: 'Carregando marcas da tabela FIPE…' });
    api('/api/customers/fipe/brands', { token })
      .then(list => { setBrands(list); setStatus({ tone: '', text: '' }); })
      .catch(fail);
  }, [value.mode]);

  // Limpa as listas quando o formulário é reiniciado após salvar.
  useEffect(() => { if (!value.brand) { setModels([]); setYears([]); } }, [value.brand]);

  const chooseBrand = name => {
    const found = brands.find(item => item.name.toLowerCase() === name.trim().toLowerCase());
    set({ brand: name, brandCode: found?.code || '', modelCode: '', model: '', yearCode: '', year: '', fipeCode: '', price: '' });
    setModels([]); setYears([]);
    if (!found) return;
    setStatus({ tone: 'loading', text: `Carregando modelos ${found.name}…` });
    api(`/api/customers/fipe/brands/${found.code}/models`, { token })
      .then(list => { setModels(list); setStatus({ tone: '', text: '' }); }).catch(fail);
  };
  const chooseModel = name => {
    const found = models.find(item => item.name.toLowerCase() === name.trim().toLowerCase());
    set({ model: name, modelCode: found?.code || '', yearCode: '', year: '', fipeCode: '', price: '' });
    setYears([]);
    if (!found) return;
    setStatus({ tone: 'loading', text: 'Carregando anos disponíveis…' });
    api(`/api/customers/fipe/brands/${value.brandCode}/models/${found.code}/years`, { token })
      .then(list => { setYears(list); setStatus({ tone: '', text: '' }); }).catch(fail);
  };
  const chooseYear = code => {
    set({ yearCode: code, year: '', fipeCode: '', price: '' });
    if (!code) return;
    setStatus({ tone: 'loading', text: 'Consultando a tabela FIPE…' });
    api(`/api/customers/fipe/brands/${value.brandCode}/models/${value.modelCode}/years/${code}`, { token })
      .then(found => { set({ year: String(found.year), fipeCode: found.fipeCode, price: found.price, reference: found.reference, brand: found.brand, model: found.model }); setStatus({ tone: 'ok', text: `Código FIPE ${found.fipeCode} · ${found.fuel} · valor de referência ${found.price} (${found.reference.trim()})` }); })
      .catch(fail);
  };

  if (value.mode === 'manual') return <fieldset className="vehicle-ref">
    <legend>Marca, modelo e ano <span className="optional">Preenchimento manual</span></legend>
    <label>Marca<input maxLength="60" placeholder="Ex.: Honda" value={value.brand} onChange={event => set({ brand: event.target.value })}/></label>
    <label>Modelo<input maxLength="120" placeholder="Ex.: Civic EXL 2.0" value={value.model} onChange={event => set({ model: event.target.value })}/></label>
    <label>Ano<input type="number" min="1950" max="2099" placeholder="2022" value={value.year} onChange={event => set({ year: event.target.value })}/></label>
    {status.text && <p className={`cep-status ${status.tone}`} role="status">{status.text}</p>}
    <button type="button" className="inline-link" onClick={() => { setStatus({ tone: '', text: '' }); onChange({ ...emptyVehicleRef }); }}>Usar a tabela FIPE</button>
  </fieldset>;

  return <fieldset className="vehicle-ref">
    <legend>Marca, modelo e ano <span className="optional">Tabela FIPE · digite para buscar</span></legend>
    <label>Marca<input list="fipe-brands" placeholder="Digite a marca" value={value.brand} onChange={event => chooseBrand(event.target.value)}/><datalist id="fipe-brands">{brands.map(item => <option key={item.code} value={item.name}/>)}</datalist></label>
    <label>Modelo<input list="fipe-models" placeholder={value.brandCode ? 'Digite o modelo' : 'Escolha a marca primeiro'} disabled={!value.brandCode} value={value.model} onChange={event => chooseModel(event.target.value)}/><datalist id="fipe-models">{models.map(item => <option key={item.code} value={item.name}/>)}</datalist></label>
    <label>Ano<select disabled={!years.length} value={value.yearCode} onChange={event => chooseYear(event.target.value)}><option value="">{years.length ? 'Selecione o ano' : 'Escolha o modelo'}</option>{years.map(item => <option key={item.code} value={item.code}>{item.name}</option>)}</select></label>
    {status.text && <p className={`cep-status ${status.tone}`} role="status">{status.text}</p>}
    <button type="button" className="inline-link" onClick={() => { setStatus({ tone: '', text: '' }); onChange({ ...emptyVehicleRef, mode: 'manual', brand: value.brand, model: value.model }); }}>Não encontrei o veículo: digitar manualmente</button>
  </fieldset>;
}

const emptyAddress = { cep: '', street: '', addressNumber: '', district: '', city: '', state: '' };
const brandPalette = ['#0f766e', '#2563eb', '#d97706', '#7c3aed', '#be123c', '#0891b2', '#4d7c0f', '#334155'];
const emptyTenantForm = { name: '', slug: '', brandColor: brandPalette[0], ownerName: '', ownerEmail: '', ownerPhone: '', ownerPassword: '' };

function PlatformConsole({ token, user, onSignout }) {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(emptyTenantForm);
  const [editingId, setEditingId] = useState('');
  const [editForm, setEditForm] = useState({});
  const [deletingId, setDeletingId] = useState('');
  const [confirmSlug, setConfirmSlug] = useState('');
  const [search, setSearch] = useState('');

  const run = async (fn, success) => {
    setError(''); setNotice(''); setBusy(true);
    try { await fn(); if (success) setNotice(success); }
    catch (problem) { if (problem.status === 401) onSignout(); else setError(problem.message); }
    finally { setBusy(false); }
  };
  const load = () => api('/api/identity/platform/tenants', { token }).then(setTenants);

  useEffect(() => { run(load).finally(() => setLoading(false)); }, []);

  const createTenant = event => { event.preventDefault(); run(async () => {
    const created = await api('/api/identity/platform/tenants', { token, method: 'POST', body: JSON.stringify(form) });
    await load(); setForm(emptyTenantForm); setCreating(false);
    setNotice(created.ownerAccount === 'existing'
      ? `Oficina ${created.name} cadastrada. A conta GarageOps existente recebeu o papel de administrador.`
      : `Oficina ${created.name} cadastrada com o administrador ${form.ownerEmail}.`);
  }); };

  const startEdit = tenant => { setDeletingId(''); setEditingId(tenant.id); setEditForm({ name: tenant.name, slug: tenant.slug, brandColor: tenant.brand_color }); };
  const saveEdit = event => { event.preventDefault(); run(async () => {
    await api(`/api/identity/platform/tenants/${editingId}`, { token, method: 'PATCH', body: JSON.stringify(editForm) });
    await load(); setEditingId('');
  }, 'Cadastro da oficina atualizado.'); };
  const toggleStatus = tenant => run(async () => {
    await api(`/api/identity/platform/tenants/${tenant.id}`, { token, method: 'PATCH', body: JSON.stringify({ status: tenant.status === 'active' ? 'suspended' : 'active' }) });
    await load();
  }, tenant.status === 'active' ? `${tenant.name} suspensa: a equipe e os clientes não conseguem mais abri-la.` : `${tenant.name} reativada.`);
  const removeTenant = (event, tenant) => { event.preventDefault(); run(async () => {
    await api(`/api/identity/platform/tenants/${tenant.id}`, { token, method: 'DELETE', body: JSON.stringify({ confirmSlug }) });
    await load(); setDeletingId(''); setConfirmSlug('');
  }, `${tenant.name} excluída junto com todos os dados dela.`); };

  const field = (key, setter = setForm) => ({ value: (setter === setForm ? form : editForm)[key] || '', onChange: event => setter(current => ({ ...current, [key]: event.target.value })) });
  const visible = tenants.filter(tenant => `${tenant.name} ${tenant.slug}`.toLowerCase().includes(search.toLowerCase()));
  const activeCount = tenants.filter(tenant => tenant.status === 'active').length;
  const teamTotal = tenants.reduce((sum, tenant) => sum + tenant.team_accounts, 0);
  const customerTotal = tenants.reduce((sum, tenant) => sum + tenant.customer_accounts, 0);

  return <div className="app-shell platform-shell">
    <aside className="sidebar">
      <div className="sidebar-brand"><Brand/><div><b>GarageOps</b><small>PLATAFORMA</small></div></div>
      <div className="sidebar-label">CONSOLE TÉCNICO</div>
      <nav className="side-nav"><button className="selected"><span className="nav-icon">▦</span>Oficinas</button></nav>
      <div className="platform-privacy"><b>Sigilo das oficinas</b><p>Este console não acessa clientes, veículos, ordens, orçamentos, conversas nem pagamentos. A API recusa esses pedidos para esta conta.</p></div>
      <div className="sidebar-bottom"><div className="account-mini"><span className="avatar">{user?.name?.slice(0, 1)?.toUpperCase() || 'P'}</span><span><b>{user?.name}</b><small>Administrador da plataforma</small></span></div><button className="logout-button" onClick={onSignout}>Sair da conta ↗</button></div>
    </aside>
    <main className="main-area">
      <header className="topbar"><div className="breadcrumb">GarageOps <span>/</span> Plataforma <span>/</span> Oficinas</div><div className="topbar-right"><span className="secure-label"><i/> Ambiente demonstrativo</span><span className="avatar small-avatar">{user?.name?.slice(0, 1)?.toUpperCase() || 'P'}</span></div></header>
      <div className="page-content">
        <Feedback error={error} notice={notice} onDismiss={() => { setError(''); setNotice(''); }}/>
        <div className="page-heading"><div><p className="eyebrow">PLATAFORMA GARAGEOPS</p><h1>Oficinas da plataforma</h1><p>Cadastre, edite, suspenda ou exclua oficinas. Os dados operacionais de cada uma ficam fora do seu alcance.</p></div><button className="primary" onClick={() => { setCreating(open => !open); setEditingId(''); setDeletingId(''); }}>{creating ? 'Fechar cadastro' : '＋ Nova oficina'}</button></div>
        <section className="stat-grid"><Stat label="Oficinas cadastradas" value={tenants.length} icon="▦" tone="teal"/><Stat label="Ativas" value={activeCount} icon="✓" tone="green"/><Stat label="Contas de equipe" value={teamTotal} icon="♙" tone="blue"/><Stat label="Contas de cliente" value={customerTotal} icon="◷" tone="amber"/></section>

        {creating && <section className="content-card"><div className="section-title"><div><span className="section-icon">＋</span><div><h2>Cadastrar oficina</h2><p>Cria o tenant e o vínculo de administrador. Se o e-mail já tiver conta GarageOps, a conta existente é reaproveitada.</p></div></div></div>
          <form className="platform-form" onSubmit={createTenant}>
            <fieldset><legend>Oficina</legend>
              <label>Nome da oficina<input required maxLength="80" placeholder="Ex.: Auto Mecânica Silva" {...field('name')}/></label>
              <label>Identificador <span className="optional">Gerado pelo nome se vazio</span><input maxLength="60" pattern="[A-Za-z0-9-]*" placeholder="auto-mecanica-silva" {...field('slug')}/></label>
              <ColorPicker value={form.brandColor} onChange={brandColor => setForm(current => ({ ...current, brandColor }))}/>
            </fieldset>
            <fieldset><legend>Administrador da oficina</legend>
              <label>Nome<input required maxLength="80" {...field('ownerName')}/></label>
              <label>E-mail<input required type="email" {...field('ownerEmail')}/></label>
              <label>Telefone<input required type="tel" placeholder="+5511999999999" {...field('ownerPhone')}/></label>
              <label>Senha inicial <span className="optional">Mín. 12 caracteres · só para conta nova</span><input type="password" minLength="12" autoComplete="new-password" {...field('ownerPassword')}/></label>
            </fieldset>
            <div className="form-actions"><button type="button" className="secondary" onClick={() => { setCreating(false); setForm(emptyTenantForm); }}>Cancelar</button><button className="primary" disabled={busy}>{busy ? 'Cadastrando…' : 'Cadastrar oficina'} <span>→</span></button></div>
          </form>
        </section>}

        <section className="content-card">
          <div className="section-title list-heading"><div><span className="section-icon">▦</span><div><h2>Oficinas</h2><p>{tenants.length} tenant(s) · somente dados cadastrais e contagens</p></div></div><input className="search-input" value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar oficina"/></div>
          <div className="tenant-list">
            {visible.map(tenant => <article className={`tenant-row ${tenant.status}`} key={tenant.id}>
              <div className="tenant-main">
                <span className="office-mark" style={{ '--brand': tenant.brand_color }}><i/></span>
                <div><b>{tenant.name}</b><small>{tenant.slug} · ID {tenant.id.slice(-8).toUpperCase()} · desde {new Date(tenant.created_at).toLocaleDateString('pt-BR')}</small></div>
                <span className="tenant-counts"><span><b>{tenant.team_accounts}</b> equipe</span><span><b>{tenant.customer_accounts}</b> clientes</span></span>
                <span className={`status-pill ${tenant.status === 'active' ? 'approved' : 'refused'}`}>{tenant.status === 'active' ? 'Ativa' : 'Suspensa'}</span>
                <span className="tenant-actions">
                  <button className="secondary" onClick={() => editingId === tenant.id ? setEditingId('') : startEdit(tenant)}>Editar</button>
                  <button className="secondary" disabled={busy} onClick={() => toggleStatus(tenant)}>{tenant.status === 'active' ? 'Suspender' : 'Reativar'}</button>
                  <button className="danger-button" onClick={() => { setEditingId(''); setConfirmSlug(''); setDeletingId(deletingId === tenant.id ? '' : tenant.id); }}>Excluir</button>
                </span>
              </div>
              {editingId === tenant.id && <form className="tenant-panel" onSubmit={saveEdit}>
                <label>Nome da oficina<input required maxLength="80" {...field('name', setEditForm)}/></label>
                <label>Identificador<input required maxLength="60" pattern="[A-Za-z0-9-]+" {...field('slug', setEditForm)}/></label>
                <ColorPicker value={editForm.brandColor} onChange={brandColor => setEditForm(current => ({ ...current, brandColor }))}/>
                <div className="form-actions"><button type="button" className="secondary" onClick={() => setEditingId('')}>Cancelar</button><button className="primary" disabled={busy}>{busy ? 'Salvando…' : 'Salvar alterações'}</button></div>
              </form>}
              {deletingId === tenant.id && <form className="tenant-panel danger-zone" onSubmit={event => removeTenant(event, tenant)}>
                <p><b>Excluir {tenant.name} definitivamente?</b> Os clientes, veículos, ordens, orçamentos, conversas, pagamentos, convites e vínculos dessa oficina serão apagados e não poderão ser recuperados. As contas GarageOps das pessoas continuam existindo. Se a ideia é só bloquear o acesso, use <i>Suspender</i>.</p>
                <label>Digite <code>{tenant.slug}</code> para confirmar<input value={confirmSlug} onChange={event => setConfirmSlug(event.target.value)} autoComplete="off"/></label>
                <div className="form-actions"><button type="button" className="secondary" onClick={() => setDeletingId('')}>Cancelar</button><button className="danger-button" disabled={busy || confirmSlug !== tenant.slug}>{busy ? 'Excluindo…' : 'Excluir oficina'}</button></div>
              </form>}
            </article>)}
            {!loading && !visible.length && <Empty title={tenants.length ? 'Nenhuma oficina encontrada' : 'Nenhuma oficina cadastrada'} detail={tenants.length ? 'Tente outro nome ou identificador.' : 'Use “Nova oficina” para cadastrar a primeira.'}/>}
          </div>
        </section>
      </div><footer className="app-footer">GarageOps · console da plataforma · sem acesso a dados operacionais das oficinas</footer>
    </main>
  </div>;
}

function ColorPicker({ value, onChange }) {
  return <div className="color-picker"><span>Cor de identificação</span><div>{brandPalette.map(color => <button type="button" key={color} className={value === color ? 'picked' : ''} style={{ background: color }} onClick={() => onChange(color)} aria-label={`Cor ${color}`}/>)}<input type="color" value={value || '#0f766e'} onChange={event => onChange(event.target.value)} aria-label="Outra cor"/></div></div>;
}

function Brand() { return <span className="brand-logo">G<span>+</span></span>; }
function Feedback({ error, notice, onDismiss }) { if (!error && !notice) return null; return <div className={`feedback ${error ? 'is-error' : 'is-success'}`} role="status"><span>{error || notice}</span>{onDismiss&&<button onClick={onDismiss} aria-label="Fechar aviso">×</button>}</div>; }
function Empty({ title, detail }) { return <div className="empty-state"><span>⌕</span><b>{title}</b><p>{detail}</p></div>; }
function Stat({ label, value, icon, tone }) { return <article className="stat-card"><span className={`stat-icon ${tone}`}>{icon}</span><div><small>{label}</small><b>{value}</b></div></article>; }
function OrderList({ orders, onOpen }) { return <div className="order-table">{orders.map(order => <button className="order-row" key={order.id} onClick={() => onOpen(order.id)}><span className="order-id">OS-{order.id.slice(0, 6).toUpperCase()}</span><span className="order-description"><b>{order.problem}</b><small>{new Date(order.opened_at).toLocaleDateString('pt-BR')}</small></span><span className={`status-pill ${order.status}`}>{statusLabels[order.status] || order.status}</span><span className="row-chevron">→</span></button>)}{!orders.length&&<Empty title="Nenhuma ordem encontrada" detail="As ordens desta oficina aparecerão aqui."/>}</div>; }
function currency(value) { return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }
function roleLabel(role) { return ({ owner: 'Administrador', attendant: 'Atendente', mechanic: 'Mecânico', finance: 'Financeiro', customer: 'Cliente' })[role] || role; }

createRoot(document.getElementById('root')).render(<App/>);
