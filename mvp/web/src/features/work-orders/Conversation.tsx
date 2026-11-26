import { useState, type FormEvent } from 'react';
import { formatDateTime } from '../../app/format';
import { SectionTitle } from '../../components/ui';
import type { OrderMessage } from '../../types/api';

interface ConversationProps {
  messages: OrderMessage[];
  canMessage: boolean;
  closed: boolean;
  busy: boolean;
  onSend: (body: string) => Promise<boolean>;
}

export function Conversation({ messages, canMessage, closed, busy, onSend }: ConversationProps) {
  const [body, setBody] = useState('');

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void onSend(body.trim()).then((ok) => {
      if (ok) setBody('');
    });
  };

  return (
    <>
      <SectionTitle icon="chat" title="Conversa" description="Mensagens registradas nesta ordem." />
      <div className="message-list">
        {messages.map((message) => (
          <article
            className={`message ${message.sender_type === 'customer' ? 'from-customer' : ''}`}
            key={message.id}
          >
            <b>{message.sender_name}</b>
            <time>{formatDateTime(message.created_at)}</time>
            <p>{message.body}</p>
          </article>
        ))}
        {!messages.length && <p className="empty-note">Ainda não há mensagens.</p>}
      </div>
      {canMessage && !closed && (
        <form className="message-form" onSubmit={submit}>
          <label className="visually-hidden" htmlFor="message-body">
            Mensagem
          </label>
          <textarea
            id="message-body"
            placeholder="Escreva uma mensagem..."
            maxLength={4000}
            required
            value={body}
            onChange={(event) => setBody(event.target.value)}
          />
          <button className="primary" disabled={busy}>
            {busy ? 'Enviando…' : 'Enviar mensagem'}
          </button>
        </form>
      )}
    </>
  );
}
