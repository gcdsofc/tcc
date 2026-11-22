import { bootstrapService } from '../../../libs/common/src';
import { CustomersModule } from './customers.module';

void bootstrapService(CustomersModule, 'customers', 3002);
