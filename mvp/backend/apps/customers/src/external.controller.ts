import { Controller, Get, Param } from '@nestjs/common';
import { badRequest, notFound, TenantEndpoint, unavailable } from '../../../libs/common/src';
import { normalizeCep, validFipeParams } from './domain';

/**
 * Integrações externas (critério C2): ViaCEP e tabela FIPE.
 * As consultas passam por este serviço; se a API externa falhar, a tela libera o preenchimento manual.
 */
const VIACEP_URL = process.env.VIACEP_URL ?? 'https://viacep.com.br/ws';
const FIPE_URL = process.env.FIPE_URL ?? 'https://parallelum.com.br/fipe/api/v1/carros';
const FIPE_TTL_MS = 24 * 60 * 60 * 1000;
const FIPE_UNAVAILABLE = 'Tabela FIPE indisponível. Preencha marca, modelo e ano manualmente.';
const FIPE_NOT_FOUND = 'Veículo não encontrado na tabela FIPE.';

type Option = { code: string; name: string };
const toOptions = (list: { codigo: string | number; nome: string }[]): Option[] => list.map((item) => ({ code: String(item.codigo), name: item.nome }));

@Controller()
export class ExternalController {
  /** A API pública da FIPE tem limite diário e as listas quase não mudam: cache de 24 horas. */
  private readonly fipeCache = new Map<string, { data: any; until: number }>();

  @Get('address/:cep')
  @TenantEndpoint('tenant_admin', 'attendant', 'mechanic', 'finance', 'customer')
  async address(@Param('cep') raw: string) {
    let cep: string | null;
    try { cep = normalizeCep(raw); } catch { cep = null; }
    if (!cep) throw badRequest('CEP deve conter oito dígitos.');
    let data: any;
    try {
      const response = await fetch(`${VIACEP_URL}/${cep}/json/`, { signal: AbortSignal.timeout(3500) });
      if (!response.ok) throw new Error('viacep');
      data = await response.json();
    } catch {
      throw unavailable('ViaCEP indisponível. Continue com preenchimento manual.', 'VIACEP_UNAVAILABLE');
    }
    if (data?.erro) throw notFound('CEP não encontrado.', 'CEP_NOT_FOUND');
    return { street: data.logradouro, district: data.bairro, city: data.localidade, state: data.uf };
  }

  @Get('fipe/brands')
  @TenantEndpoint('tenant_admin', 'attendant')
  async brands() {
    return toOptions(await this.fipe('/marcas'));
  }

  @Get('fipe/brands/:brand/models')
  @TenantEndpoint('tenant_admin', 'attendant')
  async models(@Param('brand') brand: string) {
    this.checkParams({ brand });
    return toOptions((await this.fipe(`/marcas/${brand}/modelos`)).modelos ?? []);
  }

  @Get('fipe/brands/:brand/models/:model/years')
  @TenantEndpoint('tenant_admin', 'attendant')
  async years(@Param('brand') brand: string, @Param('model') model: string) {
    this.checkParams({ brand, model });
    return toOptions(await this.fipe(`/marcas/${brand}/modelos/${model}/anos`)).map((year) => ({ ...year, name: year.name.replace(/^32000/, 'Zero km') }));
  }

  @Get('fipe/brands/:brand/models/:model/years/:year')
  @TenantEndpoint('tenant_admin', 'attendant')
  async value(@Param('brand') brand: string, @Param('model') model: string, @Param('year') year: string) {
    this.checkParams({ brand, model, year });
    const v = await this.fipe(`/marcas/${brand}/modelos/${model}/anos/${year}`);
    return {
      fipeCode: v.CodigoFipe, brand: v.Marca, model: v.Modelo,
      year: v.AnoModelo === 32000 ? new Date().getFullYear() : v.AnoModelo,
      fuel: v.Combustivel, price: v.Valor, reference: v.MesReferencia,
    };
  }

  private checkParams(params: { brand?: string; model?: string; year?: string }) {
    if (!validFipeParams(params)) throw badRequest('Parâmetro FIPE inválido.');
  }

  private async fipe(path: string): Promise<any> {
    const hit = this.fipeCache.get(path);
    if (hit && hit.until > Date.now()) return hit.data;
    // Uma nova tentativa para falhas passageiras antes de liberar o modo manual.
    let response: Response | null = null;
    for (let attempt = 1; attempt <= 2; attempt++) {
      response = await fetch(`${FIPE_URL}${path}`, { signal: AbortSignal.timeout(6000) }).catch(() => null);
      if (response && (response.ok || response.status === 404 || response.status === 400)) break;
      if (attempt === 1) await new Promise((done) => setTimeout(done, 700));
    }
    if (!response) throw unavailable(FIPE_UNAVAILABLE, 'FIPE_UNAVAILABLE');
    if (response.status === 404 || response.status === 400) throw notFound(FIPE_NOT_FOUND, 'FIPE_NOT_FOUND');
    if (!response.ok) throw unavailable(FIPE_UNAVAILABLE, 'FIPE_UNAVAILABLE');
    const data: any = await response.json().catch(() => null);
    if (!data) throw unavailable(FIPE_UNAVAILABLE, 'FIPE_UNAVAILABLE');
    if (data.error) throw notFound(FIPE_NOT_FOUND, 'FIPE_NOT_FOUND');
    this.fipeCache.set(path, { data, until: Date.now() + FIPE_TTL_MS });
    return data;
  }
}
