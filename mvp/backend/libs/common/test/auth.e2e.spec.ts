import { Controller, Get, INestApplication, Module } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import {
  AccountEndpoint, ApiExceptionFilter, AuthModule, AuthPrincipal, CurrentPrincipal, InternalEndpoint, PlatformEndpoint, Public, TenantEndpoint, TOKEN_ISSUER,
} from '../src';

process.env.JWT_SECRET = 'segredo-de-teste-com-mais-de-32-caracteres!!';
process.env.SERVICE_SECRET = 'segredo-interno-de-teste';
const TENANT = '8a2c6f84-22d1-4c35-91d0-d3cabdb88a00';

@Controller()
class ProbeController {
  @Get('public') @Public() open() { return { ok: true }; }
  @Get('attendant') @TenantEndpoint('attendant') attendant(@CurrentPrincipal() p: AuthPrincipal) { return { tenant: p.activeTenantId }; }
  @Get('account') @AccountEndpoint() account() { return { ok: true }; }
  @Get('platform') @PlatformEndpoint() platform() { return { ok: true }; }
  @Get('no-policy') forgotten() { return { leaked: true }; }
  @Get('internal') @InternalEndpoint() internal() { return { ok: true }; }
}

@Module({ imports: [AuthModule], controllers: [ProbeController] })
class ProbeModule {}

/** Testa a cadeia completa (token -> guarda -> política -> filtro) por HTTP, sem banco. */
describe('autenticação e políticas por HTTP', () => {
  let app: INestApplication;
  let jwt: JwtService;
  const sign = (claims: object, options: object = {}) => jwt.sign(claims, options);

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [ProbeModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalFilters(new ApiExceptionFilter());
    await app.init();
    jwt = moduleRef.get(JwtService);
  });
  afterAll(() => app.close());

  const tenantToken = () => sign({ sub: 'u1', scope: 'tenant', activeTenantId: TENANT, roles: ['attendant'] });
  const get = (path: string, token?: string) => {
    const req = request(app.getHttpServer()).get(path);
    return token ? req.set('authorization', `Bearer ${token}`) : req;
  };

  it('rota pública não exige token', () => get('/public').expect(200));

  it('rota protegida sem token responde 401', () => get('/attendant').expect(401));

  it('papel certo na oficina ativa passa e a oficina vem do token', async () => {
    const res = await get('/attendant', tenantToken()).expect(200);
    expect(res.body).toEqual({ tenant: TENANT });
  });

  it('papel errado responde 403', () =>
    get('/attendant', sign({ sub: 'u1', scope: 'tenant', activeTenantId: TENANT, roles: ['mechanic'] })).expect(403));

  it('rota sem política explícita é negada mesmo com token válido', () => get('/no-policy', tenantToken()).expect(403));

  it('administrador da plataforma não entra em rota de oficina nem de conta', async () => {
    const token = sign({ sub: 'p1', scope: 'platform', roles: ['platform_admin'] });
    await get('/attendant', token).expect(403);
    await get('/account', token).expect(403);
    await get('/platform', token).expect(200);
  });

  it('conta sem oficina acessa rota de conta, mas não de oficina nem da plataforma', async () => {
    const token = sign({ sub: 'u1', scope: 'account' });
    await get('/account', token).expect(200);
    await get('/attendant', token).expect(403);
    await get('/platform', token).expect(403);
  });

  it('token de outro emissor, expirado ou adulterado responde 401', async () => {
    const other = new JwtService({ secret: process.env.JWT_SECRET });
    await get('/attendant', other.sign({ sub: 'u1', scope: 'tenant', activeTenantId: TENANT, roles: ['attendant'] }, { issuer: 'outro-sistema' })).expect(401);
    await get('/attendant', sign({ sub: 'u1', scope: 'tenant', activeTenantId: TENANT, roles: ['attendant'] }, { expiresIn: -10 })).expect(401);
    await get('/attendant', `${tenantToken()}x`).expect(401);
    expect(TOKEN_ISSUER).toBe('garageops-identity');
  });

  it('rota interna exige o segredo entre serviços', async () => {
    await get('/internal').expect(403);
    await get('/internal').set('x-service-secret', 'errado').expect(403);
    await get('/internal').set('x-service-secret', process.env.SERVICE_SECRET as string).expect(200);
  });
});
