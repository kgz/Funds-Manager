import { cn } from '@/lib/utils/cn';

type ActionableBadgeProps = {
	count: number;
	compact?: boolean;
};

function formatCount(count: number): string {
	if (count > 99) {
		return '99+';
	}
	return String(count);
}

export function ActionableBadge({ count, compact = false }: ActionableBadgeProps) {
	return (
		<span
			className={cn(
				'grid shrink-0 place-items-center rounded-full bg-paper-fg font-mono text-[10px] font-medium leading-none tracking-[0.02em] text-paper-surface',
				compact
					? 'h-[14px] min-w-[14px] px-0.5 text-[9px]'
					: 'h-[18px] min-w-[18px] px-[5px]'
			)}
			aria-hidden
		>
			{formatCount(count)}
		</span>
	);
}
