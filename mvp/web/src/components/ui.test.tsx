import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EmptyState, Feedback, OrderStatusPill, Stat } from './ui';

describe('Feedback', () => {
  it('mostra erro com papel de alerta', () => {
    render(<Feedback error="Falhou" />);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Falhou');
  });

  it('mostra aviso com papel de status e permite fechar', async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();
    render(<Feedback notice="Salvo" onDismiss={onDismiss} />);
    expect(screen.getByRole('status')).toHaveTextContent('Salvo');
    await user.click(screen.getByRole('button', { name: /fechar aviso/i }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('variante de acesso negado: título próprio, papel de alerta e estilo dedicado', () => {
    render(<Feedback error="Seu papel não permite esta ação." variant="denied" />);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveClass('feedback', 'is-denied');
    expect(alert).toHaveTextContent('Acesso negado');
    expect(alert).toHaveTextContent('Seu papel não permite esta ação.');
  });

  it('variante de sessão encerrada: aviso informativo com papel de status', () => {
    render(<Feedback notice="Entre novamente para continuar." variant="expired" />);
    const status = screen.getByRole('status');
    expect(status).toHaveClass('feedback', 'is-expired');
    expect(status).toHaveTextContent('Sessão encerrada');
  });

  it('não renderiza nada sem mensagem', () => {
    const { container } = render(<Feedback />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('EmptyState', () => {
  it('mostra título e detalhe', () => {
    render(<EmptyState title="Sem dados" detail="Cadastre o primeiro." />);
    expect(screen.getByText('Sem dados')).toBeInTheDocument();
    expect(screen.getByText('Cadastre o primeiro.')).toBeInTheDocument();
  });
});

describe('Stat', () => {
  it('mostra o valor final para leitores de tela e o rótulo', () => {
    render(<Stat label="Ordens em aberto" value={12} icon="dashboard" tone="teal" />);
    expect(screen.getByText('Ordens em aberto')).toBeInTheDocument();
    expect(screen.getAllByText('12').length).toBeGreaterThan(0);
  });
});

describe('OrderStatusPill', () => {
  it('traduz o status e aplica a classe correspondente', () => {
    render(<OrderStatusPill status="awaiting_approval" />);
    const pill = screen.getByText('Aguardando aprovação');
    expect(pill).toHaveClass('status-pill', 'awaiting_approval');
  });
});
