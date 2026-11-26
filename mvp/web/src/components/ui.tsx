import type { ReactNode } from 'react';
import { Icon, type IconName } from './Icon';
import { orderStatusLabel, estimateStatusLabel } from '../app/format';

/** Logos oficiais servidas de `public/brand/`. Cada SVG já traz as próprias cores. */
const brandFiles = {
  'oficinapro-horizontal': '/brand/oficinapro-logo-horizontal.svg',
  'oficinapro-stacked': '/brand/oficinapro-logo-stacked.svg',
  'garageops-horizontal': '/brand/garageops-logo-horizontal.svg',
  'garageops-horizontal-dark': '/brand/garageops-logo-horizontal-dark.svg',
  'garageops-mark-white': '/brand/garageops-mark-white.svg',
} as const;

export type BrandVariant = keyof typeof brandFiles;

interface BrandProps {
  /** Variante conforme o fundo: as coloridas no claro, `-dark`/`-white` no escuro. */
  variant: BrandVariant;
  /** Altura em pixels; a largura segue a proporção do arquivo. */
  height: number;
  /** Texto alternativo; vazio quando o nome já aparece em texto ao lado. */
  alt?: string;
  className?: string;
}

/** Logo oficial (OficinaPro ou GarageOps) como imagem. */
export function Brand({ variant, height, alt = '', className }: BrandProps) {
  return (
    <img
      className={className ? `brand-logo ${className}` : 'brand-logo'}
      src={brandFiles[variant]}
      alt={alt}
      height={height}
      aria-hidden={alt ? undefined : true}
    />
  );
}

/**
 * Variantes só de apresentação, já estilizadas e prontas para uso:
 * - `denied`: acesso negado (403) — papel sem permissão para a ação;
 * - `expired`: sessão encerrada — aviso informativo na tela de login.
 * Nenhuma tela as usa ainda; habilitá-las depende de decisão sobre a lógica.
 */
export type FeedbackVariant = 'denied' | 'expired';

interface FeedbackProps {
  error?: string;
  notice?: string;
  variant?: FeedbackVariant;
  onDismiss?: () => void;
}

const variantTitle: Record<FeedbackVariant, string> = {
  denied: 'Acesso negado',
  expired: 'Sessão encerrada',
};

/** Aviso de erro ou sucesso, com papel de status para leitores de tela. */
export function Feedback({ error, notice, variant, onDismiss }: FeedbackProps) {
  if (!error && !notice) return null;
  const tone = variant ? `is-${variant}` : error ? 'is-error' : 'is-success';
  const icon: IconName =
    variant === 'denied' ? 'lock' : variant === 'expired' ? 'clock' : error ? 'alert' : 'check';
  return (
    <div className={`feedback ${tone}`} role={error ? 'alert' : 'status'}>
      <Icon name={icon} size={18} className="feedback-icon" />
      <div className="feedback-body">
        {variant && <b>{variantTitle[variant]}</b>}
        <span>{error || notice}</span>
      </div>
      {onDismiss && (
        <button type="button" className="feedback-close" onClick={onDismiss} aria-label="Fechar aviso">
          <Icon name="close" size={16} />
        </button>
      )}
    </div>
  );
}

interface EmptyStateProps {
  title: string;
  detail: string;
  children?: ReactNode;
}

export function EmptyState({ title, detail, children }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <Icon name="search" size={24} />
      <b>{title}</b>
      <p>{detail}</p>
      {children}
    </div>
  );
}

export function Loading({ label = 'Carregando…' }: { label?: string }) {
  return (
    <div className="loading-block" role="status" aria-live="polite">
      <span className="spinner" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

interface StatProps {
  label: string;
  value: number | string;
  icon: IconName;
  tone: 'teal' | 'amber' | 'green' | 'blue';
}

/** Um indicador do painel: rótulo e número, sem animação de contagem. */
export function Stat({ label, value, icon, tone }: StatProps) {
  return (
    <article className={`stat-card tone-${tone}`}>
      <span className="stat-label">
        <Icon name={icon} size={16} className="stat-icon" />
        {label}
      </span>
      <b className="stat-value">{value}</b>
    </article>
  );
}

export function OrderStatusPill({ status }: { status: string }) {
  return <span className={`status-pill ${status}`}>{orderStatusLabel(status)}</span>;
}

export function EstimateStatusPill({ status }: { status: string }) {
  return <span className={`status-pill ${status}`}>{estimateStatusLabel(status)}</span>;
}

interface SectionTitleProps {
  icon: IconName;
  title: string;
  description?: string;
  children?: ReactNode;
  as?: 'h2' | 'h3';
}

/** Cabeçalho de um cartão de conteúdo (ícone + título + descrição + ação opcional). */
export function SectionTitle({ icon, title, description, children, as = 'h2' }: SectionTitleProps) {
  const Heading = as;
  return (
    <div className={`section-title ${children ? 'list-heading' : ''}`}>
      <div>
        <span className="section-icon">
          <Icon name={icon} size={16} />
        </span>
        <div>
          <Heading>{title}</Heading>
          {description && <p>{description}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

interface PageHeadingProps {
  /** Legado: as telas ainda não revisadas passam um eyebrow; o redesign o remove. */
  eyebrow?: string;
  title: string;
  description?: string;
  children?: ReactNode;
}

export function PageHeading({ eyebrow, title, description, children }: PageHeadingProps) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {children}
    </div>
  );
}
