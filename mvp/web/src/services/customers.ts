import { http } from './http';
import type {
  AddressLookup,
  Customer,
  CustomerInput,
  FipeOption,
  FipeYear,
  Vehicle,
  VehicleInput,
} from '../types/api';

const base = '/api/customers';

export const customersService = {
  listCustomers: (token: string, signal?: AbortSignal) =>
    http.get<Customer[]>(`${base}/customers`, token, signal),

  createCustomer: (token: string, input: CustomerInput) =>
    http.post<Customer>(`${base}/customers`, input, token),

  listVehicles: (token: string, signal?: AbortSignal) =>
    http.get<Vehicle[]>(`${base}/vehicles`, token, signal),

  createVehicle: (token: string, input: VehicleInput) =>
    http.post<Vehicle>(`${base}/vehicles`, input, token),

  // Integração externa: ViaCEP pelo serviço de clientes.
  lookupAddress: (token: string, cep: string) =>
    http.get<AddressLookup>(`${base}/address/${cep}`, token),

  // Integração externa: tabela FIPE pelo serviço de clientes (com cache no backend).
  fipeBrands: (token: string, signal?: AbortSignal) =>
    http.get<FipeOption[]>(`${base}/fipe/brands`, token, signal),

  fipeModels: (token: string, brandCode: string) =>
    http.get<FipeOption[]>(`${base}/fipe/brands/${brandCode}/models`, token),

  fipeYears: (token: string, brandCode: string, modelCode: string) =>
    http.get<FipeOption[]>(`${base}/fipe/brands/${brandCode}/models/${modelCode}/years`, token),

  fipeYear: (token: string, brandCode: string, modelCode: string, yearCode: string) =>
    http.get<FipeYear>(
      `${base}/fipe/brands/${brandCode}/models/${modelCode}/years/${yearCode}`,
      token,
    ),
};
