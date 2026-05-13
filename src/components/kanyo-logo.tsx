import { cn } from "@/lib/utils";

type KanyoLogoProps = {
  className?: string;
  markClassName?: string;
  showWordmark?: boolean;
};

export function KanyoLogo({ className, markClassName, showWordmark = true }: KanyoLogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span
        className={cn(
          "grid h-8 w-8 place-items-center rounded-md bg-primary text-primary-foreground shadow-sm shadow-primary/20",
          markClassName,
        )}
        aria-hidden="true"
      >
        <svg viewBox="0 0 32 32" className="h-5 w-5" role="img">
          <path
            d="M8 24V8h4.2v6.45L19.55 8H25l-8.35 7.22L25.4 24h-5.7l-6.05-6.2-1.45 1.25V24H8Z"
            fill="currentColor"
          />
          <path d="M20.7 6.4h4.8v4.8h-4.8z" fill="currentColor" opacity="0.78" />
        </svg>
      </span>
      {showWordmark ? <span className="font-display font-semibold">kanyoai</span> : null}
    </span>
  );
}
