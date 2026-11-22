import { bootstrapService } from '../../../libs/common/src';
import { IdentityModule } from './identity.module';

void bootstrapService(IdentityModule, 'identity', 3001);
