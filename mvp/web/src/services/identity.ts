import { http } from './http';
import type {
  InviteCreated,
  InvitePreview,
  LoginResponse,
  MemberStatus,
  MeResponse,
  Office,
  PlatformTenant,
  PlatformTenantCreated,
  PlatformTenantInput,
  SelectOfficeResponse,
  TeamMember,
  TeamMemberCreated,
  TeamMemberInput,
  TenantRole,
  TenantStatus,
} from '../types/api';

const base = '/api/identity';

export const identityService = {
  // Autenticação e oficinas
  login: (email: string, password: string) =>
    http.post<LoginResponse>(`${base}/auth/login`, { email, password }),

  me: (token: string, signal?: AbortSignal) =>
    http.get<MeResponse>(`${base}/auth/me`, token, signal),

  myOffices: (token: string, signal?: AbortSignal) =>
    http.get<Office[]>(`${base}/tenants`, token, signal),

  selectOffice: (token: string, tenantId: string) =>
    http.post<SelectOfficeResponse>(`${base}/auth/select-office`, { tenantId }, token),

  // Convites de cliente
  createInvite: (token: string, customerName: string, phone: string) =>
    http.post<InviteCreated>(`${base}/invites`, { customerName, phone }, token),

  verifyInvite: (inviteToken: string, code: string) =>
    http.post<InvitePreview>(`${base}/invites/verify`, { token: inviteToken, code }),

  activateInvite: (inviteToken: string, code: string, email: string, password: string) =>
    http.post<LoginResponse>(`${base}/invites/activate`, {
      token: inviteToken,
      code,
      email,
      password,
    }),

  acceptInvite: (globalToken: string, inviteToken: string, code: string) =>
    http.post<{ accepted: boolean; tenantId: string }>(
      `${base}/invites/accept`,
      { token: inviteToken, code },
      globalToken,
    ),

  // Equipe da oficina
  listTeam: (token: string, signal?: AbortSignal) =>
    http.get<TeamMember[]>(`${base}/team`, token, signal),

  addMember: (token: string, input: TeamMemberInput) =>
    http.post<TeamMemberCreated>(`${base}/team`, input, token),

  updateMember: (
    token: string,
    memberId: string,
    patch: { role: TenantRole } | { status: MemberStatus },
  ) => http.patch<TeamMember>(`${base}/team/${memberId}`, patch, token),

  // Console da plataforma
  listTenants: (token: string, signal?: AbortSignal) =>
    http.get<PlatformTenant[]>(`${base}/platform/tenants`, token, signal),

  createTenant: (token: string, input: PlatformTenantInput) =>
    http.post<PlatformTenantCreated>(`${base}/platform/tenants`, input, token),

  updateTenant: (
    token: string,
    tenantId: string,
    patch: Partial<{ name: string; slug: string; brandColor: string; status: TenantStatus }>,
  ) => http.patch<PlatformTenant>(`${base}/platform/tenants/${tenantId}`, patch, token),

  deleteTenant: (token: string, tenantId: string, confirmSlug: string) =>
    http.del<{ deleted: boolean }>(`${base}/platform/tenants/${tenantId}`, { confirmSlug }, token),
};
