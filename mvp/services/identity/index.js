const express=require('express'); const cors=require('cors'); const bcrypt=require('bcryptjs'); const crypto=require('crypto');
const {pool}=require('../shared/db'); const {sign,requireAuth,requireTenant,secret}=require('../shared/auth');
const app=express(); app.use(cors()); app.use(express.json({limit:'32kb'}));
const uuid=(n)=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const demoFinanceTeams=[
 [270,'Financeiro Horizonte','financeiro.b@demo.garageops.local','+5511990000270',2],
 [271,'Financeiro Torque','financeiro.c@demo.garageops.local','+5511990000271',3],
 [272,'Financeiro Box 12','financeiro.d@demo.garageops.local','+5511990000272',4],
 [273,'Financeiro Rota Auto Center','financeiro.e@demo.garageops.local','+5511990000273',5],
];
const loginAttempts=new Map();
// Conta técnica da plataforma GarageOps: não tem vínculo com nenhuma oficina,
// então os serviços de clientes e ordens recusam qualquer token dela (sem tenantId).
async function ensurePlatformAdmin(){
 if(process.env.BOOTSTRAP_DEMO!=='true')return;
 const hash=await bcrypt.hash('GarageOps2026!',10);
 await pool.query(`insert into users(id,name,email,phone,password_hash,platform_role) values($1,$2,$3,$4,$5,'platform_admin') on conflict(id) do update set platform_role='platform_admin'`,[uuid(900),'Administrador da Plataforma','plataforma@garageops.local','+5511990000900',hash]);
}
async function init(){
 await pool.query(`CREATE TABLE IF NOT EXISTS tenants(id uuid primary key,name text not null,slug text unique not null,brand_color text not null default '#0f766e',created_at timestamptz default now());
 CREATE TABLE IF NOT EXISTS users(id uuid primary key,name text not null,email text unique not null,phone text,password_hash text not null,status text not null default 'active',created_at timestamptz default now());
 CREATE TABLE IF NOT EXISTS memberships(id uuid primary key,user_id uuid references users(id),tenant_id uuid references tenants(id),roles text[] not null,status text not null default 'active',unique(user_id,tenant_id));
 CREATE TABLE IF NOT EXISTS invitations(id uuid primary key,tenant_id uuid references tenants(id),phone text not null,customer_name text not null,token_hash text not null,code_hash text not null,attempts int not null default 0,expires_at timestamptz not null,used_at timestamptz,revoked_at timestamptz,created_by uuid,created_at timestamptz default now());
 ALTER TABLE invitations ADD COLUMN IF NOT EXISTS attempts int not null default 0;
 ALTER TABLE tenants ADD COLUMN IF NOT EXISTS status text not null default 'active';
 ALTER TABLE users ADD COLUMN IF NOT EXISTS platform_role text;`);
 await ensurePlatformAdmin();
 const {rows}=await pool.query('select count(*)::int n from tenants');
 if(rows[0].n){
  const demoHash=await bcrypt.hash('GarageOps2026!',10);
  for(const [uid,name,email,phone,role,membershipId] of [[uuid(206),'Atendente Garagem Central','atendente.a@demo.garageops.local','+5511990000206',['attendant'],uuid(551)],[uuid(205),'Financeiro Garagem Central','financeiro.a@demo.garageops.local','+5511990000205',['finance'],uuid(550)]]){
   await pool.query('insert into users(id,name,email,phone,password_hash) values($1,$2,$3,$4,$5) on conflict(id) do nothing',[uid,name,email,phone,demoHash]);
   await pool.query('insert into memberships(id,user_id,tenant_id,roles) values($1,$2,$3,$4) on conflict(user_id,tenant_id) do update set status=$5,roles=$4',[membershipId,uid,uuid(1),role,'active']);
  }
  for(let i=0;i<demoFinanceTeams.length;i++){
   const [userId,name,email,phone,tenantId]=demoFinanceTeams[i],uid=uuid(userId);
   await pool.query('insert into users(id,name,email,phone,password_hash) values($1,$2,$3,$4,$5) on conflict(id) do nothing',[uid,name,email,phone,demoHash]);
   await pool.query('insert into memberships(id,user_id,tenant_id,roles) values($1,$2,$3,$4) on conflict(user_id,tenant_id) do update set status=$5,roles=$4',[uuid(560+i),uid,uuid(tenantId),['finance'],'active']);
  }
  await pool.query('insert into memberships(id,user_id,tenant_id,roles) values($1,$2,$3,$4) on conflict(user_id,tenant_id) do update set status=$5,roles=$4',[uuid(552),uuid(301),uuid(2),['customer'],'active']);
  return;
 }
 const offices=[['Garagem Central','garagem-central'],['Horizonte','horizonte'],['Torque','torque'],['Box 12','box-12'],['Rota Auto Center','rota-auto-center']];
 const users=[]; for(let i=0;i<offices.length;i++){users.push([uuid(100+i),`Admin ${offices[i][0]}`,`admin${i+1}@demo.garageops.local`,`+55119900000${i+1}`,['owner']]);}
 users.push([uuid(201),'Atendente Horizonte','atendente.h@demo.garageops.local','+5511990000201',['attendant']]);
 users.push([uuid(202),'Mecânico Horizonte','mecanico.h@demo.garageops.local','+5511990000202',['mechanic']]);
 users.push([uuid(200),'Mecânico Central','mecanico.a@demo.garageops.local','+5511990000200',['mechanic']]);
 users.push([uuid(206),'Atendente Garagem Central','atendente.a@demo.garageops.local','+5511990000206',['attendant']]);
 users.push([uuid(205),'Financeiro Garagem Central','financeiro.a@demo.garageops.local','+5511990000205',['finance']]);
 for(const [userId,name,email,phone] of demoFinanceTeams) users.push([uuid(userId),name,email,phone,['finance']]);
 users.push([uuid(203),'Mecânico Horizonte 2','mecanico.h2@demo.garageops.local','+5511990000203',['mechanic']]);
 users.push([uuid(204),'Atendente Torque','atendente.t@demo.garageops.local','+5511990000204',['attendant']]);
 for(let i=0;i<6;i++) users.push([uuid(210+i),`Mecânico Torque ${i+1}`,`mecanico.t${i+1}@demo.garageops.local`,`+55119900002${10+i}`,['mechanic']]);
 for(let i=0;i<2;i++) users.push([uuid(220+i),`Atendente Box ${i+1}`,`atendente.b${i+1}@demo.garageops.local`,`+551199000022${i}`,['attendant']]);
 users.push([uuid(240),'Mecânico Box','mecanico.box@demo.garageops.local','+5511990000240',['mechanic']]);
 for(let i=0;i<4;i++) users.push([uuid(230+i),`Mecânico Rota ${i+1}`,`mecanico.r${i+1}@demo.garageops.local`,`+551199000023${i}`,['mechanic']]);
 for(let i=0;i<2;i++) users.push([uuid(260+i),`Atendente Rota ${i+1}`,`atendente.r${i+1}@demo.garageops.local`,`+551199000026${i}`,['attendant']]);
 for(const [id,name,email,phone] of [[uuid(301),'Ana Cliente','ana@cliente.demo.local','+5511991000301'],[uuid(302),'Bruno Cliente','bruno@cliente.demo.local','+5511991000302'],[uuid(303),'Carla Cliente','carla@cliente.demo.local','+5511991000303']]) users.push([id,name,email,phone,['customer']]);
 const hash=await bcrypt.hash('GarageOps2026!',10);
 for(let i=0;i<offices.length;i++){const [name,slug]=offices[i]; await pool.query('insert into tenants(id,name,slug,brand_color) values($1,$2,$3,$4)',[uuid(i+1),name,slug,['#0f766e','#2563eb','#d97706','#7c3aed','#be123c'][i]]);}
 for(const [id,name,email,phone,roles] of users){await pool.query('insert into users(id,name,email,phone,password_hash) values($1,$2,$3,$4,$5)',[id,name,email,phone,hash]);}
 const links=[]; for(let i=0;i<5;i++) links.push([uuid(100+i),uuid(i+1),['owner']]);
 links.push([uuid(201),uuid(2),['attendant']],[uuid(202),uuid(2),['mechanic']]);
 links.push([uuid(200),uuid(1),['mechanic']],[uuid(203),uuid(2),['mechanic']]);
 links.push([uuid(206),uuid(1),['attendant']],[uuid(205),uuid(1),['finance']]);
 for(const financeTeam of demoFinanceTeams) links.push([uuid(financeTeam[0]),uuid(financeTeam[4]),['finance']]);
 links.push([uuid(204),uuid(3),['attendant']]);
 for(let i=0;i<6;i++) links.push([uuid(210+i),uuid(3),['mechanic']]);
 for(let i=0;i<2;i++) links.push([uuid(220+i),uuid(4),['attendant']]);
 links.push([uuid(240),uuid(4),['mechanic']]);
 for(let i=0;i<4;i++) links.push([uuid(230+i),uuid(5),['mechanic']]);
 for(let i=0;i<2;i++) links.push([uuid(260+i),uuid(5),['attendant']]);
 links.push([uuid(301),uuid(1),['customer']],[uuid(301),uuid(2),['customer']],[uuid(301),uuid(3),['customer']]);
 for(let t=1;t<=5;t++) links.push([uuid(302),uuid(t),['customer']]);
 links.push([uuid(303),uuid(2),['customer']]);
 for(let i=0;i<links.length;i++){const [uid,tid,roles]=links[i]; await pool.query('insert into memberships(id,user_id,tenant_id,roles) values($1,$2,$3,$4)',[uuid(500+i),uid,tid,roles]);}
}
app.get('/health',async(_,res)=>{try{await pool.query('select 1');res.json({service:'identity',status:'ok'});}catch{res.status(503).json({status:'unavailable'});}});
app.get('/internal/tenant/:id',async(req,res)=>{if(req.headers['x-service-secret']!==process.env.SERVICE_SECRET)return res.status(403).end();const q=await pool.query('select id,name,slug from tenants where id=$1',[req.params.id]);if(!q.rowCount)return res.status(404).end();res.json(q.rows[0]);});
app.post('/auth/login',async(req,res)=>{const email=String(req.body.email||'').trim().toLowerCase(),password=String(req.body.password||''),key=`${req.ip}:${email}`,now=Date.now(),entry=loginAttempts.get(key);if(entry&&entry.until>now&&entry.count>=8)return res.status(429).json({error:'Muitas tentativas. Aguarde 15 minutos.'});if(entry&&entry.until<=now)loginAttempts.delete(key);const q=await pool.query('select id,name,email,password_hash,status,platform_role from users where lower(email)=lower($1)',[email]);const u=q.rows[0];if(!u||u.status!=='active'||!await bcrypt.compare(password,u.password_hash)){const current=loginAttempts.get(key)||{count:0,until:now+15*60*1000};current.count++;current.until=now+15*60*1000;loginAttempts.set(key,current);return res.status(401).json({error:'E-mail ou senha inválidos.'});}loginAttempts.delete(key);if(u.platform_role==='platform_admin')return res.json({token:signPlatform(u),user:{id:u.id,name:u.name,email:u.email},platform:true,offices:[]});const m=await pool.query(`select m.tenant_id,t.name,t.slug,t.brand_color,m.roles from memberships m join tenants t on t.id=m.tenant_id where m.user_id=$1 and m.status=$2 and t.status='active' order by t.name`,[u.id,'active']);res.json({token:sign({id:u.id,name:u.name,email:u.email}),user:{id:u.id,name:u.name,email:u.email},offices:m.rows});});
app.get('/auth/me',requireAuth,(req,res)=>res.json({user:{id:req.identity.sub,name:req.identity.name,email:req.identity.email},tenantId:req.identity.tenantId||null,roles:req.identity.roles||[]}));
app.post('/auth/select-office',requireAuth,async(req,res)=>{const tenantId=req.body.tenantId; const q=await pool.query(`select m.roles,t.id,t.name,t.slug,t.brand_color from memberships m join tenants t on t.id=m.tenant_id where m.user_id=$1 and m.tenant_id=$2 and m.status=$3 and t.status='active'`,[req.identity.sub,tenantId,'active']); if(!q.rowCount)return res.status(403).json({error:'Você não possui vínculo ativo com esta oficina.'}); const office=q.rows[0]; res.json({token:require('jsonwebtoken').sign({sub:req.identity.sub,name:req.identity.name,email:req.identity.email,tenantId:office.id,roles:office.roles,tenantName:office.name},secret,{expiresIn:'8h',issuer:'oficinapro-identity'}),office});});
app.get('/tenants',requireAuth,async(req,res)=>{const q=await pool.query(`select t.id,t.name,t.slug,t.brand_color,m.roles from memberships m join tenants t on t.id=m.tenant_id where m.user_id=$1 and m.status=$2 and t.status='active' order by t.name`,[req.identity.sub,'active']);res.json(q.rows);});
app.post('/invites',requireTenant,async(req,res)=>{if(!req.access.roles.includes('owner'))return res.status(403).json({error:'Somente o administrador desta oficina pode convidar clientes.'}); const phone=String(req.body.phone||'').trim(),customerName=String(req.body.customerName||'').trim(); if(!phone||!customerName)return res.status(400).json({error:'Nome e telefone são obrigatórios.'}); const hasAccess=await pool.query(`select 1 from users u join memberships m on m.user_id=u.id where u.phone=$1 and m.tenant_id=$2 and m.status='active' and 'customer'=any(m.roles)`,[phone,req.access.tenantId]); if(hasAccess.rowCount)return res.status(409).json({error:'Este cliente já tem acesso ao portal desta oficina. Não é preciso enviar outro convite.'}); const id=crypto.randomUUID(),token=crypto.randomBytes(32).toString('hex'),code=String(crypto.randomInt(100000,999999)); const expiry=new Date(Date.now()+24*60*60*1000); await pool.query('insert into invitations(id,tenant_id,phone,customer_name,token_hash,code_hash,expires_at,created_by) values($1,$2,$3,$4,$5,$6,$7,$8)',[id,req.access.tenantId,phone,customerName,crypto.createHash('sha256').update(token).digest('hex'),await bcrypt.hash(code,10),expiry,req.access.sub]); res.status(201).json({inviteId:id,activationUrl:`/ativar?token=${token}`,expiresAt:expiry,delivery:'mock-local',...(process.env.BOOTSTRAP_DEMO==='true'?{devCode:code}:{})});});
app.post('/invites/accept',requireAuth,async(req,res)=>{const token=String(req.body.token||''),code=String(req.body.code||'');const th=crypto.createHash('sha256').update(token).digest('hex');const q=await pool.query('select * from invitations where token_hash=$1 and used_at is null and revoked_at is null and expires_at>now() and attempts<5',[th]);const inv=q.rows[0];if(!inv)return res.status(400).json({error:'Convite inválido, expirado ou já utilizado.'});if(!await bcrypt.compare(code,inv.code_hash)){await pool.query('update invitations set attempts=attempts+1,revoked_at=case when attempts>=4 then now() else revoked_at end where id=$1',[inv.id]);return res.status(400).json({error:'Código inválido.'});}const phone=await pool.query('select phone from users where id=$1',[req.identity.sub]);if(phone.rows[0]?.phone!==inv.phone)return res.status(403).json({error:'A conta autenticada não corresponde ao telefone convidado.'});const linked=await fetch(`${process.env.CUSTOMER_URL}/internal/link-customer`,{method:'POST',headers:{'content-type':'application/json','x-service-secret':process.env.SERVICE_SECRET},body:JSON.stringify({tenantId:inv.tenant_id,phone:inv.phone,identityUserId:req.identity.sub})});if(!linked.ok)return res.status(409).json({error:'Não foi possível associar o perfil de cliente desta oficina.'});await pool.query(`insert into memberships(id,user_id,tenant_id,roles) values($1,$2,$3,$4) on conflict(user_id,tenant_id) do update set status='active',roles=(select array_agg(distinct role) from unnest(memberships.roles||excluded.roles) as r(role))`,[crypto.randomUUID(),req.identity.sub,inv.tenant_id,['customer']]);await pool.query('update invitations set used_at=now() where id=$1',[inv.id]);res.json({accepted:true,tenantId:inv.tenant_id});});
// ---------------------------------------------------------------------------
// Ativação de conta pelo convite.
// O link sozinho não mostra dados: primeiro a pessoa confirma o código; só então
// vê o nome e o e-mail que a oficina cadastrou. Esses dados não podem ser trocados
// na ativação (o e-mail só é informado quando a oficina não o cadastrou).
// ---------------------------------------------------------------------------
async function checkInviteCode(token,code){
 const th=crypto.createHash('sha256').update(String(token||'')).digest('hex');
 const q=await pool.query('select * from invitations where token_hash=$1 and used_at is null and revoked_at is null and expires_at>now() and attempts<5',[th]);
 const inv=q.rows[0];
 if(!inv)throw Object.assign(Error('Convite inválido, expirado ou já utilizado.'),{status:400});
 if(!await bcrypt.compare(String(code||''),inv.code_hash)){
  await pool.query('update invitations set attempts=attempts+1,revoked_at=case when attempts>=4 then now() else revoked_at end where id=$1',[inv.id]);
  throw Object.assign(Error('Código inválido.'),{status:400});
 }
 return inv;
}
async function invitedProfile(inv){
 const r=await fetch(`${process.env.CUSTOMER_URL}/internal/profile?tenantId=${encodeURIComponent(inv.tenant_id)}&phone=${encodeURIComponent(inv.phone)}`,{headers:{'x-service-secret':process.env.SERVICE_SECRET}}).catch(()=>null);
 if(!r||!r.ok)throw Object.assign(Error('O cadastro deste cliente não foi encontrado na oficina. Peça um novo convite.'),{status:409});
 return r.json();
}
const phoneHasAccount=async phone=>(await pool.query('select 1 from users where phone=$1',[phone])).rowCount>0;
const existingAccountError={error:'Este telefone já tem uma conta GarageOps. Clique em "Já tenho conta", entre com ela e confirme o convite com o mesmo código.',existingAccount:true};
app.post('/invites/verify',async(req,res)=>{
 try{
  const inv=await checkInviteCode(req.body.token,req.body.code);
  if(await phoneHasAccount(inv.phone))return res.status(409).json(existingAccountError);
  const profile=await invitedProfile(inv);
  res.json({name:profile.name,email:profile.email||null});
 }catch(e){res.status(e.status||500).json({error:e.status?e.message:'Não foi possível validar o convite.'});}
});
app.post('/invites/activate',async(req,res)=>{
 const password=String(req.body.password||'');
 if(password.length<12)return res.status(400).json({error:'A senha precisa ter pelo menos 12 caracteres.'});
 let inv,profile;
 try{inv=await checkInviteCode(req.body.token,req.body.code);if(await phoneHasAccount(inv.phone))return res.status(409).json(existingAccountError);profile=await invitedProfile(inv);}
 catch(e){return res.status(e.status||500).json({error:e.status?e.message:'Não foi possível validar o convite.'});}
 const name=profile.name,email=(profile.email||String(req.body.email||'')).trim().toLowerCase();
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return res.status(400).json({error:'Informe um e-mail válido para a sua conta.'});
 const uid=crypto.randomUUID(),hash=await bcrypt.hash(password,12);
 try{
  await pool.query('insert into users(id,name,email,phone,password_hash) values($1,$2,$3,$4,$5)',[uid,name,email,inv.phone,hash]);
  const linked=await fetch(`${process.env.CUSTOMER_URL}/internal/link-customer`,{method:'POST',headers:{'content-type':'application/json','x-service-secret':process.env.SERVICE_SECRET},body:JSON.stringify({tenantId:inv.tenant_id,phone:inv.phone,identityUserId:uid})});
  if(!linked.ok)throw Error('Não foi possível associar o perfil de cliente desta oficina.');
  await pool.query('insert into memberships(id,user_id,tenant_id,roles) values($1,$2,$3,$4)',[crypto.randomUUID(),uid,inv.tenant_id,['customer']]);
  await pool.query('update invitations set used_at=now() where id=$1',[inv.id]);
  res.status(201).json({token:sign({id:uid,name,email}),user:{id:uid,name,email}});
 }catch(e){
  await pool.query('delete from memberships where user_id=$1',[uid]);await pool.query('delete from users where id=$1',[uid]);
  res.status(409).json({error:e.code==='23505'?'Este e-mail já é usado por outra conta GarageOps. Peça à oficina para corrigir o e-mail do cadastro ou entre com a conta existente.':e.message});
 }
});
app.post('/invites/:id/revoke',requireTenant,async(req,res)=>{if(!req.access.roles.includes('owner'))return res.status(403).json({error:'Somente o administrador pode cancelar convites.'});const q=await pool.query('update invitations set revoked_at=now() where id=$1 and tenant_id=$2 and used_at is null returning id',[req.params.id,req.access.tenantId]);if(!q.rowCount)return res.status(404).json({error:'Convite não encontrado ou já utilizado.'});res.json({revoked:true});});
// ---------------------------------------------------------------------------
// Console da plataforma GarageOps
// O administrador da plataforma cadastra, edita, suspende e exclui oficinas.
// Ele só enxerga dados cadastrais do tenant e contagens agregadas: nenhuma rota
// aqui consulta clientes, veículos, ordens, orçamentos, mensagens ou pagamentos.
// ---------------------------------------------------------------------------
function signPlatform(u){return require('jsonwebtoken').sign({sub:u.id,name:u.name,email:u.email,platform:true},secret,{expiresIn:'8h',issuer:'oficinapro-identity'});}
async function requirePlatform(req,res,next){
 const token=(req.headers.authorization||'').replace(/^Bearer\s+/i,'');
 try{req.identity=require('jsonwebtoken').verify(token,secret,{issuer:'oficinapro-identity'});}
 catch{return res.status(401).json({error:'Autenticação necessária.'});}
 if(!req.identity.platform)return res.status(403).json({error:'Área restrita ao administrador da plataforma.'});
 const q=await pool.query(`select 1 from users where id=$1 and status='active' and platform_role='platform_admin'`,[req.identity.sub]);
 if(!q.rowCount)return res.status(403).json({error:'Área restrita ao administrador da plataforma.'});
 next();
}
const slugify=v=>String(v||'').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9-]/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'');
const validColor=v=>/^#[0-9a-f]{6}$/i.test(String(v||''));
const platformTenantSelect=`select t.id,t.name,t.slug,t.brand_color,t.status,t.created_at,
 count(m.id) filter (where m.status='active' and not ('customer'=any(m.roles)))::int as team_accounts,
 count(m.id) filter (where m.status='active' and 'customer'=any(m.roles))::int as customer_accounts
 from tenants t left join memberships m on m.tenant_id=t.id`;
