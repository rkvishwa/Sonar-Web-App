import { writable } from "svelte/store";

export type ToastType = "error" | "success" | "info";

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

function createToastStore() {
  const { subscribe, update } = writable<Toast[]>([]);

  function show(message: string, type: ToastType = "info", duration = 5000) {
    const id = crypto.randomUUID();
    update((toasts) => [...toasts, { id, message, type }]);
    setTimeout(() => dismiss(id), duration);
  }

  function dismiss(id: string) {
    update((toasts) => toasts.filter((t) => t.id !== id));
  }

  return {
    subscribe,
    error: (msg: string) => show(msg, "error", 6000),
    success: (msg: string) => show(msg, "success", 5000),
    info: (msg: string) => show(msg, "info", 5000),
    dismiss,
  };
}

export const toast = createToastStore();
