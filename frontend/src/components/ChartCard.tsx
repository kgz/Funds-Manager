import {
	glassCardClass,
	panelHintClass,
	panelTitleClass,
} from '@/components/layout/tokens';
import { cn } from '@/lib/utils/cn';
import type { ReactNode } from 'react';

type ChartCardProps = {
	title: string;
	titleExtra?: ReactNode;
	subtitle?: string;
	/** OD panel-hint: below title (donuts) or end-aligned in header row (cashflow, balance) */
	subtitleAlign?: 'below' | 'end';
	actions?: ReactNode;
	children: ReactNode;
	className?: string;
};

export function ChartCard({
	title,
	titleExtra,
	subtitle,
	subtitleAlign = 'below',
	actions,
	children,
	className,
}: ChartCardProps) {
	const hasSubtitle = subtitle !== undefined && subtitle.length > 0;

	return (
		<div className={cn(glassCardClass, 'flex min-h-0 flex-col overflow-hidden p-0', className)}>
			<div className="flex items-center justify-between gap-3 border-b border-paper-border px-4 py-3.5">
				<div className="min-w-0">
					<div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
						<h3 className={panelTitleClass}>{title}</h3>
						{titleExtra}
					</div>
					{hasSubtitle && subtitleAlign === 'below' ? (
						<p className={cn(panelHintClass, 'mt-1')}>{subtitle}</p>
					) : null}
				</div>
				<div className="flex shrink-0 items-center gap-2">
					{hasSubtitle && subtitleAlign === 'end' ? (
						<p className={panelHintClass}>{subtitle}</p>
					) : null}
					{actions}
				</div>
			</div>
			<div className="min-h-0 flex-1 p-4">{children}</div>
		</div>
	);
}
