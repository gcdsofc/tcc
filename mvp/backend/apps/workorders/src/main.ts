import { bootstrapService } from '../../../libs/common/src';
import { WorkordersModule } from './workorders.module';

void bootstrapService(WorkordersModule, 'workorders', 3003);
