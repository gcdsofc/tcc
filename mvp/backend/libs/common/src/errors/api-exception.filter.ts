import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { Response } from 'express';
import { BusinessException } from './business.exception';

const SAFE_MESSAGES: Record<number, string> = {
  [HttpStatus.BAD_REQUEST]: 'A solicitação contém dados inválidos.',
  [HttpStatus.UNAUTHORIZED]: 'Sua sessão expirou ou é inválida. Entre novamente.',
  [HttpStatus.FORBIDDEN]: 'Acesso não permitido.',
  [HttpStatus.NOT_FOUND]: 'Recurso não encontrado.',
  [HttpStatus.CONFLICT]: 'A solicitação conflita com o estado atual.',
  [HttpStatus.PAYLOAD_TOO_LARGE]: 'Os dados enviados são grandes demais.',
  [HttpStatus.TOO_MANY_REQUESTS]: 'Limite de solicitações excedido.',
  [HttpStatus.SERVICE_UNAVAILABLE]: 'Serviço temporariamente indisponível.',
};

/**
 * Formato único de erro: { statusCode, error, message }.
 * Só mensagens de BusinessException chegam à interface; o resto vira texto genérico
 * e erros 500 ficam registrados no log do serviço (sem corpo da requisição).
 */
@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('ApiExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    if (status >= 500 && !(exception instanceof BusinessException)) {
      this.logger.error(exception instanceof Error ? exception.stack ?? exception.message : String(exception));
    }
    const business = exception instanceof BusinessException;
    const message = business
      ? (exception as BusinessException).message
      : SAFE_MESSAGES[status] ?? (status >= 500 ? 'Erro interno do servidor.' : 'Não foi possível concluir a solicitação.');
    response.status(status).json({
      statusCode: status,
      error: business ? (exception as BusinessException).code : this.errorCode(status),
      message,
    });
  }

  private errorCode(status: number): string {
    switch (status) {
      case 400: return 'BAD_REQUEST';
      case 401: return 'UNAUTHENTICATED';
      case 403: return 'FORBIDDEN';
      case 404: return 'NOT_FOUND';
      case 409: return 'CONFLICT';
      case 413: return 'PAYLOAD_TOO_LARGE';
      case 429: return 'TOO_MANY_REQUESTS';
      case 503: return 'SERVICE_UNAVAILABLE';
      default: return status >= 500 ? 'INTERNAL_ERROR' : 'REQUEST_FAILED';
    }
  }
}
