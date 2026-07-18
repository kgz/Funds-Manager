import { cn } from '@/lib/utils/cn';
import type { ReactNode } from 'react';

type PageShellProps = {
	children: ReactNode;
	variant?: 'default' | 'table';
	className?: string;
};

export function PageShell({
	children,
	variant = 'default',
	className,
}: PageShellProps) {
	return (
		<div
			className={cn(
				variant === 'table'
					? 'flex h-screen w-full flex-col text-paper-fg'
					: 'p-4 text-paper-fg md:p-6',
				className
			)}
		>
			{children}
		</div>
	);
}
