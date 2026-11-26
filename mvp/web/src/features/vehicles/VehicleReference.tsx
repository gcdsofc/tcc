import { useEffect, useState } from 'react';
import { ApiError } from '../../services/http';
import { customersService } from '../../services/customers';
import type { FipeOption } from '../../types/api';

export interface VehicleRef {
  mode: 'fipe' | 'manual';
  brandCode: string;
  brand: string;
  modelCode: string;
  model: string;
  yearCode: string;
  year: string;
  fipeCode: string;
  price: string;
  reference: string;
}

export const emptyVehicleRef: VehicleRef = {
  mode: 'fipe',
  brandCode: '',
  brand: '',
  modelCode: '',
  model: '',
  yearCode: '',
  year: '',
  fipeCode: '',
  price: '',
  reference: '',
};

interface Status {
  tone: '' | 'loading' | 'ok' | 'error';
  text: string;
}

interface Props {
  token: string;
  value: VehicleRef;
  onChange: (next: VehicleRef) => void;
}

// Marca, modelo e ano pela tabela FIPE (integração externa C2), com preenchimento
// manual quando a API falha (503) ou o veículo não consta.
export function VehicleReference({ token, value, onChange }: Props) {
  const [brands, setBrands] = useState<FipeOption[]>([]);
  const [models, setModels] = useState<FipeOption[]>([]);
  const [years, setYears] = useState<FipeOption[]>([]);
  const [status, setStatus] = useState<Status>({ tone: '', text: '' });

  const set = (patch: Partial<VehicleRef>) => onChange({ ...value, ...patch });

  const fail = (error: unknown) => {
    const message = error instanceof Error ? error.message : 'Falha na consulta à FIPE.';
    if (error instanceof ApiError && error.status === 503) {
      onChange({ ...value, mode: 'manual' });
      setStatus({ tone: 'error', text: message });
    } else {
      setStatus({ tone: 'error', text: message });
    }
  };

  useEffect(() => {
    if (value.mode !== 'fipe' || brands.length) return;
    setStatus({ tone: 'loading', text: 'Carregando marcas da tabela FIPE…' });
    customersService
      .fipeBrands(token)
      .then((list) => {
        setBrands(list);
        setStatus({ tone: '', text: '' });
      })
      .catch(fail);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.mode]);

  // Limpa as listas quando o formulário é reiniciado após salvar.
  useEffect(() => {
    if (!value.brand) {
      setModels([]);
      setYears([]);
    }
  }, [value.brand]);

  const chooseBrand = (name: string) => {
    const found = brands.find((item) => item.name.toLowerCase() === name.trim().toLowerCase());
    set({
      brand: name,
      brandCode: found?.code || '',
      modelCode: '',
      model: '',
      yearCode: '',
      year: '',
      fipeCode: '',
      price: '',
    });
    setModels([]);
    setYears([]);
    if (!found) return;
    setStatus({ tone: 'loading', text: `Carregando modelos ${found.name}…` });
    customersService
      .fipeModels(token, found.code)
      .then((list) => {
        setModels(list);
        setStatus({ tone: '', text: '' });
      })
      .catch(fail);
  };

  const chooseModel = (name: string) => {
    const found = models.find((item) => item.name.toLowerCase() === name.trim().toLowerCase());
    set({ model: name, modelCode: found?.code || '', yearCode: '', year: '', fipeCode: '', price: '' });
    setYears([]);
    if (!found) return;
    setStatus({ tone: 'loading', text: 'Carregando anos disponíveis…' });
    customersService
      .fipeYears(token, value.brandCode, found.code)
      .then((list) => {
        setYears(list);
        setStatus({ tone: '', text: '' });
      })
      .catch(fail);
  };

  const chooseYear = (code: string) => {
    set({ yearCode: code, year: '', fipeCode: '', price: '' });
    if (!code) return;
    setStatus({ tone: 'loading', text: 'Consultando a tabela FIPE…' });
    customersService
      .fipeYear(token, value.brandCode, value.modelCode, code)
      .then((found) => {
        set({
          yearCode: code,
          year: String(found.year),
          fipeCode: found.fipeCode,
          price: found.price,
          reference: found.reference,
          brand: found.brand,
          model: found.model,
        });
        setStatus({
          tone: 'ok',
          text: `Código FIPE ${found.fipeCode} · ${found.fuel} · valor de referência ${found.price} (${found.reference.trim()})`,
        });
      })
      .catch(fail);
  };

  if (value.mode === 'manual') {
    return (
      <fieldset className="vehicle-ref">
        <legend>
          Marca, modelo e ano <span className="optional">Preenchimento manual</span>
        </legend>
        <label>
          Marca
          <input
            maxLength={60}
            placeholder="Ex.: Honda"
            value={value.brand}
            onChange={(event) => set({ brand: event.target.value })}
          />
        </label>
        <label>
          Modelo
          <input
            maxLength={120}
            placeholder="Ex.: Civic EXL 2.0"
            value={value.model}
            onChange={(event) => set({ model: event.target.value })}
          />
        </label>
        <label>
          Ano
          <input
            type="number"
            min={1950}
            max={2099}
            placeholder="2022"
            value={value.year}
            onChange={(event) => set({ year: event.target.value })}
          />
        </label>
        {status.text && (
          <p className={`cep-status ${status.tone}`} role="status">
            {status.text}
          </p>
        )}
        <button
          type="button"
          className="inline-link"
          onClick={() => {
            setStatus({ tone: '', text: '' });
            onChange({ ...emptyVehicleRef });
          }}
        >
          Usar a tabela FIPE
        </button>
      </fieldset>
    );
  }

  return (
    <fieldset className="vehicle-ref">
      <legend>
        Marca, modelo e ano <span className="optional">Tabela FIPE · digite para buscar</span>
      </legend>
      <label>
        Marca
        <input
          list="fipe-brands"
          placeholder="Digite a marca"
          value={value.brand}
          onChange={(event) => chooseBrand(event.target.value)}
        />
        <datalist id="fipe-brands">
          {brands.map((item) => (
            <option key={item.code} value={item.name} />
          ))}
        </datalist>
      </label>
      <label>
        Modelo
        <input
          list="fipe-models"
          placeholder={value.brandCode ? 'Digite o modelo' : 'Escolha a marca primeiro'}
          disabled={!value.brandCode}
          value={value.model}
          onChange={(event) => chooseModel(event.target.value)}
        />
        <datalist id="fipe-models">
          {models.map((item) => (
            <option key={item.code} value={item.name} />
          ))}
        </datalist>
      </label>
      <label>
        Ano
        <select
          disabled={!years.length}
          value={value.yearCode}
          onChange={(event) => chooseYear(event.target.value)}
        >
          <option value="">{years.length ? 'Selecione o ano' : 'Escolha o modelo'}</option>
          {years.map((item) => (
            <option key={item.code} value={item.code}>
              {item.name}
            </option>
          ))}
        </select>
      </label>
      {status.text && (
        <p className={`cep-status ${status.tone}`} role="status">
          {status.text}
        </p>
      )}
      <button
        type="button"
        className="inline-link"
        onClick={() => {
          setStatus({ tone: '', text: '' });
          onChange({ ...emptyVehicleRef, mode: 'manual', brand: value.brand, model: value.model });
        }}
      >
        Não encontrei o veículo: digitar manualmente
      </button>
    </fieldset>
  );
}
