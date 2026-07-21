import { cn } from "@/lib/utils";

/**
 * Institute seal. Renders the uploaded institute logo when available; otherwise
 * a tasteful SVG emblem (gear + open book) so the masthead always reads as an
 * official institution, never a broken image.
 */
export function Seal({ src, className }: { src?: string | null; className?: string }) {
  if (src) {
    return (
      <img
        src={src}
        alt="Institute logo"
        className={cn("h-full w-full rounded-full object-contain", className)}
        loading="eager"
      />
    );
  }
  return (
    <svg viewBox="0 0 100 100" className={cn("h-full w-full", className)} role="img" aria-label="SGPI seal">
      <defs>
        <linearGradient id="sealG" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="hsl(168 82% 24%)" />
          <stop offset="1" stopColor="hsl(168 82% 16%)" />
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="48" fill="url(#sealG)" />
      <circle cx="50" cy="50" r="44" fill="none" stroke="hsl(41 88% 52%)" strokeWidth="1.5" />
      {/* gear teeth */}
      {Array.from({ length: 16 }).map((_, i) => {
        const a = (i / 16) * Math.PI * 2;
        const x1 = 50 + Math.cos(a) * 39;
        const y1 = 50 + Math.sin(a) * 39;
        const x2 = 50 + Math.cos(a) * 44;
        const y2 = 50 + Math.sin(a) * 44;
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="hsl(41 88% 52%)" strokeWidth="2" strokeLinecap="round" />;
      })}
      {/* open book */}
      <path
        d="M28 44c8-4 15-4 22 0 7-4 14-4 22 0v18c-8-4-15-4-22 0-7-4-14-4-22 0V44z"
        fill="hsl(41 88% 56%)"
      />
      <line x1="50" y1="44" x2="50" y2="62" stroke="hsl(168 82% 18%)" strokeWidth="1.5" />
      <text x="50" y="80" textAnchor="middle" fontSize="10" fontWeight="700" fill="hsl(41 88% 60%)" fontFamily="Inter, sans-serif">
        SGPI
      </text>
    </svg>
  );
}
