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
	actions?: ReactNode;
	children: ReactNode;
	className?: string;
};

export function ChartCard({
	title,
	titleExtra,
	subtitle,
	actions,
	children,
	className,
}: ChartCardProps) {
	return (
		<div className={cn(glassCardClass, 'p-6', className)}>
			<div className="mb-4 flex flex-wrap items-start justify-between gap-3">
				<div className="min-w-0">
					<div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
						<h3 className={panelTitleClass}>{title}</h3>
						{titleExtra}
					</div>
					{subtitle !== undefined && subtitle.length > 0 ? (
						<p className={panelHintClass}>{subtitle}</p>
					) : null}
				</div>
				{actions}
			</div>
			{children}
		</div>
	);
}
