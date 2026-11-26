import { useState, type FormEvent } from 'react';
import { currency, formatDate } from '../../app/format';
import type { Payment } from '../../types/api';

interface PaymentPanelProps {
  approvedTotal: number;
  paid: number;
  outstanding: number;
  payments: Payment[];
  busy: boolean;
  onPay: (amount: number, method: string) => Promise<boolean>;
}

// Pagamento registrado no local pelo financeiro (ADR-014). Não há pagamento online.
export function PaymentPanel({ approvedTotal, paid, outstanding, payments, busy, onPay }: PaymentPanelProps) {
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('');

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void onPay(Number(amount), method.trim()).then((ok) => {
      if (ok) {
        setAmount('');
        setMethod('');
      }
    });
  };

  return (
    <>
      <div className="payment-summary">
        <b>Resumo de pagamento</b>
        <p>Total aprovado: {currency(approvedTotal)}</p>
        <p>Já recebido: {currency(paid)}</p>
        <p>
          Saldo: <strong>{currency(outstanding)}</strong>
        </p>
        {payments.map((payment) => (
          <small className="payment-entry" key={`${payment.created_at}-${payment.amount}`}>
            {currency(payment.amount)} · {payment.method} · {formatDate(payment.created_at)}
          </small>
        ))}
      </div>

      {outstanding > 0.01 && (
        <form className="payment-form" onSubmit={submit}>
          <h3>Registrar pagamento</h3>
          <label className="visually-hidden" htmlFor="payment-amount">
            Valor recebido
          </label>
          <input
            id="payment-amount"
            type="number"
            min="0.01"
            step="0.01"
            max={outstanding.toFixed(2)}
            placeholder="Valor recebido"
            required
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
          />
          <label className="visually-hidden" htmlFor="payment-method">
            Forma de pagamento
          </label>
          <input
            id="payment-method"
            placeholder="Forma (ex.: Pix, dinheiro, cartão)"
            required
            value={method}
            onChange={(event) => setMethod(event.target.value)}
          />
          <button className="secondary" disabled={busy}>
            Adicionar pagamento
          </button>
        </form>
      )}
    </>
  );
}
