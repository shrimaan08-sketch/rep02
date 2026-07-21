export function LogoMark({ className = "" }: { className?: string }) {
  // Revion mark: an interlocking "change/revision" glyph — two arcs forming
  // a stylized R / rotation motif, echoing revision cycles.
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="url(#revion-g)" />
      <path
        d="M11 22V10h6.2c2.5 0 4.3 1.6 4.3 4 0 1.9-1.1 3.3-2.9 3.8L22 22h-3.3l-2.9-3.8H14V22h-3Zm3-6.4h3c1 0 1.7-.6 1.7-1.5S18 12.6 17 12.6h-3v3Z"
        fill="#fff"
      />
      <defs>
        <linearGradient id="revion-g" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2EC0F0" />
          <stop offset="1" stopColor="#0A6B97" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function LogoMarkMono({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="8" className="fill-azure-500/15" />
      <path
        d="M11 22V10h6.2c2.5 0 4.3 1.6 4.3 4 0 1.9-1.1 3.3-2.9 3.8L22 22h-3.3l-2.9-3.8H14V22h-3Zm3-6.4h3c1 0 1.7-.6 1.7-1.5S18 12.6 17 12.6h-3v3Z"
        className="fill-azure-300"
      />
    </svg>
  );
}

export function Wordmark({ className = "", showMark = true }: { className?: string; showMark?: boolean }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {showMark && <LogoMark className="h-7 w-7" />}
      <span className="font-display text-[17px] font-600 font-semibold tracking-tight text-white">
        Revion
      </span>
    </div>
  );
}
