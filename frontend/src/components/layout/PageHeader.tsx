import { cn } from '@/lib/utils/cn';
import type { ReactNode } from 'react';
import { GlassCard } from './GlassCard';
import { pageSubtitleClass, pageTitleClass } from './tokens';

type PageHeaderProps = {
	title: string;
	subtitle?: string;
	icon?: ReactNode;
	meta?: ReactNode;
	actions?: ReactNode;
	sticky?: boolean;
	pending?: boolean;
	className?: string;
};

export function PageHeader({
	title,
	subtitle,
	icon,
	meta,
	actions,
	sticky = false,
	pending = false,
	className,
}: PageHeaderProps) {
	const content = (
		<GlassCard
			className={cn(
				'px-4 py-3 shadow-lg shadow-black/20',
				sticky && 'shadow-lg shadow-black/20'
			)}
		>
			<div className="flex flex-wrap items-center justify-between gap-4">
				<div className="min-w-0">
					<div className="flex flex-wrap items-center gap-3">
						<h1 className={cn(pageTitleClass, 'flex items-center gap-2')}>
							{icon}
							{title}
						</h1>
						{meta}
					</div>
					{subtitle !== undefined && subtitle.length > 0 ? (
						<p className={pageSubtitleClass}>{subtitle}</p>
					) : null}
				</div>
				{actions !== undefined ? (
					<div className="flex flex-wrap items-center gap-3">{actions}</div>
				) : null}
			</div>
			<div
				className={cn(
					'mt-3 h-0.5 overflow-hidden rounded-full bg-white/10 transition-opacity duration-300',
					pending ? 'opacity-100' : 'opacity-0'
				)}
				aria-hidden={!pending}
			>
				<div className="h-full w-2/5 animate-pulse rounded-full bg-secondary-default/80 motion-reduce:animate-none" />
			</div>
		</GlassCard>
	);

	if (!sticky) {
		return <div className={cn('mb-6', className)}>{content}</div>;
	}

	return (
		<div
			className={cn(
				'sticky top-0 z-30 -mx-4 mb-6 border-b border-white/10 bg-gray-950/90 px-4 py-4 backdrop-blur-md md:-mx-6 md:px-6',
				className
			)}
		>
			{content}
		</div>
	);
}
