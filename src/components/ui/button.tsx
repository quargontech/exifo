import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef } from "react";
import { cn } from "@/lib/cn";
import { Spinner } from "@/components/ui/progress";

/** Radius 10 on controls; ink for primary actions; orange never appears on a button. */
export const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-[10px] font-semibold transition-colors disabled:pointer-events-none select-none",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-fg hover:bg-primary-hover disabled:bg-line disabled:text-ink-3",
        secondary: "border border-line-strong bg-surface text-ink hover:bg-surface-2 dark:bg-transparent dark:hover:bg-surface-2 disabled:text-ink-3",
        ghost: "bg-transparent text-ink-2 hover:bg-surface-2 hover:text-ink disabled:text-ink-3",
        danger: "bg-transparent text-danger hover:bg-danger-tint",
        outlineIcon: "border border-line bg-surface text-ink-2 hover:bg-surface-2 hover:text-ink",
      },
      size: {
        md: "h-11 px-4 text-[15px]",
        lg: "h-12 px-5 text-base rounded-xl",
        sm: "h-10 px-3 text-sm",
        icon: "h-11 w-11 p-0",
        iconSm: "h-10 w-10 p-0",
      },
    },
    defaultVariants: { variant: "secondary", size: "md" },
  },
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  /** Shows a spinner before the label and marks the button busy. */
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, type = "button", loading, children, ...props },
  ref,
) {
  return (
    <button ref={ref} type={type} aria-busy={loading || undefined} className={cn(buttonVariants({ variant, size }), className)} {...props}>
      {loading && <Spinner size={size === "lg" ? 18 : 16} />}
      {children}
    </button>
  );
});
