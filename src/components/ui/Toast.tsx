"use client";

import { CheckCircle, Info, WarningCircle, X } from "@phosphor-icons/react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import styles from "./toast.module.css";

type Tone = "success" | "info" | "error";

export interface ToastOptions {
  message: string;
  detail?: string;
  tone?: Tone;
  action?: { label: string; onClick: () => void };
  /** Milliseconds before auto-dismiss. */
  duration?: number;
}

interface ToastState extends ToastOptions {
  id: number;
}

const ToastContext = createContext<((options: ToastOptions) => void) | null>(null);

const ICONS: Record<Tone, ReactNode> = {
  success: <CheckCircle size={16} weight="fill" aria-hidden />,
  info: <Info size={16} weight="fill" aria-hidden />,
  error: <WarningCircle size={16} weight="fill" aria-hidden />,
};

/** One quiet toast at a time; a new one replaces the old. Announced politely. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const [hovered, setHovered] = useState(false);
  const counter = useRef(0);

  const show = useCallback((options: ToastOptions) => {
    counter.current += 1;
    setToast({ tone: "success", duration: 2600, ...options, id: counter.current });
  }, []);

  useEffect(() => {
    if (!toast || hovered) return;
    const timer = window.setTimeout(() => setToast(null), toast.duration);
    return () => window.clearTimeout(timer);
  }, [toast, hovered]);

  const value = useMemo(() => show, [show]);
  const tone = toast?.tone ?? "success";

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className={styles.region} aria-live="polite" aria-atomic="true">
        {toast && (
          <div
            key={toast.id}
            className={styles.toast}
            data-tone={tone}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            onFocus={() => setHovered(true)}
            onBlur={() => setHovered(false)}
          >
            <span className={styles.icon}>{ICONS[tone]}</span>
            <div className={styles.body}>
              <p className={styles.message}>{toast.message}</p>
              {toast.detail && <p className={styles.detail}>{toast.detail}</p>}
            </div>
            {toast.action && (
              <button
                type="button"
                className={styles.action}
                onClick={() => {
                  toast.action?.onClick();
                }}
              >
                {toast.action.label}
              </button>
            )}
            <button
              type="button"
              className={styles.close}
              aria-label="Dismiss notification"
              onClick={() => setToast(null)}
            >
              <X size={12} weight="bold" aria-hidden />
            </button>
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const show = useContext(ToastContext);
  if (!show) throw new Error("useToast must be used inside <ToastProvider>");
  return show;
}
