import React from "react";
import { cn } from "../../lib/utils";
import { designSystem } from "../../designSystem";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    const variants = {
      default: designSystem.buttons.primary,
      destructive: designSystem.buttons.destructive,
      outline: designSystem.buttons.outline,
      secondary: designSystem.buttons.secondary,
      ghost: designSystem.buttons.ghost,
      link: "text-cyan-400 underline-offset-4 hover:underline",
    };
    const sizes = {
      default: "h-10 px-4 py-2",
      sm: "h-8 px-3 text-sm",
      lg: "h-11 px-8",
      icon: "h-10 w-10",
    };
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-pink-500 disabled:pointer-events-none disabled:opacity-50",
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
export { Button };
