import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "center",
  action,
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: string;
  align?: "center" | "left";
  action?: ReactNode;
}) {
  const centered = align === "center";
  return (
    <div
      className={cn(
        "mb-10 flex flex-col gap-3",
        centered ? "items-center text-center" : "items-start text-left",
        action && !centered && "sm:flex-row sm:items-end sm:justify-between",
      )}
    >
      <div className={cn("flex flex-col gap-3", centered ? "items-center" : "items-start")}>
        {eyebrow && (
          <span className="eyebrow">
            <span className="h-px w-6 bg-accent" /> {eyebrow}
          </span>
        )}
        <h2 className="heading-serif text-3xl leading-tight text-foreground sm:text-4xl lg:text-[2.75rem] text-balance">
          {title}
        </h2>
        {description && (
          <p className={cn("max-w-2xl text-muted-foreground", centered && "mx-auto")}>{description}</p>
        )}
        {centered && <span className="mt-1 h-0.5 w-24 rounded-full bg-gradient-to-r from-transparent via-accent to-transparent" />}
      </div>
      {action}
    </div>
  );
}
