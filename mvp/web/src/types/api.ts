// Tipos dos contratos da API do GarageOps.
// Os nomes de campo seguem exatamente o que os microsserviços retornam
// (identity, customers, workorders), em snake_case onde o backend usa snake_case.

export type TenantRole = 'tenant_admin' | 'attendant' | 'mechanic' | 'finance' | 'customer';

export interface UserRef {
  id: string;
  name: string;
  email: string;
}

/** Oficina vinculada à conta (retorno de GET /tenants e de select-office). */
export interface Office {
  id: string;
  name: string;
  slug?: string;
  brand_color?: string;
  roles: TenantRole[];
}

/** Resposta de POST /auth/login. `platform: true` indica administrador da plataforma. */
export interface LoginResponse {
  token: string;
  user: UserRef;
  offices: Office[];
  platform?: boolean;
}

/** Resposta de POST /auth/select-office. */
export interface SelectOfficeResponse {
  token: string;
  office: Office;
}

/** Resposta de GET /auth/me (usada para validar uma sessão de oficina). */
export interface MeResponse {
  user: UserRef;
  tenantId: string | null;
  roles: TenantRole[];
}

// ---- Clientes e veículos ----

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  cep?: string | null;
  street?: string | null;
  address_number?: string | null;
  district?: string | null;
  city?: string | null;
  state?: string | null;
}

export interface Vehicle {
  id: string;
  customer_id: string;
  customer_name?: string;
  plate: string;
  make: string | null;
  model: string | null;
  year: number | null;
  fipe_code?: string | null;
}

export interface CustomerInput {
  name: string;
  phone: string;
  email?: string;
  cep?: string;
  street?: string;
  addressNumber?: string;
  district?: string;
  city?: string;
  state?: string;
}

export interface VehicleInput {
  customerId: string;
  plate: string;
  make: string | null;
  model: string | null;
  year: number | null;
  fipeCode: string | null;
}

/** Endereço retornado pelo ViaCEP via serviço de clientes. */
export interface AddressLookup {
  street?: string;
  district?: string;
  city?: string;
  state?: string;
}

// ---- FIPE ----

export interface FipeOption {
  code: string;
  name: string;
}

export interface FipeYear {
  year: number;
  fipeCode: string;
  price: string;
  reference: string;
  brand: string;
  model: string;
  fuel: string;
}

// ---- Ordens, orçamentos, conversa e pagamentos ----

export type OrderStatus =
  | 'open'
  | 'diagnosis'
  | 'awaiting_approval'
  | 'approved'
  | 'in_progress'
  | 'ready'
  | 'closed'
  | 'closed_refused';

export type EstimateStatus = 'pending' | 'approved' | 'refused' | 'superseded';

export type EstimateItemKind = 'service' | 'part';

/** Linha resumida da lista de ordens (GET /orders). */
export interface OrderSummary {
  id: string;
  status: OrderStatus;
  problem: string;
  opened_at: string;
  vehicle_id: string;
  customer_id?: string;
}

export interface EstimateItem {
  id: string;
  kind: EstimateItemKind;
  description: string;
  quantity: number | string;
  unit_price: number | string;
}

export interface Estimate {
  id: string;
  version: number;
  status: EstimateStatus;
  created_at: string;
  total: number | string;
  items: EstimateItem[];
}

export interface OrderMessage {
  id: string;
  sender_type: string;
  sender_name: string;
  body: string;
  created_at: string;
}

export interface Payment {
  amount: number | string;
  method: string;
  created_at: string;
}

/** Ordem completa (GET /orders/:id). */
export interface OrderDetail extends OrderSummary {
  diagnosis: string | null;
  estimates: Estimate[];
  messages: OrderMessage[];
  payments: Payment[];
}

export interface EstimateItemInput {
  kind: EstimateItemKind;
  description: string;
  quantity: number;
  unitPrice: number;
}

export type Decision = 'approved' | 'refused';

// ---- Convites ----

export interface InviteCreated {
  expiresAt: string;
  activationUrl: string;
  devCode?: string;
}

export interface InvitePreview {
  name: string;
  email: string | null;
}

// ---- Equipe (identidade) ----

export type MemberStatus = 'active' | 'inactive';

export interface TeamMember {
  id: string;
  user_id: string;
  name: string;
  email: string;
  phone: string | null;
  status: MemberStatus;
  roles: TenantRole[];
}

export interface TeamMemberInput {
  name: string;
  email: string;
  phone: string;
  role: Exclude<TenantRole, 'customer'>;
  password?: string;
}

export interface TeamMemberCreated extends TeamMember {
  account: 'existing' | 'created';
}

// ---- Console da plataforma ----

export type TenantStatus = 'active' | 'suspended';

export interface PlatformTenant {
  id: string;
  name: string;
  slug: string;
  brand_color: string;
  status: TenantStatus;
  created_at: string;
  team_accounts: number;
  customer_accounts: number;
}

export interface PlatformTenantInput {
  name: string;
  slug?: string;
  brandColor: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  ownerPassword?: string;
}

export interface PlatformTenantCreated extends PlatformTenant {
  ownerAccount: 'existing' | 'created';
}
