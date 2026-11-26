// Conjunto enxuto de ícones em SVG (traço, herda a cor do texto via currentColor).
// Mais legível e consistente entre navegadores do que glifos unicode.

export type IconName =
  | 'dashboard'
  | 'clients'
  | 'vehicle'
  | 'invite'
  | 'gear'
  | 'chat'
  | 'check'
  | 'clock'
  | 'plus'
  | 'search'
  | 'arrow'
  | 'shield'
  | 'back'
  | 'logout'
  | 'chevron-down'
  | 'chevron-right'
  | 'chevron-left'
  | 'alert'
  | 'lock'
  | 'mail'
  | 'close';

const paths: Record<IconName, JSX.Element> = {
  dashboard: (
    <>
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </>
  ),
  clients: (
    <>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 19a5.5 5.5 0 0 1 11 0" />
      <path d="M16 6.2a3 3 0 0 1 0 5.6" />
      <path d="M17.5 19a5 5 0 0 0-3-4.6" />
    </>
  ),
  vehicle: (
    <>
      <path d="M3 13.5 4.6 8.4A2.5 2.5 0 0 1 7 6.7h10a2.5 2.5 0 0 1 2.4 1.7L21 13.5" />
      <path d="M3 13.5h18v4a1 1 0 0 1-1 1h-1.5a1 1 0 0 1-1-1v-1H6.5v1a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" />
      <circle cx="7" cy="16" r="0.6" />
      <circle cx="17" cy="16" r="0.6" />
    </>
  ),
  invite: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3.5 7 8.5 6 8.5-6" />
    </>
  ),
  gear: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2.5v2.5M12 19v2.5M4.5 12H2M22 12h-2.5M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M18.4 5.6l-1.8 1.8M7.4 16.6l-1.8 1.8" />
    </>
  ),
  chat: (
    <>
      <path d="M4 5h16a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H9l-4 3.5V16H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z" />
    </>
  ),
  check: <path d="m4.5 12.5 4.5 4.5L19.5 6.5" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m20 20-3.6-3.6" />
    </>
  ),
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
  shield: <path d="M12 3 5 6v5.5c0 4 2.9 6.9 7 8.5 4.1-1.6 7-4.5 7-8.5V6z" />,
  back: <path d="M19 12H5M11 6l-6 6 6 6" />,
  logout: (
    <>
      <path d="M15 5H7a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h8" />
      <path d="M13 12h8M18 9l3 3-3 3" />
    </>
  ),
  'chevron-down': <path d="m6 9 6 6 6-6" />,
  'chevron-right': <path d="m9 6 6 6-6 6" />,
  'chevron-left': <path d="m15 6-6 6 6 6" />,
  alert: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5v5.5M12 16.2v.3" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="10.5" width="14" height="9.5" rx="1.5" />
      <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5M12 14.5v2" />
    </>
  ),
  close: <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />,
  mail: (
    <>
      <rect x="3.5" y="5.5" width="17" height="13" rx="1.5" />
      <path d="m4 7 8 6 8-6" />
    </>
  ),
};

interface IconProps {
  name: IconName;
  size?: number;
  className?: string;
  title?: string;
}

export function Icon({ name, size = 18, className, title }: IconProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
      focusable="false"
    >
      {title ? <title>{title}</title> : null}
      {paths[name]}
    </svg>
  );
}
