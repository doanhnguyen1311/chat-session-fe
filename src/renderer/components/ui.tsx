import type { InputHTMLAttributes, ReactNode } from "react";
import { motion } from "framer-motion";
import type { HTMLMotionProps } from "framer-motion";
import { cn } from "../lib/utils";

type ButtonProps = HTMLMotionProps<"button"> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "md" | "sm" | "icon";
};

export function Button({ className, variant = "primary", size = "md", ...props }: ButtonProps): JSX.Element {
  return (
    <motion.button
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.975, y: 0 }}
      transition={{ type: "spring", stiffness: 520, damping: 34, mass: 0.7 }}
      className={cn("premium-button", `premium-button-${variant}`, `premium-button-${size}`, className)}
      {...props}
    />
  );
}

export function IconButton({ className, ...props }: ButtonProps): JSX.Element {
  return <Button className={cn("premium-icon-button", className)} size="icon" variant="ghost" {...props} />;
}

export function TextInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>): JSX.Element {
  return <input className={cn("premium-input", className)} {...props} />;
}

export function GlassPanel({ children, className }: { children: ReactNode; className?: string }): JSX.Element {
  return <div className={cn("glass-panel", className)}>{children}</div>;
}

export function Card({ children, className }: { children: ReactNode; className?: string }): JSX.Element {
  return <section className={cn("premium-card", className)}>{children}</section>;
}

export function Badge({ children, className }: { children: ReactNode; className?: string }): JSX.Element {
  return <span className={cn("premium-badge", className)}>{children}</span>;
}

export function Skeleton({ className }: { className?: string }): JSX.Element {
  return <span className={cn("skeleton", className)} />;
}

export function EmptyState({ title, description, children, className }: { title: string; description: string; children?: ReactNode; className?: string }): JSX.Element {
  return (
    <section className={cn("empty-state-panel floating-panel", className)}>
      <div className="empty-state-orb" aria-hidden="true" />
      <h2>{title}</h2>
      <p>{description}</p>
      {children}
    </section>
  );
}
