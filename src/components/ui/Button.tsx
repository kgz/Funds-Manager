
// components/ui/Button.tsx
import React from "react";
import style from "@/styles/button.module.css";
import { cn } from "@/lib/utils/cn";
export const Button = ({ className, children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => {
	return (
		<button
			className={cn(
				style.button, 
				className
			)}
			{...props}
		>
			{children}
		</button>
	);
};