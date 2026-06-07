import { cn } from '@/lib/utils/cn';
import { Loader2 } from 'lucide-react';
import { GlassCard } from './GlassCard';

type PageLoadingStateProps = {
	label?: string;
	fullScreen?: boolean;
	className?: string;
};

export function PageLoadingState({
	label = 'Loading…',
	fullScreen = true,
	className,
}: PageLoadingStateProps) {
	if (fullScreen) {
		return (
			<div
				className={cn(
					'flex h-screen w-full items-center justify-center',
					className
				)}
			>
				<GlassCard className="px-8 py-6">
					<div className="flex items-center gap-3">
						<Loader2 className="h-6 w-6 animate-spin text-secondary-default" />
						<span className="text-white/70">{label}</span>
					</div>
				</GlassCard>
			</div>
		);
	}

	return (
		<GlassCard className={cn('p-8', className)}>
			<div className="flex items-center justify-center gap-3">
				<Loader2 className="h-6 w-6 animate-spin text-secondary-default" />
				<span className="text-white/70">{label}</span>
			</div>
		</GlassCard>
	);
}
