function canReadProfile(roles,userId,profileUserId){return !roles.includes('customer')||userId===profileUserId;}
function belongsToTenant(recordTenantId,activeTenantId){return recordTenantId===activeTenantId;}
module.exports={canReadProfile,belongsToTenant};
