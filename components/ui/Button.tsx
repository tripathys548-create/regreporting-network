import clsx from "clsx";
import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Icon, type IconName } from "./Icon";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "inverse";
export type ButtonSize = "sm" | "md";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-accent text-white hover:bg-accent-strong border border-accent",
  secondary: "bg-surface text-ink border border-line hover:border-muted/50 hover:bg-canvas",
  ghost: "text-body hover:bg-ink/5 border border-transparent",
  inverse: "bg-white/10 text-white border border-white/20 hover:bg-white/15",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "h-8 px-2.5 text-xs gap-1.5",
  md: "h-9 px-3.5 text-sm gap-2",
};

export function buttonClasses(variant: ButtonVariant = "secondary", size: ButtonSize = "md", className?: string) {
  return clsx(
    "inline-flex items-center justify-center rounded-md font-medium whitespace-nowrap transition-colors",
    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
    "disabled:cursor-not-allowed disabled:opacity-50",
    VARIANTS[variant],
    SIZES[size],
    className,
  );
}

interface CommonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IconName;
  iconRight?: IconName;
  children: ReactNode;
  className?: string;
}

export function Button({ variant, size, icon, iconRight, children, className, type = "button", ...rest }: CommonProps & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type={type} className={buttonClasses(variant, size, className)} {...rest}>
      {icon && <Icon name={icon} />}
      {children}
      {iconRight && <Icon name={iconRight} />}
    </button>
  );
}

export function ButtonLink({ href, variant, size, icon, iconRight, children, className, external, onClick }: CommonProps & { href: string; external?: boolean; onClick?: () => void }) {
  const content = (
    <>
      {icon && <Icon name={icon} />}
      {children}
      {iconRight && <Icon name={iconRight} />}
    </>
  );
  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={buttonClasses(variant, size, className)}>
        {content}
        <span className="sr-only">(opens official source in a new tab)</span>
      </a>
    );
  }
  return (
    <Link href={href} onClick={onClick} className={buttonClasses(variant, size, className)}>
      {content}
    </Link>
  );
}
