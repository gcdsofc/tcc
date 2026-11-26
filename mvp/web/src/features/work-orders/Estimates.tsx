import { useState, type FormEvent } from 'react';
import { currency, estimateStatusLabel, formatDateTime } from '../../app/format';
import { EstimateStatusPill } from '../../components/ui';
import { Icon } from '../../components/Icon';
import type { Decision, Estimate, EstimateItemInput } from '../../types/api';

interface EstimateCardProps {
  estimate: Estimate;
  canDecide: boolean;
  busy: boolean;
  onDecide: (decision: Decision, estimateId: string, reason: string | null) => Promise<boolean>;
}

export function EstimateCard({ estimate, canDecide, busy, onDecide }: EstimateCardProps) {
  const [refusing, setRefusing] = useState(false);
  const [reason, setReason] = useState('');

  const refuse = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void onDecide('refused', estimate.id, reason || null).then((ok) => {
      if (ok) {
        setRefusing(false);
        setReason('');
      }
    });
  };

  return (
    <article className="estimate-card">
      <div className="estimate-title">
        <div>
          <b>Orçamento · versão {estimate.version}</b>
          <small>{formatDateTime(estimate.created_at)}</small>
        </div>
        <EstimateStatusPill status={estimate.status} />
      </div>

      {estimate.items?.map((item) => (
        <div className="estimate-line" key={item.id}>
          <span>
            {item.description}
            <small>
              {item.kind === 'part' ? 'Peça informada manualmente' : 'Serviço'} · {item.quantity} ×{' '}
              {currency(item.unit_price)}
            </small>
          </span>
          <b>{currency(Number(item.quantity) * Number(item.unit_price))}</b>
        </div>
      ))}

      <div className="estimate-total">
        <span>Total</span>
        <b>{currency(estimate.total)}</b>
      </div>

      {canDecide && estimate.status === 'pending' && !refusing && (
        <div className="decision-actions">
          <button
            type="button"
            className="primary"
            disabled={busy}
            onClick={() => void onDecide('approved', estimate.id, null)}
          >
            Aprovar orçamento
          </button>
          <button
            type="button"
            className="danger-button"
            disabled={busy}
            onClick={() => {
              setRefusing(true);
              setReason('');
            }}
          >
            Recusar e conversar
          </button>
        </div>
      )}

      {canDecide && estimate.status === 'pending' && refusing && (
        <form className="decision-form" onSubmit={refuse}>
          <label>
            Motivo da recusa <span className="optional">Opcional</span>
            <textarea
              value={reason}
              maxLength={1000}
              placeholder="Explique o que precisa ser revisto ou deixe em branco para conversar depois."
              onChange={(event) => setReason(event.target.value)}
            />
          </label>
          <div className="decision-actions">
            <button type="button" className="secondary" onClick={() => setRefusing(false)}>
              Voltar
            </button>
            <button type="submit" className="danger-button" disabled={busy}>
              {busy ? 'Registrando…' : 'Confirmar recusa'}
            </button>
          </div>
        </form>
      )}
    </article>
  );
}

interface ItemRow {
  kind: 'service' | 'part';
  description: string;
  quantity: string;
  unitPrice: string;
}

const emptyRow: ItemRow = { kind: 'service', description: '', quantity: '1', unitPrice: '' };

interface EstimateFormProps {
  busy: boolean;
  onSubmit: (items: EstimateItemInput[]) => Promise<boolean>;
  onInvalid: (message: string) => void;
}

export function EstimateForm({ busy, onSubmit, onInvalid }: EstimateFormProps) {
  const [items, setItems] = useState<ItemRow[]>([{ ...emptyRow }]);

  const patch = (index: number, change: Partial<ItemRow>) =>
    setItems((current) => current.map((row, i) => (i === index ? { ...row, ...change } : row)));

  const total = items.reduce(
    (sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0),
    0,
  );

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const mapped: EstimateItemInput[] = items.map((item) => ({
      kind: item.kind,
      description: item.description.trim(),
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
    }));
    const invalid = mapped.some(
      (item) =>
        !item.description ||
        !Number.isFinite(item.quantity) ||
        item.quantity <= 0 ||
        !Number.isFinite(item.unitPrice) ||
        item.unitPrice < 0,
    );
    if (!mapped.length || invalid) {
      onInvalid('Preencha a descrição, a quantidade e o preço de cada item do orçamento.');
      return;
    }
    void onSubmit(mapped).then((ok) => {
      if (ok) setItems([{ ...emptyRow }]);
    });
  };

  return (
    <form className="estimate-form" onSubmit={submit}>
      <h3>Preparar orçamento</h3>
      <p>Inclua cada serviço ou peça manualmente. O cliente poderá aprovar ou recusar esta versão.</p>
      <div className="estimate-item-list">
        {items.map((item, index) => (
          <div className="estimate-item-row" key={index}>
            <label>
              Tipo
              <select value={item.kind} onChange={(event) => patch(index, { kind: event.target.value as ItemRow['kind'] })}>
                <option value="service">Serviço</option>
                <option value="part">Peça</option>
              </select>
            </label>
            <label>
              Descrição
              <input
                value={item.description}
                maxLength={240}
                placeholder={item.kind === 'part' ? 'Ex.: pastilha de freio' : 'Ex.: mão de obra'}
                onChange={(event) => patch(index, { description: event.target.value })}
                required
              />
            </label>
            <label>
              Quantidade
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={item.quantity}
                onChange={(event) => patch(index, { quantity: event.target.value })}
                required
              />
            </label>
            <label>
              Preço unitário
              <input
                type="number"
                min="0"
                step="0.01"
                value={item.unitPrice}
                onChange={(event) => patch(index, { unitPrice: event.target.value })}
                required
              />
            </label>
            <button
              type="button"
              className="remove-estimate-item"
              disabled={items.length === 1}
              onClick={() => setItems((current) => current.filter((_, i) => i !== index))}
              aria-label="Remover item"
            >
              Remover
            </button>
          </div>
        ))}
      </div>
      <div className="estimate-form-actions">
        <button
          type="button"
          className="secondary"
          disabled={items.length >= 30}
          onClick={() => setItems((current) => [...current, { ...emptyRow }])}
        >
          <Icon name="plus" size={14} /> Adicionar item
        </button>
        <span>
          Total estimado <b>{currency(total)}</b>
        </span>
      </div>
      <button className="primary" disabled={busy}>
        {busy ? 'Enviando orçamento…' : 'Enviar para aprovação'}
      </button>
    </form>
  );
}

export { estimateStatusLabel };
