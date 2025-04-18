// components/ui/Input.tsx
import { cn } from "@/lib/utils/cn";
import React from "react";

export const Input = React.forwardRef<
    HTMLInputElement,
    React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => {
    return (
        <input
            ref={ref}
            className={cn(
                "block w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-500",
                className
            )}
            {...props}
        />
    );
});
Input.displayName = "Input";
