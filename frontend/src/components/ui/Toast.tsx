import React from "react";

interface ToastOptions {
  title: string;
  description?: string;
  variant?: "default" | "destructive";
}

const toast = (options: ToastOptions) => {
  // Simple fallback toast using alert for now, or we can integrate with react-hot-toast
  if (options.variant === "destructive") {
    console.error(options.title, options.description);
  } else {
    console.log(options.title, options.description);
  }
  // Dispatch custom event that a ToastProvider could listen to
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("app-toast", { detail: options }));
  }
};

const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = React.useState<(ToastOptions & { id: number })[]>([]);

  React.useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<ToastOptions>).detail;
      const id = Date.now();
      setToasts((prev) => [...prev, { ...detail, id }]);
      setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
    };
    window.addEventListener("app-toast", handler);
    return () => window.removeEventListener("app-toast", handler);
  }, []);

  return (
    <>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`rounded-lg border px-4 py-3 shadow-lg ${
              t.variant === "destructive"
                ? "border-red-200 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-100"
                : "border-slate-200 bg-white text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
            }`}
          >
            <div className="font-semibold text-sm">{t.title}</div>
            {t.description && <div className="text-xs opacity-90">{t.description}</div>}
          </div>
        ))}
      </div>
    </>
  );
};

export { toast, ToastProvider };
