import { Module } from '@nestjs/common';
import { AuthModule, DatabaseModule } from '../../../libs/common/src';
import { CustomersController } from './customers.controller';
import { CustomersSchema } from './customers.schema';
import { ExternalController } from './external.controller';
import { InternalController } from './internal.controller';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [CustomersController, ExternalController, InternalController],
  providers: [CustomersSchema],
})
export class CustomersModule {}
