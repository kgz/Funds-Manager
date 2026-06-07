import { cn } from '@/lib/utils/cn';
import type { ReactNode } from 'react';
import { glassCardClass } from './tokens';

type GlassCardProps = {
	children: ReactNode;
	className?: string;
	padding?: boolean;
};

export function GlassCard({ children, className, padding = false }: GlassCardProps) {
	return (
		<div className={cn(glassCardClass, padding && 'p-6', className)}>
			{children}
		</div>
	);
}
