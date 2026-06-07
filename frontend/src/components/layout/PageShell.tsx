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
					? 'flex h-screen w-full flex-col text-white/90'
					: 'p-4 md:p-6 text-white/90',
				className
			)}
		>
			{children}
		</div>
	);
}
