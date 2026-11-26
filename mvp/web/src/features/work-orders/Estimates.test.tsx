import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EstimateForm } from './Estimates';
import type { EstimateItemInput } from '../../types/api';

function setup() {
  const onSubmit = vi.fn(async (_items: EstimateItemInput[]) => true);
  const onInvalid = vi.fn();
  render(<EstimateForm busy={false} onSubmit={onSubmit} onInvalid={onInvalid} />);
  return { onSubmit, onInvalid };
}

describe('EstimateForm', () => {
  it('avisa e não envia quando a descrição tem só espaços (além do required nativo)', async () => {
    const user = userEvent.setup();
    const { onSubmit, onInvalid } = setup();
    // Espaços passam pelo required do navegador, mas são inválidos após trim.
    await user.type(screen.getByLabelText('Descrição'), '   ');
    await user.type(screen.getByLabelText('Preço unitário'), '150');
    await user.click(screen.getByRole('button', { name: /enviar para aprovação/i }));
    expect(onInvalid).toHaveBeenCalledWith(expect.stringContaining('descrição'));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('envia itens com quantidade e preço convertidos para número', async () => {
    const user = userEvent.setup();
    const { onSubmit } = setup();

    await user.type(screen.getByLabelText('Descrição'), 'Troca de óleo');
    const quantity = screen.getByLabelText('Quantidade');
    await user.clear(quantity);
    await user.type(quantity, '2');
    await user.type(screen.getByLabelText('Preço unitário'), '150');

    await user.click(screen.getByRole('button', { name: /enviar para aprovação/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith([
      { kind: 'service', description: 'Troca de óleo', quantity: 2, unitPrice: 150 },
    ]);
  });

  it('permite adicionar e remover itens do orçamento', async () => {
    const user = userEvent.setup();
    setup();
    expect(screen.getAllByLabelText('Descrição')).toHaveLength(1);

    await user.click(screen.getByRole('button', { name: /adicionar item/i }));
    expect(screen.getAllByLabelText('Descrição')).toHaveLength(2);

    await user.click(screen.getAllByRole('button', { name: /remover item/i })[0]);
    expect(screen.getAllByLabelText('Descrição')).toHaveLength(1);
  });
});
