"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CheckboxProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  onCheckedChange?: (checked: boolean) => void;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, onCheckedChange, ...props }, ref) => {
    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      onCheckedChange?.(event.target.checked);
      props.onChange?.(event);
    };

    return (
      <label
        className={cn(
          "relative inline-flex items-center justify-center",
          props.disabled && "cursor-not-allowed opacity-50",
          !props.disabled && "cursor-pointer"
        )}
      >
        <input
          type="checkbox"
          className="sr-only"
          ref={ref}
          {...props}
          onChange={handleChange}
        />
        <div
          className={cn(
            "flex h-4 w-4 items-center justify-center rounded-sm border border-primary text-current transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            props.checked || props.defaultChecked
              ? "bg-primary text-primary-foreground"
              : "bg-background hover:bg-accent hover:text-accent-foreground",
            className
          )}
        >
          {(props.checked || props.defaultChecked) && (
            <Check className="h-3 w-3" />
          )}
        </div>
      </label>
    );
  }
);
Checkbox.displayName = "Checkbox";

export { Checkbox };
