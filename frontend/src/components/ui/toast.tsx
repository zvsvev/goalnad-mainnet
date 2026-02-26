"use client";

import { useState, useEffect, useCallback } from "react";

export type ToastType = "success" | "error" | "loading";

export interface Toast {
    id: string;
    type: ToastType;
    message: string;
    txHash?: string;
    duration?: number;
}

let toastListeners: ((toasts: Toast[]) => void)[] = [];
let toastStore: Toast[] = [];

function notify() {
    toastListeners.forEach((fn) => fn([...toastStore]));
}

export function showToast(toast: Omit<Toast, "id">): string {
    const id = Math.random().toString(36).slice(2, 9);
    const newToast: Toast = { ...toast, id };
    toastStore = [...toastStore, newToast];
    notify();

    if (toast.type !== "loading") {
        const duration = toast.duration ?? (toast.type === "error" ? 5000 : 4000);
        setTimeout(() => dismissToast(id), duration);
    }

    return id;
}

export function dismissToast(id: string) {
    toastStore = toastStore.filter((t) => t.id !== id);
    notify();
}

export function updateToast(id: string, updates: Partial<Omit<Toast, "id">>) {
    toastStore = toastStore.map((t) =>
        t.id === id ? { ...t, ...updates } : t
    );
    notify();

    if (updates.type && updates.type !== "loading") {
        const duration = updates.type === "error" ? 5000 : 4000;
        setTimeout(() => dismissToast(id), duration);
    }
}

export function useToasts() {
    const [toasts, setToasts] = useState<Toast[]>([]);

    useEffect(() => {
        toastListeners.push(setToasts);
        return () => {
            toastListeners = toastListeners.filter((fn) => fn !== setToasts);
        };
    }, []);

    return toasts;
}

export function ToastContainer() {
    const toasts = useToasts();

    if (toasts.length === 0) return null;

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm">
            {toasts.map((toast) => (
                <div
                    key={toast.id}
                    className={`flex items-start gap-3 rounded-none border px-4 py-3 shadow-lg backdrop-blur-sm transition-all animate-in slide-in-from-right-5 fade-in duration-300
            ${toast.type === "success"
                            ? "border-green-500/40 bg-background text-green-400"
                            : toast.type === "error"
                                ? "border-red-500/40 bg-background text-red-400"
                                : "border-border bg-background text-foreground"
                        }`}
                >
                    <span className="mt-0.5 shrink-0">
                        {toast.type === "loading" && (
                            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                        )}
                        {toast.type === "success" && "✅"}
                        {toast.type === "error" && "❌"}
                    </span>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-mono leading-snug">{toast.message}</p>
                        {toast.txHash && (
                            <a
                                href={`https://solscan.io/tx/${toast.txHash}?cluster=devnet`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-1 inline-block font-mono text-[10px] text-primary hover:underline"
                            >
                                View on Solscan →
                            </a>
                        )}
                    </div>
                    <button
                        onClick={() => dismissToast(toast.id)}
                        className="shrink-0 text-muted-foreground hover:text-foreground text-xs"
                    >
                        ✕
                    </button>
                </div>
            ))}
        </div>
    );
}
