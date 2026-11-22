// Verifica o console da plataforma: CRUD de oficinas e a negativa de acesso a dados operacionais.
import assert from 'node:assert/strict';
const root=process.env.APP_URL||'http://localhost:8080';
async function call(path,{token,method='GET',body,expect=200}={}){const r=await fetch(root+path,{method,headers:{'content-type':'application/json',...(token?{authorization:`Bearer ${token}`}:{})},...(body?{body:JSON.stringify(body)}:{})});const data=await r.json().catch(()=>({}));assert.equal(r.status,expect,`${method} ${path}: ${JSON.stringify(data)}`);return data;}
const login=email=>call('/api/identity/auth/login',{method:'POST',body:{email,password:'GarageOps2026!'}});
const platform=await login('plataforma@garageops.local');
assert.equal(platform.platform,true);assert.equal(platform.offices.length,0,'Plataforma não tem vínculo com oficinas');
const P=platform.token,tenantA='00000000-0000-4000-8000-000000000001';
// Negativas: a conta da plataforma não lê nem altera dados operacionais.
await call('/api/customers/customers',{token:P,expect:409});
await call('/api/customers/vehicles',{token:P,expect:409});
await call('/api/orders/orders',{token:P,expect:409});
await call('/api/orders/orders/10000000-0000-4000-8000-000000000003',{token:P,expect:409});
await call('/api/orders/history',{token:P,expect:409});
await call('/api/identity/auth/select-office',{token:P,method:'POST',body:{tenantId:tenantA},expect:403});
await call('/api/customers/internal/tenants/'+tenantA,{token:P,method:'DELETE',expect:404});
// Contas de oficina não acessam o console.
const admin1=await login('admin1@demo.garageops.local');
await call('/api/identity/platform/tenants',{token:admin1.token,expect:403});
// Listagem só com cadastro + contagens.
const list=await call('/api/identity/platform/tenants',{token:P});
assert.ok(list.length>=5);assert.deepEqual(Object.keys(list[0]).sort(),['brand_color','created_at','customer_accounts','id','name','slug','status','team_accounts']);
// Cadastrar, editar, suspender, reativar, excluir.
const slug='teste-plataforma-'+Date.now();
const t=await call('/api/identity/platform/tenants',{token:P,method:'POST',expect:201,body:{name:'Oficina Teste',slug,brandColor:'#2563eb',ownerName:'Dono Teste',ownerEmail:`${slug}@demo.local`,ownerPhone:'+5511970000000',ownerPassword:'SenhaInicial2026!'}});
const owner=await call('/api/identity/auth/login',{method:'POST',body:{email:`${slug}@demo.local`,password:'SenhaInicial2026!'}});
assert.equal(owner.offices.length,1);assert.deepEqual(owner.offices[0].roles,['owner']);
const ownerOffice=await call('/api/identity/auth/select-office',{token:owner.token,method:'POST',body:{tenantId:t.id}});
await call('/api/customers/customers',{token:ownerOffice.token,method:'POST',expect:201,body:{name:'Cliente da oficina teste',phone:'+5511970000001'}});
await call(`/api/identity/platform/tenants/${t.id}`,{token:P,method:'PATCH',body:{name:'Oficina Teste Editada'}});
await call(`/api/identity/platform/tenants/${t.id}`,{token:P,method:'PATCH',body:{status:'suspended'}});
assert.equal((await call('/api/identity/auth/login',{method:'POST',body:{email:`${slug}@demo.local`,password:'SenhaInicial2026!'}})).offices.length,0,'Oficina suspensa some da lista');
await call('/api/identity/auth/select-office',{token:owner.token,method:'POST',body:{tenantId:t.id},expect:403});
await call(`/api/identity/platform/tenants/${t.id}`,{token:P,method:'PATCH',body:{status:'active'}});
await call(`/api/identity/platform/tenants/${t.id}`,{token:P,method:'DELETE',body:{confirmSlug:'errado'},expect:400});
await call(`/api/identity/platform/tenants/${t.id}`,{token:P,method:'DELETE',body:{confirmSlug:slug},expect:204});
assert.ok(!(await call('/api/identity/platform/tenants',{token:P})).some(x=>x.id===t.id));
await call('/api/customers/customers',{token:ownerOffice.token,expect:200}).then(rows=>assert.equal(rows.length,0,'Dados da oficina excluída foram apagados'));
console.log('Console da plataforma verificado: CRUD de oficinas, suspensão, exclusão com limpeza e negativa de acesso aos dados operacionais.');
