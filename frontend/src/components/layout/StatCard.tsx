import { cn } from '@/lib/utils/cn';
import type { ReactNode } from 'react';
import { GlassCard } from './GlassCard';
import { eyebrowClass, moneyClass } from './tokens';

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
				'min-w-[13rem] px-4 py-3',
				align === 'right' ? 'text-right' : 'text-left',
				className
			)}
		>
			<p className={eyebrowClass}>{label}</p>
			<p className={cn(moneyClass, 'mt-2 text-lg', valueClassName)}>{value}</p>
			{hint !== undefined ? (
				<div className="mt-1 text-[11px] text-paper-muted">{hint}</div>
			) : null}
		</GlassCard>
	);
}
