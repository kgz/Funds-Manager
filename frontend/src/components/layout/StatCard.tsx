import { cn } from '@/lib/utils/cn';
import type { ReactNode } from 'react';
import { GlassCard } from './GlassCard';

type StatCardProps = {
	label: string;
	value: ReactNode;
	hint?: ReactNode;
	align?: 'left' | 'right';
	valueClassName?: string;
	className?: string;
};

export function StatCard({
	label,
	value,
	hint,
	align = 'left',
	valueClassName,
	className,
}: StatCardProps) {
	return (
		<GlassCard
			className={cn(
				'min-w-[13rem] px-4 py-2',
				align === 'right' ? 'text-right' : 'text-left',
				className
			)}
		>
			<p className="text-[10px] uppercase tracking-wide text-white/50">{label}</p>
			<p className={cn('text-lg font-semibold font-mono', valueClassName)}>
				{value}
			</p>
			{hint !== undefined ? (
				<div className="mt-1 text-[11px] text-white/45">{hint}</div>
			) : null}
		</GlassCard>
	);
}
