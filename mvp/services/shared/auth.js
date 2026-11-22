const jwt = require('jsonwebtoken');
const secret = process.env.JWT_SECRET || 'local-only-change-me';
function sign(user) { return jwt.sign({ sub:user.id, name:user.name, email:user.email }, secret, { expiresIn:'8h', issuer:'oficinapro-identity' }); }
function requireAuth(req,res,next) {
  const token=(req.headers.authorization||'').replace(/^Bearer\s+/i,'');
  try { req.identity=jwt.verify(token,secret,{issuer:'oficinapro-identity'}); next(); }
  catch { res.status(401).json({error:'Autenticação necessária.'}); }
}
function requireTenant(req,res,next) {
  const token=(req.headers.authorization||'').replace(/^Bearer\s+/i,'');
  try { req.access=jwt.verify(token,secret,{issuer:'oficinapro-identity'}); }
  catch { return res.status(401).json({error:'Sua sessão expirou ou é inválida. Entre novamente.'}); }
  if(!req.access.tenantId||!Array.isArray(req.access.roles))return res.status(409).json({error:'Selecione uma oficina antes de acessar estes dados.'});
  next();
}
module.exports={sign,requireAuth,requireTenant,secret};
