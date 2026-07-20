import { cn } from '@/lib/utils/cn';
import { chartColors } from '@/graphs/theme';

type SpendShareCellProps = {
	percent: number | null;
	barColor?: string;
	className?: string;
};

export function SpendShareCell({
	percent,
	barColor,
	className,
}: SpendShareCellProps) {
	if (percent === null || percent <= 0) {
		return (
			<span className={cn('font-mono text-sm tabular-nums text-paper-muted', className)}>
				—
			</span>
		);
	}

	const width = Math.min(100, Math.max(2, percent));
	const fill = barColor && barColor.length > 0 ? barColor : chartColors.other;

	return (
		<div className={cn('flex w-full min-w-[6rem] flex-col gap-1.5 text-left', className)}>
			<span className="self-start font-mono text-xs tabular-nums text-paper-muted">
				{percent.toFixed(1)}%
			</span>
			<div
				className="h-[3px] overflow-hidden rounded-sm bg-[color-mix(in_oklch,var(--fg)_6%,var(--bg))]"
				aria-hidden
			>
				<div
					className="h-full rounded-sm transition-[width] duration-280"
					style={{ width: `${String(width)}%`, background: fill }}
				/>
			</div>
		</div>
	);
}
