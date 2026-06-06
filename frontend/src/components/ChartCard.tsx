import { cn } from '@/lib/utils/cn';
import type { ReactNode } from 'react';

type ChartCardProps = {
	title: string;
	subtitle?: string;
	children: ReactNode;
	className?: string;
};

export function ChartCard({ title, subtitle, children, className }: ChartCardProps) {
	return (
		<div className={cn('rounded-xl border border-white/10 bg-white/5 p-6', className)}>
			<h3 className="text-lg font-semibold text-white/90">{title}</h3>
			{subtitle !== undefined && subtitle.length > 0 ? (
				<p className="mt-1 mb-4 text-xs text-white/50">{subtitle}</p>
			) : (
				<div className="mb-4" />
			)}
			{children}
		</div>
	);
}
