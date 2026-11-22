import { HttpException, HttpStatus } from '@nestjs/common';

/** Erro de regra de negócio com mensagem escrita pelo time, segura para mostrar na interface. */
export class BusinessException extends HttpException {
  constructor(readonly code: string, message: string, status: HttpStatus = HttpStatus.CONFLICT) {
    super(message, status);
  }
}

export const badRequest = (message: string, code = 'INVALID_INPUT') => new BusinessException(code, message, HttpStatus.BAD_REQUEST);
export const forbidden = (message: string, code = 'FORBIDDEN') => new BusinessException(code, message, HttpStatus.FORBIDDEN);
export const notFound = (message: string, code = 'NOT_FOUND') => new BusinessException(code, message, HttpStatus.NOT_FOUND);
export const conflict = (message: string, code = 'CONFLICT') => new BusinessException(code, message, HttpStatus.CONFLICT);
export const tooMany = (message: string, code = 'TOO_MANY_ATTEMPTS') => new BusinessException(code, message, HttpStatus.TOO_MANY_REQUESTS);
export const badGateway = (message: string, code = 'UPSTREAM_FAILED') => new BusinessException(code, message, HttpStatus.BAD_GATEWAY);
export const unavailable = (message: string, code = 'UNAVAILABLE') => new BusinessException(code, message, HttpStatus.SERVICE_UNAVAILABLE);
