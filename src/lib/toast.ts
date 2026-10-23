export type ToastTone = "success" | "error" | "info";

export interface ToastMessage {
  id: number;
  tone: ToastTone;
  text: string;
}

export const TOAST_EVENT = "ott:toast";

let nextId = 1;

/** Shows a short message in the corner; rendered by <Toaster /> in the root layout. */
export function toast(text: string, tone: ToastTone = "success") {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<ToastMessage>(TOAST_EVENT, { detail: { id: nextId++, tone, text } })
  );
}
