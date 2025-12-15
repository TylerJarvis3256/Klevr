import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-teal focus-visible:ring-offset-2 disabled:pointer-events-none disabled:bg-secondary/40 disabled:text-primary [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-secondary text-primary hover:bg-[#3A3438] transition-colors",
        destructive: "bg-error text-white hover:bg-[#B91C1C] transition-colors",
        outline: "border border-secondary bg-transparent text-secondary hover:bg-primary transition-colors",
        secondary: "border border-secondary bg-transparent text-secondary hover:bg-primary transition-colors",
        ghost: "bg-transparent text-secondary hover:bg-primary transition-colors",
        link: "text-secondary underline-offset-4 hover:underline transition-colors",
        cta: "bg-secondary text-primary hover:bg-[#EE7B30] shadow-sm hover:shadow-lg transition-all duration-300",
        "cta-secondary": "border border-secondary bg-transparent text-secondary hover:bg-[#EEEBD9] hover:shadow-md hover:scale-[1.02] transition-all duration-300",
      },
      size: {
        default: "h-10 px-6 py-2",
        sm: "h-9 px-4 text-sm",
        lg: "h-12 px-8 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
