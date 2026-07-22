import { cn } from "@/lib/utils";

/**
 * Institute logo. Prefers the logo uploaded in admin settings; falls back to
 * the official SGPI logo shipped with the site (public/sgpi-logo.png).
 */
export function Seal({ src, className }: { src?: string | null; className?: string }) {
  return (
    <img
      src={src || "/sgpi-logo.png"}
      alt="SGPI logo"
      className={cn("h-full w-full object-contain", className)}
      loading="eager"
    />
  );
}
