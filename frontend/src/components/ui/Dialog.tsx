import React from "react";
import { cn } from "../../lib/utils";
import { designSystem } from "../../designSystem";

interface DialogProps {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

const Dialog: React.FC<DialogProps> = ({ open, onOpenChange, children }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/70 backdrop-blur-xs" onClick={() => onOpenChange?.(false)} />
      <div className={cn(designSystem.dialogContent)}>
        {children}
      </div>
    </div>
  );
};

const DialogHeader: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <div className={cn(designSystem.dialogHeader, className)}>
    {children}
  </div>
);

const DialogTitle: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <h2 className={cn(designSystem.dialogTitle, className)}>{children}</h2>
);

const DialogFooter: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <div className={cn(designSystem.dialogFooter, className)}>
    {children}
  </div>
);

export { Dialog, DialogHeader, DialogTitle, DialogFooter };
