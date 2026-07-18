import { cn } from '@/lib/utils/cn';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { GlassCard } from './GlassCard';

type EmptyStateProps = {
	icon: LucideIcon;
	title: string;
	description?: string;
	action?: ReactNode;
	className?: string;
	compact?: boolean;
};

export function EmptyState({
	icon: Icon,
	title,
	description,
	action,
	className,
	compact = false,
}: EmptyStateProps) {
	return (
		<div
			className={cn(
				'flex items-center justify-center',
				compact ? 'py-8' : 'min-h-[40vh] p-4 md:p-6',
				className
			)}
		>
			<GlassCard className="max-w-md p-8 text-center">
				<Icon className="mx-auto h-10 w-10 text-paper-muted" />
				<h2 className="mt-4 text-lg font-semibold tracking-[-0.02em] text-paper-fg">{title}</h2>
				{description !== undefined && description.length > 0 ? (
					<p className="mt-2 text-[13px] text-paper-muted">{description}</p>
				) : null}
				{action !== undefined ? <div className="mt-6">{action}</div> : null}
			</GlassCard>
		</div>
	);
}
