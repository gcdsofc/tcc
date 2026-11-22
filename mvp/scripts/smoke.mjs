import assert from 'node:assert/strict';
const root=process.env.APP_URL||'http://localhost:8080';
async function call(path,{token,method='GET',body,expect=200}={}){const r=await fetch(root+path,{method,headers:{'content-type':'application/json',...(token?{authorization:`Bearer ${token}`}:{})},...(body?{body:JSON.stringify(body)}:{})});const data=await r.json().catch(()=>({}));assert.equal(r.status,expect,`${method} ${path}: ${JSON.stringify(data)}`);return data;}
async function login(email){return call('/api/identity/auth/login',{method:'POST',body:{email,password:'GarageOps2026!'}})}
async function select(globalToken,tenantId){return call('/api/identity/auth/select-office',{token:globalToken,method:'POST',body:{tenantId}})}
const tenants=['00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000004','00000000-0000-4000-8000-000000000005'];
const ana=await login('ana@cliente.demo.local');assert.equal(ana.offices.length,3,'Ana deve ter vínculo com três oficinas');
const bruno=await login('bruno@cliente.demo.local');assert.equal(bruno.offices.length,5,'Bruno deve ter vínculo com as cinco oficinas');
const officeA=await select((await login('admin1@demo.garageops.local')).token,tenants[0]);
const tenantBOrder='10000000-0000-4000-8000-000000000003';
const denied=await fetch(`${root}/api/orders/orders/${tenantBOrder}`,{headers:{authorization:`Bearer ${officeA.token}`}});assert.equal(denied.status,404,'Oficina A não deve consultar ordem da B');
const customerId='00000000-0000-4000-8000-000000000601',vehicleId='00000000-0000-4000-8000-000000000701';
const order=await call('/api/orders/orders',{token:officeA.token,method:'POST',body:{customerId,vehicleId,problem:'Teste integrado do fluxo de orçamento'},expect:201});
await call(`/api/orders/orders/${order.id}/diagnosis`,{token:officeA.token,method:'POST',body:{diagnosis:'Diagnóstico demonstrativo'}});
const v1=await call(`/api/orders/orders/${order.id}/estimates`,{token:officeA.token,method:'POST',body:{items:[{kind:'service',description:'Mão de obra',quantity:1,unitPrice:250},{kind:'part',description:'Peça manual sem estoque',quantity:1,unitPrice:120}]},expect:201});
const anaA=await select(ana.token,tenants[0]);
await call(`/api/orders/orders/${order.id}/decision`,{token:anaA.token,method:'POST',body:{estimateId:v1.id,decision:'refused',reason:'Solicito alternativa'}});
await call(`/api/orders/orders/${order.id}/messages`,{token:anaA.token,method:'POST',body:{body:'Podemos revisar o orçamento?'},expect:201});
const v2=await call(`/api/orders/orders/${order.id}/estimates`,{token:officeA.token,method:'POST',body:{items:[{kind:'service',description:'Mão de obra revisada',quantity:1,unitPrice:200}]},expect:201});
await call(`/api/orders/orders/${order.id}/decision`,{token:anaA.token,method:'POST',body:{estimateId:v2.id,decision:'approved'}});
const approvedOrder=await call(`/api/orders/orders/${order.id}`,{token:officeA.token});const serviceItem=approvedOrder.estimates.find(e=>e.status==='approved').items.find(i=>i.kind==='service');
const mechanic=await select((await login('mecanico.a@demo.garageops.local')).token,tenants[0]);
await call(`/api/orders/orders/${order.id}/execute`,{token:mechanic.token,method:'POST',body:{estimateItemId:serviceItem.id},expect:201});
await call(`/api/orders/orders/${order.id}/ready`,{token:mechanic.token,method:'POST'});
await call(`/api/orders/orders/${order.id}/payments`,{token:officeA.token,method:'POST',body:{amount:200,method:'Pix'},expect:201});
const closed=await call(`/api/orders/orders/${order.id}/close`,{token:officeA.token,method:'POST'});assert.equal(closed.status,'closed');
const final=await call(`/api/orders/orders/${order.id}`,{token:anaA.token});assert.equal(final.estimates.length,2,'As duas versões devem permanecer no histórico');assert.equal(final.messages.length,1);assert.equal(final.status,'closed');
const newPhone='+5511988887766';
const newCustomer=await call('/api/customers/customers',{token:officeA.token,method:'POST',body:{name:'Cliente Convite',phone:newPhone,email:'convite@demo.local'},expect:201});
const invitation=await call('/api/identity/invites',{token:officeA.token,method:'POST',body:{customerName:newCustomer.name,phone:newPhone},expect:201});
const bad=await fetch(root+'/api/identity/invites/activate',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({token:invitation.activationUrl.split('token=')[1],code:'000000',name:'Cliente Convite',email:'convite@demo.local',password:'DemoInvitationPass1!'})});assert.equal(bad.status,400,'Código incorreto não deve ativar o acesso');
const token=invitation.activationUrl.split('token=')[1];
const active=await call('/api/identity/invites/activate',{method:'POST',body:{token,code:invitation.devCode,name:'Cliente Convite',email:'convite@demo.local',password:'DemoInvitationPass1!'},expect:201});
const linked=await call('/api/identity/tenants',{token:active.token});assert.equal(linked.length,1);assert.equal(linked[0].id,tenants[0]);
console.log('Smoke test concluído: 5 tenants, vínculos de cliente, isolamento, recusa, conversa, versão revisada, aprovação, execução, pagamento, histórico e convite com OTP.');
