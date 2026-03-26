import type { CSSProperties } from 'react';

type IconName =
  | 'constellation'
  | 'map'
  | 'dispatch'
  | 'dashboard'
  | 'intake'
  | 'volunteer'
  | 'spark'
  | 'csr'
  | 'civic'
  | 'crisis'
  | 'network'
  | 'clock'
  | 'shield'
  | 'pin'
  | 'layers'
  | 'filter'
  | 'alert'
  | 'route'
  | 'check';

type AppIconProps = {
  name: IconName;
  size?: number;
  strokeWidth?: number;
  className?: string;
  style?: CSSProperties;
};

const iconPaths: Record<IconName, JSX.Element> = {
  constellation: (
    <>
      <circle cx="6" cy="6" r="2.2" />
      <circle cx="18" cy="5" r="2.2" />
      <circle cx="11" cy="16" r="2.2" />
      <circle cx="21" cy="18" r="2.2" />
      <path d="M7.8 7.3 16.1 5.6M8.2 7.8l2.7 6M12.9 15.4l6.2 2" />
    </>
  ),
  map: (
    <>
      <path d="M4 6.2 9 4l6 2.1L20 4v13.8l-5 2.2-6-2.1L4 20z" />
      <path d="M9 4v13.8M15 6.1V20" />
    </>
  ),
  dispatch: (
    <>
      <path d="M4 18h8l8-8-4-4-8 8v4Z" />
      <path d="M14 6l4 4M6 18l3-3" />
    </>
  ),
  dashboard: (
    <>
      <rect x="4" y="4" width="7" height="7" rx="1.8" />
      <rect x="13" y="4" width="7" height="4" rx="1.8" />
      <rect x="13" y="10" width="7" height="10" rx="1.8" />
      <rect x="4" y="13" width="7" height="7" rx="1.8" />
    </>
  ),
  intake: (
    <>
      <path d="M12 4v10" />
      <path d="m7.5 9 4.5 5 4.5-5" />
      <path d="M5 19h14" />
    </>
  ),
  volunteer: (
    <>
      <path d="M12 13c2.8 0 5-2.4 5-5.3S14.8 2.5 12 2.5 7 4.9 7 7.7 9.2 13 12 13Z" />
      <path d="M4 20c1.4-3.7 4.1-5.5 8-5.5s6.6 1.8 8 5.5" />
    </>
  ),
  spark: (
    <>
      <path d="M12 3 13.8 10.2 21 12l-7.2 1.8L12 21l-1.8-7.2L3 12l7.2-1.8z" />
    </>
  ),
  csr: (
    <>
      <path d="M12 20s-7-4.2-7-10.2A4.3 4.3 0 0 1 9.3 5c1.2 0 2.1.5 2.7 1.5.6-1 1.5-1.5 2.7-1.5A4.3 4.3 0 0 1 19 9.8C19 15.8 12 20 12 20Z" />
    </>
  ),
  civic: (
    <>
      <path d="M4 9.5 12 4l8 5.5" />
      <path d="M6.5 9.5V20M11 9.5V20M17.5 9.5V20M4 20h16" />
    </>
  ),
  crisis: (
    <>
      <path d="M12 3 21 20H3z" />
      <path d="M12 9v4.8M12 17.5h.01" />
    </>
  ),
  network: (
    <>
      <circle cx="6" cy="12" r="2.3" />
      <circle cx="18" cy="6" r="2.3" />
      <circle cx="18" cy="18" r="2.3" />
      <path d="M8.1 11 15.9 7M8.1 13l7.8 4" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 7.5v5l3 1.8" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3 19 5.8v5.5c0 4.4-2.8 7.4-7 9.7-4.2-2.3-7-5.3-7-9.7V5.8z" />
    </>
  ),
  pin: (
    <>
      <path d="M12 20s5.5-5.7 5.5-10A5.5 5.5 0 1 0 6.5 10C6.5 14.3 12 20 12 20Z" />
      <circle cx="12" cy="10" r="2.1" />
    </>
  ),
  layers: (
    <>
      <path d="m12 4 8 4-8 4-8-4 8-4ZM4 12l8 4 8-4M4 16l8 4 8-4" />
    </>
  ),
  filter: (
    <>
      <path d="M4 6h16M7.5 12h9M10 18h4" />
    </>
  ),
  alert: (
    <>
      <path d="M12 4.2a5 5 0 0 1 5 5v2.6l1.8 3.4H5.2L7 11.8V9.2a5 5 0 0 1 5-5Z" />
      <path d="M10 18a2.2 2.2 0 0 0 4 0" />
    </>
  ),
  route: (
    <>
      <circle cx="6" cy="17" r="2.3" />
      <circle cx="18" cy="7" r="2.3" />
      <path d="M8.2 15.8C9.7 13 10 11.3 10 10c0-2.1 1.2-4.2 5.8-4.2" />
    </>
  ),
  check: (
    <>
      <path d="m5 12.5 4.2 4.2L19 7" />
    </>
  ),
};

export function AppIcon({ name, size = 24, strokeWidth = 1.7, className, style }: AppIconProps) {
  return (
    <svg
      className={className}
      style={style}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {iconPaths[name]}
    </svg>
  );
}

export default AppIcon;
