import { ArgumentsHost, HttpStatus, NotFoundException } from '@nestjs/common';
import { ApiExceptionFilter } from '../src/errors/api-exception.filter';
import { BusinessException, badRequest, unavailable } from '../src/errors/business.exception';

function run(exception: unknown) {
  const result: { code?: number; body?: any } = {};
  const response = { status(code: number) { result.code = code; return this; }, json(body: unknown) { result.body = body; } };
  const host = { switchToHttp: () => ({ getResponse: () => response }) } as unknown as ArgumentsHost;
  new ApiExceptionFilter().catch(exception, host);
  return result;
}

describe('ApiExceptionFilter', () => {
  beforeAll(() => jest.spyOn(console, 'error').mockImplementation(() => undefined));

  it('mostra a mensagem de negócio com código e status', () => {
    const r = run(new BusinessException('CUSTOMER_PHONE_TAKEN', 'Já existe um cliente com esse telefone nesta oficina.'));
    expect(r.code).toBe(HttpStatus.CONFLICT);
    expect(r.body).toEqual({ statusCode: 409, error: 'CUSTOMER_PHONE_TAKEN', message: 'Já existe um cliente com esse telefone nesta oficina.' });
  });

  it('atalhos de erro usam o status certo', () => {
    expect(run(badRequest('Diagnóstico obrigatório.')).code).toBe(400);
    expect(run(unavailable('ViaCEP indisponível.')).body).toMatchObject({ statusCode: 503, message: 'ViaCEP indisponível.' });
  });

  it('mantém genérico o que não é erro de negócio', () => {
    expect(run(new NotFoundException('detalhe interno')).body.message).toBe('Recurso não encontrado.');
    expect(run(new Error('stack interna')).body).toEqual({ statusCode: 500, error: 'INTERNAL_ERROR', message: 'Erro interno do servidor.' });
  });
});
