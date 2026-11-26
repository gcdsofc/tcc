import { http } from './http';
import type { Decision, EstimateItemInput, OrderDetail, OrderSummary } from '../types/api';

const base = '/api/orders';

export const workordersService = {
  listOrders: (token: string, signal?: AbortSignal) =>
    http.get<OrderSummary[]>(`${base}/orders`, token, signal),

  getOrder: (token: string, orderId: string, signal?: AbortSignal) =>
    http.get<OrderDetail>(`${base}/orders/${orderId}`, token, signal),

  createOrder: (token: string, input: { customerId: string; vehicleId: string; problem: string }) =>
    http.post<OrderSummary>(`${base}/orders`, input, token),

  addMessage: (token: string, orderId: string, body: string) =>
    http.post(`${base}/orders/${orderId}/messages`, { body }, token),

  submitEstimate: (token: string, orderId: string, items: EstimateItemInput[]) =>
    http.post(`${base}/orders/${orderId}/estimates`, { items }, token),

  decide: (
    token: string,
    orderId: string,
    estimateId: string,
    decision: Decision,
    reason: string | null = null,
  ) => http.post(`${base}/orders/${orderId}/decision`, { estimateId, decision, reason }, token),

  saveDiagnosis: (token: string, orderId: string, diagnosis: string) =>
    http.post(`${base}/orders/${orderId}/diagnosis`, { diagnosis }, token),

  execute: (token: string, orderId: string, estimateItemId: string) =>
    http.post(`${base}/orders/${orderId}/execute`, { estimateItemId }, token),

  markReady: (token: string, orderId: string) =>
    http.post(`${base}/orders/${orderId}/ready`, {}, token),

  close: (token: string, orderId: string) =>
    http.post(`${base}/orders/${orderId}/close`, {}, token),

  closeRefused: (token: string, orderId: string, reason: string) =>
    http.post(`${base}/orders/${orderId}/close-refused`, { reason }, token),

  addPayment: (token: string, orderId: string, amount: number, method: string) =>
    http.post(`${base}/orders/${orderId}/payments`, { amount, method }, token),
};
