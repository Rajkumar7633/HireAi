"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface SwitchProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  onCheckedChange?: (checked: boolean) => void;
}

const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  ({ className, onCheckedChange, ...props }, ref) => {
    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      onCheckedChange?.(event.target.checked);
      props.onChange?.(event);
    };

    return (
      <label
        className={cn(
          "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background",
          props.checked || props.defaultChecked ? "bg-primary" : "bg-input",
          props.disabled && "cursor-not-allowed opacity-50",
          className
        )}
      >
        <input
          type="checkbox"
          className="sr-only"
          ref={ref}
          {...props}
          onChange={handleChange}
        />
        <span
          className={cn(
            "pointer-events-none inline-block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform",
            props.checked || props.defaultChecked
              ? "translate-x-6"
              : "translate-x-1"
          )}
        />
      </label>
    );
  }
);
Switch.displayName = "Switch";

export { Switch };
