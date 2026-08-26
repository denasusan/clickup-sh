export default function Logo({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} role="img" aria-label="Flowspace">
      <rect width="40" height="40" rx="10" fill="url(#flowspace-logo-gradient)" />
      <rect x="9" y="12" width="6" height="19" rx="2" fill="white" fillOpacity="0.95" />
      <rect x="17" y="8" width="6" height="23" rx="2" fill="white" fillOpacity="0.75" />
      <rect x="25" y="16" width="6" height="15" rx="2" fill="white" fillOpacity="0.55" />
      <defs>
        <linearGradient
          id="flowspace-logo-gradient"
          x1="0"
          y1="0"
          x2="40"
          y2="40"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#4b64f5" />
          <stop offset="1" stopColor="#2f38ae" />
        </linearGradient>
      </defs>
    </svg>
  );
}
