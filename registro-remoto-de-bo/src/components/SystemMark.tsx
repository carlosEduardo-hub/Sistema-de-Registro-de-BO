import { FileText, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

interface SystemMarkProps {
  className?: string;
  showLabel?: boolean;
  size?: "sm" | "md";
}

/** Marca genérica do sistema (sem brasão institucional). */
export function SystemMark({
  className,
  showLabel = true,
  size = "sm",
}: SystemMarkProps) {
  const iconBox = size === "sm" ? "h-9 w-9" : "h-11 w-11";
  const shield = size === "sm" ? "h-5 w-5" : "h-6 w-6";
  const doc = size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3";

  return (
    <div className={cn("flex min-w-0 items-center gap-2.5", className)}>
      <div
        className={cn(
          "relative flex shrink-0 items-center justify-center rounded-lg bg-piaui-blue text-white shadow-sm shadow-piaui-blue/20",
          iconBox,
        )}
        aria-hidden
      >
        <Shield className={shield} strokeWidth={1.75} />
        <FileText
          className={cn(
            "absolute bottom-1 right-1 rounded-[2px] bg-piaui-blue text-piaui-yellow",
            doc,
          )}
          strokeWidth={2.5}
        />
      </div>
      {showLabel ? (
        <div className="min-w-0 leading-tight">
          <p className="truncate text-xs font-semibold text-gray-800">
            Registros e B.O.
          </p>
          <p className="truncate text-[10px] text-gray-500">
            Sistema de ocorrências
          </p>
        </div>
      ) : null}
    </div>
  );
}
