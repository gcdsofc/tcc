import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';
import { SessionProvider } from './app/session';

describe('App (fumaça)', () => {
  it('monta e mostra a tela de login quando não há sessão salva', () => {
    render(
      <SessionProvider>
        <App />
      </SessionProvider>,
    );
    expect(screen.getByRole('heading', { name: /bem-vindo de volta/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /entrar no sistema/i })).toBeInTheDocument();
  });
});
