"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XMarkIcon,
} from "@heroicons/react/24/solid";
import { usePathname } from "next/navigation";

type ToastType = "default" | "success" | "error" | "info";
type Toast = { id: string; message: string; type: ToastType; duration: number };
type ToastCtx = {
  showToast: (
    message: string,
    opts?: { type?: ToastType; duration?: number }
  ) => void;
};

const ToastContext = createContext<ToastCtx | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [mounted, setMounted] = useState(false);
  const [portalEl, setPortalEl] = useState<HTMLElement | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
    setPortalEl(document.getElementById("toast-portal"));
  }, []);

  useEffect(() => {
    if (!toasts.length) return;
    setToasts((prev) => prev.map((t) => ({ ...t, duration: 0 })));
  }, [pathname]);

  const showToast = useCallback(
    (message: string, opts?: { type?: ToastType; duration?: number }) => {
      const id = Math.random().toString(36).slice(2);
      const t: Toast = {
        id,
        message,
        type: opts?.type ?? "default",

        duration: Math.max(5000, Math.min(opts?.duration ?? 2600, 8000)),
      };
      setToasts((prev) => [t, ...prev].slice(0, 4));
    },
    []
  );

  const remove = useCallback(
    (id: string) => setToasts((prev) => prev.filter((t) => t.id !== id)),
    []
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {mounted &&
        portalEl &&
        createPortal(
          <div className="pointer-events-none fixed inset-x-0 top-[64px] sm:top-[68px] z-[9999] flex justify-center px-3">
            <div className="flex w-full max-w-[640px] flex-col items-stretch gap-2">
              {toasts.map((t) => (
                <ToastItem key={t.id} toast={t} onClose={() => remove(t.id)} />
              ))}
            </div>
          </div>,
          portalEl
        )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const [leaving, setLeaving] = useState(false);
  const barRef = useRef<HTMLDivElement | null>(null);
  const closeTimer = useRef<number | null>(null);
  const animRef = useRef<Animation | null>(null);

  useEffect(() => {
    if (barRef.current) {
      animRef.current = barRef.current.animate(
        [{ transform: "scaleX(1)" }, { transform: "scaleX(0)" }],
        { duration: toast.duration, easing: "linear", fill: "forwards" }
      );
    }
    closeTimer.current = window.setTimeout(() => {
      setLeaving(true);
      window.setTimeout(onClose, 180);
    }, toast.duration);
    return () => {
      if (closeTimer.current) window.clearTimeout(closeTimer.current);
      if (animRef.current) animRef.current.cancel();
    };
  }, [toast.duration, onClose]);

  const icon =
    toast.type === "success" ? (
      <CheckCircleIcon className="h-5 w-5" />
    ) : toast.type === "error" ? (
      <ExclamationTriangleIcon className="h-5 w-5" />
    ) : (
      <InformationCircleIcon className="h-5 w-5" />
    );

  const tone =
    toast.type === "success"
      ? "from-emerald-500/60 to-emerald-400/40"
      : toast.type === "error"
      ? "from-rose-500/60 to-rose-400/40"
      : toast.type === "info"
      ? "from-sky-500/60 to-sky-400/40"
      : "from-slate-500/50 to-slate-400/40";

  const bar =
    toast.type === "success"
      ? "bg-emerald-500"
      : toast.type === "error"
      ? "bg-rose-500"
      : toast.type === "info"
      ? "bg-sky-500"
      : "bg-slate-500";

  return (
    <div
      className={[
        "pointer-events-auto relative overflow-hidden rounded-2xl backdrop-blur bg-white/70 shadow-lg ring-1 ring-black/5 transition-all duration-200",
        leaving ? "translate-y-[-4px] opacity-0" : "translate-y-0 opacity-100",
      ].join(" ")}
    >
      <div className="absolute inset-0 -z-10 bg-gradient-to-br opacity-50 blur-xl" />
      <div className="flex items-center gap-3 px-4 py-3">
        <div
          className={[
            "flex h-7 w-7 items-center justify-center rounded-full text-white shadow bg-gradient-to-br",
            tone,
          ].join(" ")}
        >
          {icon}
        </div>
        <div className="flex-1 text-sm text-gray-800 leading-snug">
          {toast.message}
        </div>
        <button
          onClick={() => {
            setLeaving(true);
            window.setTimeout(onClose, 150);
          }}
          className="rounded-md p-1 text-gray-500 transition hover:bg-black/5 hover:text-gray-700 active:scale-95"
          aria-label="close"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
      </div>
      <div className="h-1 w-full bg-gray-200/70 overflow-hidden">
        <div
          ref={barRef}
          className={[
            "h-full w-full origin-left will-change-transform",
            bar,
          ].join(" ")}
        />
      </div>
    </div>
  );
}
