const test=require('node:test');const assert=require('node:assert/strict');const {canReadProfile,belongsToTenant}=require('../domain');
test('cliente só lê perfil local ligado à própria identidade',()=>{assert.equal(canReadProfile(['customer'],'u1','u1'),true);assert.equal(canReadProfile(['customer'],'u1','u2'),false);});
test('papéis da oficina não removem o filtro de tenant',()=>{assert.equal(belongsToTenant('tenant-a','tenant-a'),true);assert.equal(belongsToTenant('tenant-b','tenant-a'),false);});
