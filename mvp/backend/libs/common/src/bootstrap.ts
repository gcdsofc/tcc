import 'reflect-metadata';
import { Logger, Type } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { ApiExceptionFilter } from './errors/api-exception.filter';

/** Inicialização igual para os três microsserviços. */
export async function bootstrapService(module: Type<unknown>, name: string, defaultPort: number): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(module, { logger: ['error', 'warn', 'log'] });
  app.useBodyParser('json', { limit: '64kb' });
  app.enableCors();
  app.useGlobalFilters(new ApiExceptionFilter());
  app.enableShutdownHooks();
  const port = Number(process.env.PORT ?? defaultPort);
  await app.listen(port, '0.0.0.0');
  Logger.log(`${name} listening ${port}`, 'Bootstrap');
}