app.get('/platform/tenants',requirePlatform,async(_,res)=>{
 const q=await pool.query(`${platformTenantSelect} group by t.id order by t.created_at,t.name`);
 res.json(q.rows);
});
app.post('/platform/tenants',requirePlatform,async(req,res)=>{
 const name=String(req.body.name||'').trim(),slug=slugify(req.body.slug||req.body.name),color=validColor(req.body.brandColor)?req.body.brandColor:'#0f766e';
 const ownerName=String(req.body.ownerName||'').trim(),email=String(req.body.ownerEmail||'').trim().toLowerCase(),phone=String(req.body.ownerPhone||'').trim(),password=String(req.body.ownerPassword||'');
 if(!name||!slug||!ownerName||!email||!phone)return res.status(400).json({error:'Informe nome da oficina, identificador e os dados do administrador da oficina.'});
 const c=await pool.connect();
 try{
  await c.query('begin');
  const tid=crypto.randomUUID();
  await c.query('insert into tenants(id,name,slug,brand_color) values($1,$2,$3,$4)',[tid,name,slug,color]);
  // Se o e-mail já tem conta GarageOps, reaproveita a identidade (conta global) e só cria o vínculo.
  const existing=await c.query('select id,platform_role from users where lower(email)=lower($1)',[email]);
  let uid;
  if(existing.rowCount){
   if(existing.rows[0].platform_role)throw Object.assign(Error('A conta da plataforma não pode administrar oficinas.'),{status:400});
   uid=existing.rows[0].id;
  }else{
   if(password.length<12)throw Object.assign(Error('Defina uma senha inicial com pelo menos 12 caracteres para o novo administrador.'),{status:400});
   uid=crypto.randomUUID();
   await c.query('insert into users(id,name,email,phone,password_hash) values($1,$2,$3,$4,$5)',[uid,ownerName,email,phone,await bcrypt.hash(password,12)]);
  }
  await c.query('insert into memberships(id,user_id,tenant_id,roles) values($1,$2,$3,$4)',[crypto.randomUUID(),uid,tid,['owner']]);
  await c.query('commit');
  const q=await pool.query(`${platformTenantSelect} where t.id=$1 group by t.id`,[tid]);
  res.status(201).json({...q.rows[0],ownerAccount:existing.rowCount?'existing':'created'});
 }catch(e){
  await c.query('rollback');
  res.status(e.status||409).json({error:e.status?e.message:e.code==='23505'?'Identificador já utilizado por outra oficina.':'Não foi possível cadastrar a oficina.'});
 }finally{c.release();}
});
app.patch('/platform/tenants/:id',requirePlatform,async(req,res)=>{
 const cur=await pool.query('select * from tenants where id=$1',[req.params.id]);
 if(!cur.rowCount)return res.status(404).json({error:'Oficina não encontrada.'});
 const t=cur.rows[0];
 const name=req.body.name!==undefined?String(req.body.name).trim():t.name;
 const slug=req.body.slug!==undefined?slugify(req.body.slug):t.slug;
 const color=req.body.brandColor!==undefined?req.body.brandColor:t.brand_color;
 const status=req.body.status!==undefined?req.body.status:t.status;
 if(!name||!slug)return res.status(400).json({error:'Nome e identificador são obrigatórios.'});
 if(!validColor(color))return res.status(400).json({error:'Cor inválida. Use o formato #RRGGBB.'});
 if(!['active','suspended'].includes(status))return res.status(400).json({error:'Status inválido.'});
 try{await pool.query('update tenants set name=$2,slug=$3,brand_color=$4,status=$5 where id=$1',[t.id,name,slug,color,status]);}
 catch(e){return res.status(409).json({error:e.code==='23505'?'Identificador já utilizado por outra oficina.':'Não foi possível salvar.'});}
 const q=await pool.query(`${platformTenantSelect} where t.id=$1 group by t.id`,[t.id]);
 res.json(q.rows[0]);
});
app.delete('/platform/tenants/:id',requirePlatform,async(req,res)=>{
 const cur=await pool.query('select id,slug from tenants where id=$1',[req.params.id]);
 if(!cur.rowCount)return res.status(404).json({error:'Oficina não encontrada.'});
 if(String(req.body?.confirmSlug||'')!==cur.rows[0].slug)return res.status(400).json({error:'Digite o identificador da oficina para confirmar a exclusão.'});
 // Cada serviço apaga os dados do próprio banco; a identidade nunca lê esses dados.
 for(const base of [process.env.WORKORDERS_URL,process.env.CUSTOMER_URL]){
  const r=await fetch(`${base}/internal/tenants/${cur.rows[0].id}`,{method:'DELETE',headers:{'x-service-secret':process.env.SERVICE_SECRET}}).catch(()=>null);
  if(!r||!r.ok)return res.status(502).json({error:'Não foi possível remover os dados operacionais da oficina. Nada foi excluído da identidade; tente novamente.'});
 }
 const c=await pool.connect();
 try{
  await c.query('begin');
  await c.query('delete from invitations where tenant_id=$1',[cur.rows[0].id]);
  await c.query('delete from memberships where tenant_id=$1',[cur.rows[0].id]);
  await c.query('delete from tenants where id=$1',[cur.rows[0].id]);
  await c.query('commit');
  res.status(204).end();
 }catch{await c.query('rollback');res.status(500).json({error:'Não foi possível excluir a oficina.'});}
 finally{c.release();}
});
const port=Number(process.env.PORT||3001); init().then(()=>app.listen(port,'0.0.0.0',()=>console.log(`identity listening ${port}`))).catch(e=>{console.error(e);process.exit(1)});
