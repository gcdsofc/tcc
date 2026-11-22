import { Module } from '@nestjs/common';
import { AuthModule, DatabaseModule } from '../../../libs/common/src';
import { AuthController } from './auth.controller';
import { IdentitySchema } from './identity.schema';
import { InternalController } from './internal.controller';
import { InvitesController } from './invites.controller';
import { PlatformAdminGuard, PlatformController } from './platform.controller';
import { TeamController } from './team.controller';
import { TenantAdminGuard } from './tenant-admin.guard';
import { TokensService } from './tokens.service';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [AuthController, InvitesController, TeamController, PlatformController, InternalController],
  providers: [IdentitySchema, TokensService, PlatformAdminGuard, TenantAdminGuard],
})
export class IdentityModule {}
