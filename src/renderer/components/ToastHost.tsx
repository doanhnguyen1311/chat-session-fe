import { AnimatePresence, motion } from "framer-motion";

export type Toast = {
  id: string;
  message: string;
  tone?: "info" | "error";
};

type Props = {
  toasts: Toast[];
};

export function ToastHost({ toasts }: Props): JSX.Element {
  return (
    <div className="toast-host">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            className={toast.tone === "error" ? "toast error-toast" : "toast"}
            key={toast.id}
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.18 }}
          >
            {toast.message}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
