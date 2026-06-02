import React from "react";
import { cn } from "../../lib/utils";
import { designSystem } from "../../designSystem";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "secondary" | "destructive" | "outline";
}

const Badge: React.FC<BadgeProps> = ({ className, variant = "default", ...props }) => {
  const variants = {
    default: designSystem.statusBadge.draft,
    secondary: "bg-[#140f29] text-zinc-400 border border-fuchsia-950",
    destructive: "bg-[#3a0c1a] text-red-300 border border-red-500/30",
    outline: "border border-fuchsia-950 text-zinc-300 bg-transparent",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded border px-2 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-1 focus:ring-pink-500",
        variants[variant],
        className
      )}
      {...props}
    />
  );
};

export { Badge };
