import Link from "next/link";
import type { ComponentProps } from "react";

// Botones del prototipo: 48–54 px de alto, radio 10 px.
export type ButtonVariant = "primary" | "ghost" | "outline" | "dark" | "danger";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-primary text-white hover:bg-primary-hover",
  ghost: "border border-line bg-surface text-ink hover:border-ink",
  outline: "border-[1.5px] border-primary text-primary-hover hover:bg-[#E3F1F0]",
  dark: "border border-white/30 bg-white/10 text-white hover:bg-white/20",
  danger: "bg-high text-white hover:bg-high-fg",
};

export function buttonClass(variant: ButtonVariant = "primary", className = "") {
  return `inline-flex min-h-12 items-center justify-center gap-2.5 rounded-[10px] px-5 text-center text-base font-semibold leading-tight no-underline transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant]} ${className}`;
}

export function Button({ variant, className, ...props }: { variant?: ButtonVariant } & ComponentProps<"button">) {
  return <button className={buttonClass(variant, className)} {...props} />;
}

export function ButtonLink({ variant, className, ...props }: { variant?: ButtonVariant } & ComponentProps<typeof Link>) {
  return <Link className={buttonClass(variant, className)} {...props} />;
}
