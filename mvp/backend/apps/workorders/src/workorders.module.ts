import { Module } from '@nestjs/common';
import { AuthModule, DatabaseModule } from '../../../libs/common/src';
import { InternalController } from './internal.controller';
import { OrdersController } from './orders.controller';
import { WorkordersSchema } from './workorders.schema';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [OrdersController, InternalController],
  providers: [WorkordersSchema],
})
export class WorkordersModule {}
