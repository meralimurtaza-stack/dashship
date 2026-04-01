interface Props {
  size?: number;
  className?: string;
}

export function HelmLogo({ size = 18, className = '' }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      className={className}
    >
      <circle cx="32" cy="32" r="16" stroke="currentColor" strokeWidth="2.5" />
      <line x1="32" y1="13" x2="32" y2="51" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="13" y1="32" x2="51" y2="32" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="32" cy="32" r="4" fill="currentColor" />
    </svg>
  );
}
