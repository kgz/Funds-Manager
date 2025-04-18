import { cn } from "@/lib/utils/cn";
import React from "react";

export const Card = ({
    className,
    children,
}: React.HTMLAttributes<HTMLDivElement>) => {
    return (
        <div className={cn("bg-white rounded-xl shadow-md", className)}>
            {children}
        </div>
    );
};

export const CardContent = ({
    className,
    children,
}: React.HTMLAttributes<HTMLDivElement>) => {
    return <div className={cn("p-6", className)}>{children}</div>;
};
