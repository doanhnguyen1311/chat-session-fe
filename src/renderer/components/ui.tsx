import type { InputHTMLAttributes, ReactNode } from "react";
import { motion } from "framer-motion";
import type { HTMLMotionProps } from "framer-motion";
import { cn } from "../lib/utils";

export function Button({ className, ...props }: HTMLMotionProps<"button">): JSX.Element {
  return (
    <motion.button
      whileTap={{ scale: 0.985 }}
      transition={{ duration: 0.16 }}
      className={cn("premium-button", className)}
      {...props}
    />
  );
}

export function IconButton({ className, ...props }: HTMLMotionProps<"button">): JSX.Element {
  return <Button className={cn("premium-icon-button", className)} {...props} />;
}

export function TextInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>): JSX.Element {
  return <input className={cn("premium-input", className)} {...props} />;
}

export function GlassPanel({ children, className }: { children: ReactNode; className?: string }): JSX.Element {
  return <div className={cn("glass-panel", className)}>{children}</div>;
}
