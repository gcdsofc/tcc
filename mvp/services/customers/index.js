const express=require('express');const cors=require('cors');const {pool}=require('../shared/db');const {requireTenant}=require('../shared/auth');
const app=express();app.use(cors());app.use(express.json({limit:'32kb'}));const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const {canReadProfile}=require('./domain');
async function init(){await pool.query(`CREATE TABLE IF NOT EXISTS customer_profiles(id uuid primary key,tenant_id uuid not null,identity_user_id uuid,name text not null,email text,phone text not null,created_at timestamptz default now(),unique(tenant_id,id),unique(tenant_id,phone));CREATE INDEX IF NOT EXISTS idx_customer_tenant_phone ON customer_profiles(tenant_id,phone);
ALTER TABLE customer_profiles ADD COLUMN IF NOT EXISTS cep text, ADD COLUMN IF NOT EXISTS street text, ADD COLUMN IF NOT EXISTS address_number text, ADD COLUMN IF NOT EXISTS district text, ADD COLUMN IF NOT EXISTS city text, ADD COLUMN IF NOT EXISTS state text;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS fipe_code text;
CREATE TABLE IF NOT EXISTS vehicles(id uuid primary key,tenant_id uuid not null,customer_id uuid not null,plate text not null,make text,model text,year int,created_at timestamptz default now(),unique(tenant_id,plate),foreign key(tenant_id,customer_id) references customer_profiles(tenant_id,id));`);
const sharedCustomer=await pool.query("insert into customer_profiles(id,tenant_id,identity_user_id,name,email,phone) values($1,$2,$3,$4,$5,$6) on conflict(tenant_id,phone) do update set identity_user_id=coalesce(customer_profiles.identity_user_id,excluded.identity_user_id) returning id",[id(604),id(2),id(301),'Ana Cliente','ana@cliente.demo.local','+5511991000301']);
await pool.query('insert into vehicles(id,tenant_id,customer_id,plate,make,model,year) values($1,$2,$3,$4,$5,$6,$7) on conflict(tenant_id,plate) do nothing',[id(750),id(2),sharedCustomer.rows[0].id,'ANA2B34','Honda','Fit',2021]);
const {rows}=await pool.query('select count(*)::int n from customer_profiles');if(rows[0].n)return;
const customers=[[id(601),id(1),id(301),'Ana Cliente','ana@cliente.demo.local','+5511991000301'],[id(602),id(3),id(301),'Ana Cliente','ana@cliente.demo.local','+5511991000301'],[id(603),id(2),id(303),'Carla Cliente','carla@cliente.demo.local','+5511991000303']];
for(let t=1;t<=5;t++)customers.push([id(610+t),id(t),id(302),'Bruno Cliente','bruno@cliente.demo.local','+5511991000302']);
for(const c of customers)await pool.query('insert into customer_profiles(id,tenant_id,identity_user_id,name,email,phone) values($1,$2,$3,$4,$5,$6)',c);
const cars=[['ABC1A01','Honda','Civic',2020],['ABC1A02','Toyota','Corolla',2019],['BCD2B02','Fiat','Argo',2022],['CDE3C03','Chevrolet','Onix',2021],['DEF4D04','Volkswagen','Polo',2018],['EFG5E05','Hyundai','HB20',2023],['FGH6F06','Renault','Duster',2020]];
let k=0;for(const c of customers){const count=c[2]===id(302)?1:(c[2]===id(301)?2:1);for(let j=0;j<count;j++){const car=cars[k++%cars.length];await pool.query('insert into vehicles(id,tenant_id,customer_id,plate,make,model,year) values($1,$2,$3,$4,$5,$6,$7)',[id(700+k),c[1],c[0],car[0],car[1],car[2],car[3]]);}}
}
function role(req,allowed){if(!req.access.roles.some(x=>allowed.includes(x)))return false;return true;}
app.get('/health',async(_,res)=>{try{await pool.query('select 1');res.json({service:'customers',status:'ok'});}catch{res.status(503).json({status:'unavailable'});}});
app.post('/internal/link-customer',async(req,res)=>{if(req.headers['x-service-secret']!==process.env.SERVICE_SECRET)return res.status(403).end();const {tenantId,phone,identityUserId}=req.body;const q=await pool.query('update customer_profiles set identity_user_id=$1 where tenant_id=$2 and phone=$3 and (identity_user_id is null or identity_user_id=$1) returning id',[identityUserId,tenantId,phone]);if(!q.rowCount){const exists=await pool.query('select 1 from customer_profiles where tenant_id=$1 and phone=$2',[tenantId,phone]);return exists.rowCount?res.status(409).json({error:'Este perfil já está ligado a outra conta GarageOps.'}):res.status(404).json({error:'Perfil local não localizado.'});}res.json({linked:true,profileId:q.rows[0].id});});
app.get('/internal/profile',async(req,res)=>{if(req.headers['x-service-secret']!==process.env.SERVICE_SECRET)return res.status(403).end();const q=await pool.query('select name,email from customer_profiles where tenant_id=$1 and phone=$2',[String(req.query.tenantId||''),String(req.query.phone||'')]).catch(()=>({rowCount:0}));if(!q.rowCount)return res.status(404).json({error:'Perfil local não localizado.'});res.json(q.rows[0]);});
app.get('/internal/validate/:customerId/:vehicleId',async(req,res)=>{if(req.headers['x-service-secret']!==process.env.SERVICE_SECRET)return res.status(403).end();const q=await pool.query('select c.id customer_id,c.identity_user_id,v.id vehicle_id from customer_profiles c join vehicles v on v.customer_id=c.id and v.tenant_id=c.tenant_id where c.id=$1 and v.id=$2 and c.tenant_id=$3',[req.params.customerId,req.params.vehicleId,req.headers['x-tenant-id']]);if(!q.rowCount)return res.status(404).json({error:'Cliente ou veículo não localizado.'});res.json({customerId:q.rows[0].customer_id,vehicleId:q.rows[0].vehicle_id,identityUserId:q.rows[0].identity_user_id});});
// Exclusão de tenant solicitada pelo console da plataforma: remove os dados sem devolvê-los a ninguém.
app.delete('/internal/tenants/:id',async(req,res)=>{if(req.headers['x-service-secret']!==process.env.SERVICE_SECRET)return res.status(403).end();const c=await pool.connect();try{await c.query('begin');await c.query('delete from vehicles where tenant_id=$1',[req.params.id]);await c.query('delete from customer_profiles where tenant_id=$1',[req.params.id]);await c.query('commit');res.status(204).end();}catch(e){await c.query('rollback');res.status(500).json({error:'purge failed'});}finally{c.release();}});
app.use(requireTenant);
app.get('/customers',async(req,res)=>{const roles=req.access.roles,p=roles.includes('customer');if(!p&&!roles.some(x=>['owner','attendant','mechanic'].includes(x)))return res.status(403).json({error:'Este perfil não pode consultar a lista de clientes.'});const q=p?await pool.query('select id,name,email,phone,cep,street,address_number,district,city,state from customer_profiles where tenant_id=$1 and identity_user_id=$2 order by name',[req.access.tenantId,req.access.sub]):await pool.query('select id,name,email,phone,cep,street,address_number,district,city,state from customer_profiles where tenant_id=$1 order by name',[req.access.tenantId]);res.json(q.rows);});
app.post('/customers',async(req,res)=>{if(!role(req,['owner','attendant']))return res.status(403).json({error:'Perfil sem permissão para cadastrar clientes.'});const name=String(req.body.name||'').trim(),phone=String(req.body.phone||'').trim(),email=String(req.body.email||'').trim().toLowerCase()||null;if(!name||!phone)return res.status(400).json({error:'Nome e telefone são obrigatórios.'});const txt=(v,max)=>String(v||'').trim().slice(0,max)||null;const cep=String(req.body.cep||'').replace(/\D/g,'')||null;if(cep&&cep.length!==8)return res.status(400).json({error:'CEP deve conter oito dígitos.'});const state=txt(req.body.state,2)?.toUpperCase()||null;try{const q=await pool.query('insert into customer_profiles(id,tenant_id,name,email,phone,cep,street,address_number,district,city,state) values(gen_random_uuid(),$1,$2,$3,$4,$5,$6,$7,$8,$9,$10) returning id,name,email,phone,cep,street,address_number,district,city,state',[req.access.tenantId,name,email,phone,cep,txt(req.body.street,160),txt(req.body.addressNumber,20),txt(req.body.district,80),txt(req.body.city,80),state]);res.status(201).json(q.rows[0]);}catch(e){if(e.code==='23505')return res.status(409).json({error:'Já existe um cliente com esse telefone nesta oficina.'});res.status(500).json({error:'Não foi possível cadastrar o cliente.'});}});
app.get('/vehicles',async(req,res)=>{const roles=req.access.roles,p=roles.includes('customer');if(!p&&!roles.some(x=>['owner','attendant','mechanic'].includes(x)))return res.status(403).json({error:'Este perfil não pode consultar os veículos.'});const q=p?await pool.query('select v.*,c.name customer_name from vehicles v join customer_profiles c on c.id=v.customer_id and c.tenant_id=v.tenant_id where v.tenant_id=$1 and c.identity_user_id=$2 order by v.plate',[req.access.tenantId,req.access.sub]):await pool.query('select v.*,c.name customer_name from vehicles v join customer_profiles c on c.id=v.customer_id and c.tenant_id=v.tenant_id where v.tenant_id=$1 order by v.plate',[req.access.tenantId]);res.json(q.rows);});
app.post('/vehicles',async(req,res)=>{if(!role(req,['owner','attendant']))return res.status(403).json({error:'Perfil sem permissão para cadastrar veículos.'});const {customerId,plate,make,model,year,fipeCode}=req.body;if(!customerId||!plate)return res.status(400).json({error:'Cliente e placa são obrigatórios.'});const q=await pool.query('select id from customer_profiles where id=$1 and tenant_id=$2',[customerId,req.access.tenantId]);if(!q.rowCount)return res.status(404).json({error:'Cliente não encontrado nesta oficina.'});try{const v=await pool.query('insert into vehicles(id,tenant_id,customer_id,plate,make,model,year,fipe_code) values(gen_random_uuid(),$1,$2,upper($3),$4,$5,$6,$7) returning *',[req.access.tenantId,customerId,plate,make||null,model||null,year||null,/^\d{6}-\d$/.test(String(fipeCode||''))?fipeCode:null]);res.status(201).json(v.rows[0]);}catch(e){res.status(409).json({error:'Placa já cadastrada nesta oficina ou dados inválidos.'});}});
// ---------------------------------------------------------------------------
// Integração externa FIPE (marca, modelo e ano do veículo).
// A consulta passa por este serviço para padronizar os dados e guardar cache:
// a API pública tem limite diário de chamadas e as listas quase não mudam.
// Se a FIPE falhar, a tela libera o preenchimento manual.
// ---------------------------------------------------------------------------
const FIPE_URL=process.env.FIPE_URL||'https://parallelum.com.br/fipe/api/v1/carros';
const fipeCache=new Map(),FIPE_TTL=24*60*60*1000;
async function fipe(path){
 const hit=fipeCache.get(path);
 if(hit&&hit.until>Date.now())return hit.data;
 // Uma nova tentativa para falhas passageiras da API pública antes de liberar o modo manual.
 let r;
 for(let attempt=1;attempt<=2;attempt++){
  r=await fetch(`${FIPE_URL}${path}`,{signal:AbortSignal.timeout(6000)}).catch(()=>null);
  if(r&&(r.ok||r.status===404||r.status===400))break;
  if(attempt===1)await new Promise(done=>setTimeout(done,700));
 }
 if(!r)throw Error('fipe');
 if(r.status===404||r.status===400)throw Object.assign(Error('Veículo não encontrado na tabela FIPE.'),{status:404});
 if(!r.ok)throw Error('fipe');
 const data=await r.json();
 if(data&&data.error)throw Object.assign(Error('Veículo não encontrado na tabela FIPE.'),{status:404});
 fipeCache.set(path,{data,until:Date.now()+FIPE_TTL});
 return data;
}
const fipeRoute=handler=>async(req,res)=>{
 if(!role(req,['owner','attendant']))return res.status(403).json({error:'Perfil sem permissão para cadastrar veículos.'});
 const {brand,model,year}=req.params;
 if((brand&&!/^\d{1,6}$/.test(brand))||(model&&!/^\d{1,7}$/.test(model))||(year&&!/^\d{4,5}-\d$/.test(year)))return res.status(400).json({error:'Parâmetro FIPE inválido.'});
 try{res.json(await handler(req.params));}
 catch(e){res.status(e.status||503).json({error:e.status?e.message:'Tabela FIPE indisponível. Preencha marca, modelo e ano manualmente.'});}
};
const toOptions=list=>list.map(item=>({code:String(item.codigo),name:item.nome}));
app.get('/fipe/brands',fipeRoute(async()=>toOptions(await fipe('/marcas'))));
app.get('/fipe/brands/:brand/models',fipeRoute(async({brand})=>toOptions((await fipe(`/marcas/${brand}/modelos`)).modelos||[])));
app.get('/fipe/brands/:brand/models/:model/years',fipeRoute(async({brand,model})=>toOptions(await fipe(`/marcas/${brand}/modelos/${model}/anos`)).map(y=>({...y,name:y.name.replace(/^32000/,'Zero km')}))));
app.get('/fipe/brands/:brand/models/:model/years/:year',fipeRoute(async({brand,model,year})=>{
 const v=await fipe(`/marcas/${brand}/modelos/${model}/anos/${year}`);
 return {fipeCode:v.CodigoFipe,brand:v.Marca,model:v.Modelo,year:v.AnoModelo===32000?new Date().getFullYear():v.AnoModelo,fuel:v.Combustivel,price:v.Valor,reference:v.MesReferencia};
}));
app.get('/customers/:id',async(req,res)=>{const q=await pool.query('select id,name,email,phone,identity_user_id from customer_profiles where id=$1 and tenant_id=$2',[req.params.id,req.access.tenantId]);if(!q.rowCount)return res.status(404).json({error:'Cliente não encontrado.'});if(!req.access.roles.some(x=>['owner','attendant','mechanic','customer'].includes(x))||!canReadProfile(req.access.roles,req.access.sub,q.rows[0].identity_user_id))return res.status(403).json({error:'Acesso negado.'});res.json(q.rows[0]);});
app.get('/lookup/:customerId/:vehicleId',async(req,res)=>{if(!req.access.roles.some(x=>['owner','attendant','mechanic','customer'].includes(x)))return res.status(403).json({error:'Este perfil não pode consultar clientes ou veículos.'});const q=await pool.query('select c.id customer_id,v.id vehicle_id from customer_profiles c join vehicles v on v.customer_id=c.id and v.tenant_id=c.tenant_id where c.id=$1 and v.id=$2 and c.tenant_id=$3',[req.params.customerId,req.params.vehicleId,req.access.tenantId]);if(!q.rowCount)return res.status(404).json({error:'Cliente ou veículo não pertence a esta oficina.'});res.json(q.rows[0]);});
app.get('/address/:cep',async(req,res)=>{const cep=String(req.params.cep).replace(/\D/g,'');if(!/^\d{8}$/.test(cep))return res.status(400).json({error:'CEP deve conter oito dígitos.'});try{const r=await fetch(`https://viacep.com.br/ws/${cep}/json/`,{signal:AbortSignal.timeout(3500)});if(!r.ok)throw Error();const data=await r.json();if(data.erro)return res.status(404).json({error:'CEP não encontrado.'});res.json({street:data.logradouro,district:data.bairro,city:data.localidade,state:data.uf});}catch{res.status(503).json({error:'ViaCEP indisponível. Continue com preenchimento manual.'});}});
const port=Number(process.env.PORT||3002);init().then(()=>app.listen(port,'0.0.0.0',()=>console.log(`customers listening ${port}`))).catch(e=>{console.error(e);process.exit(1)});
