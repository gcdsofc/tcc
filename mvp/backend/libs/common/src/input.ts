// Leitura defensiva do corpo da requisição: o navegador pode mandar qualquer coisa.
export type Body = Record<string, unknown>;

export const text = (value: unknown, max = 1000): string => String(value ?? '').trim().slice(0, max);
export const optionalText = (value: unknown, max = 1000): string | null => text(value, max) || null;
export const asBody = (value: unknown): Body => (value && typeof value === 'object' && !Array.isArray(value) ? (value as Body) : {});
export const isUuid = (value: unknown): value is string =>
  typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
