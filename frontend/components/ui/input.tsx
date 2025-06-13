
import * as React from "react"

import { cn } from "@/frontend/lib/utils"

// Allow 'as' prop for polymorphism
type InputProps = React.ComponentProps<"input"> & {
  as?: "input" | "textarea";
  rows?: number; // Only relevant if as="textarea"
};


const Input = React.forwardRef<HTMLInputElement | HTMLTextAreaElement, InputProps>(
  ({ className, type, as = "input", rows, ...props }, ref) => {
    const Comp = as;
    const commonClasses = "flex w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm";

    if (Comp === "textarea") {
      return (
        <textarea
          // @ts-ignore
          ref={ref as React.Ref<HTMLTextAreaElement>}
          className={cn(commonClasses, "min-h-[60px]", className)} // min-h specific to textarea
          rows={rows}
          {...(props as React.TextareaHTMLAttributes<HTMLTextAreaElement>)}
        />
      );
    }

    return (
      <input
        type={type}
        // @ts-ignore
        ref={ref as React.Ref<HTMLInputElement>}
        className={cn(commonClasses, "h-10", className)} // h-10 specific to input
        {...(props as React.InputHTMLAttributes<HTMLInputElement>)}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
