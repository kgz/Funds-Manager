import React, { useEffect, useState } from "react";
import style from "@/styles/button.module.css";
import { cn } from "@/lib/utils/cn";
import { AnimatePresence, motion } from "motion/react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  minLoadingDuration?: number; // minimum duration in milliseconds
  size?: "sm" | "md" | "lg" | "xl"; // fixed sizing option
  responsiveSize?: {
    base?: "sm" | "md" | "lg" | "xl";
    sm?: "sm" | "md" | "lg" | "xl";
    md?: "sm" | "md" | "lg" | "xl";
    lg?: "sm" | "md" | "lg" | "xl";
    xl?: "sm" | "md" | "lg" | "xl";
  };
  fullWidth?: boolean;
  align?: "left" | "center" | "right";
}

const sizeClasses = {
  sm: "text-sm px-3 py-1.5",
  md: "text-base px-4 py-2",
  lg: "text-lg px-5 py-2.5",
  xl: "text-xl px-6 py-3"
};

function getResponsiveSizeClasses(size?: ButtonProps["responsiveSize"] | ButtonProps["size"]): string {
  if (!size || typeof size === "string") return sizeClasses[size || "md"];
  const entries = Object.entries(size).map(
    ([key, value]) => `${key === "base" ? "" : `${key}:`}${sizeClasses[value]}`
  );
  return entries.join(" ");
}

export const Button = ({
  className,
  children,
  loading = false,
  disabled,
  minLoadingDuration = 500,
  size,
  responsiveSize,
  fullWidth = false,
  align = "center",
  ...props
}: ButtonProps) => {
  const [internalLoading, setInternalLoading] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);

  useEffect(() => {
    if (loading) {
      setStartTime(Date.now());
      setInternalLoading(true);
    } else if (startTime !== null) {
      const elapsed = Date.now() - startTime;
      const remainingTime = minLoadingDuration - elapsed;
      const timeout = remainingTime > 0 ? remainingTime : 0;

      const timer = setTimeout(() => {
        setInternalLoading(false);
        setStartTime(null);
      }, timeout);

      return () => clearTimeout(timer);
    }
  }, [loading, minLoadingDuration, startTime]);

  const alignmentClass = fullWidth ? "w-full" : `w-min self-${align} justify-self-${align}`;

  return (
	<div className={
		cn(
			"relative", 
			alignmentClass, 
			align === 'center' && 'ml-auto mr-auto',
			align === 'right' && 'ml-auto mr-0',
			
			)}>
    <button
      className={cn(
        " bg-purple-600 text-white rounded-lg px-4 py-2 inline-flex items-center text-center transition-all duration-300 ease-in-out h-10",
        getResponsiveSizeClasses(responsiveSize || size),
        className,
        disabled ? "opacity-80 cursor-not-allowed" : (loading ? "cursor-wait" : "cursor-pointer"),
        "overflow-hidden w-full",
        
      )}
      disabled={disabled || internalLoading}
      {...props}
    >
      <AnimatePresence initial={false} mode="wait">
        {internalLoading ? (
          <motion.span
            key="loading"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="flex justify-center gap-2 w-full"
          >
            <svg
              className="animate-spin h-4 w-4 text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8z"
              />
            </svg>
          </motion.span>
        ) : (
          <motion.span
            key="text"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
			className="w-full"
          >
            {children}
          </motion.span>
        )}
      </AnimatePresence>
    </button>
	</div>
  );
};
