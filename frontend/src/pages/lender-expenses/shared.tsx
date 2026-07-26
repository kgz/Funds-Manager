import { Info, Loader2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { DateTime } from 'luxon';
import { cn } from '@/lib/utils/cn';
import { PERIOD_LABELS, type DashboardPeriod } from '@/components/dashboard/period';

export const formatMoney = (value: number): string =>
	`$${value.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const leKpiLabelClass =
	'm-0 text-[12px] font-medium uppercase tracking-[0.06em] text-paper-muted';

export const leKpiValueClass =
	'm-0 text-[26px] font-medium leading-none tracking-[-0.02em] text-paper-fg';

export const leKpiMoneyClass =
	'm-0 font-mono text-[26px] font-medium leading-none tracking-[-0.02em] tabular-nums text-paper-fg';

export const leKpiRangeClass =
	'm-0 text-[18px] font-medium leading-tight tracking-[-0.01em] text-paper-fg';

export const pillBaseClass =
	'inline-flex h-[22px] items-center rounded-full border bg-paper px-2 text-[11px] font-medium uppercase tracking-[0.04em]';

export const tableThClass =
	'sticky top-0 whitespace-nowrap border-b border-paper-border bg-paper px-3 py-2.5 text-left text-[11px] font-medium uppercase tracking-[0.06em] text-paper-muted';

export const tableTdClass =
	'border-b border-paper-border px-3 py-2.5 align-middle text-[13px] text-paper-fg';

export const leSegmentedClass =
	'inline-flex max-w-full flex-wrap gap-0.5 rounded-[calc(var(--radius)+2px)] border border-paper-border bg-paper p-[3px]';

export const leSegmentButtonClass =
	'h-[26px] cursor-pointer rounded-paper border-0 bg-transparent px-2.5 text-[12px] font-medium tracking-[0.02em] !text-paper-muted transition-colors hover:!text-paper-fg';

export const leSegmentButtonActiveClass =
	'!bg-paper-surface !text-paper-fg shadow-[0_1px_2px_color-mix(in_oklch,var(--fg)_6%,transparent)]';

export function formatPeriodRange(start: string, end: string): string {
	const startDate = DateTime.fromISO(start.slice(0, 10));
	const endDate = DateTime.fromISO(end.slice(0, 10));
	if (!startDate.isValid || !endDate.isValid) {
		return `${start} – ${end}`;
	}
	if (startDate.year === endDate.year) {
		if (startDate.month === endDate.month) {
			return `${startDate.day}–${endDate.day} ${endDate.toFormat('LLL yyyy')}`;
		}
		return `${startDate.toFormat('d LLL')} – ${endDate.toFormat('d LLL yyyy')}`;
	}
	return `${startDate.toFormat('LLL yyyy')} – ${endDate.toFormat('LLL yyyy')}`;
}

export function periodHintLabel(period: DashboardPeriod): string {
	return PERIOD_LABELS[period].toLowerCase();
}

export function formatAmountCell(value: number): string {
	return value > 0 ? formatMoney(value) : '—';
}

type LivingExpensesCalloutProps = {
	children: ReactNode;
	className?: string;
};

export function LivingExpensesCallout({ children, className }: LivingExpensesCalloutProps) {
	return (
		<div
			className={cn(
				'rounded-paper border border-[color-mix(in_oklch,var(--accent)_28%,var(--border))] bg-[color-mix(in_oklch,var(--accent)_6%,var(--surface))] px-3.5 py-3 text-[13px] leading-[1.45]',
				className
			)}
		>
			<div className="flex min-w-0 items-start gap-2.5">
				<span
					className="grid h-7 w-7 shrink-0 place-items-center rounded-md border border-[color-mix(in_oklch,var(--accent)_24%,var(--border))] bg-[color-mix(in_oklch,var(--accent)_12%,var(--surface))] text-secondary-default"
					aria-hidden="true"
				>
					<Info className="h-3.5 w-3.5" strokeWidth={2} />
				</span>
				<div className="min-w-0 text-[13px] text-paper-muted [&_a]:font-medium [&_a]:text-secondary-default [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-paper-fg">
					{children}
				</div>
			</div>
		</div>
	);
}

type LivingExpensesKpiRowProps = {
	livingMonthly: number;
	allDebitsMonthly: number;
	monthsInRange: number;
	periodRange: string;
};

export function LivingExpensesKpiRow({
	livingMonthly,
	allDebitsMonthly,
	monthsInRange,
	periodRange,
}: LivingExpensesKpiRowProps) {
	return (
		<section
			className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4"
			aria-label="Living expenses summary"
		>
			<article className="rounded-lg border border-paper-border bg-paper-surface px-[18px] py-4">
				<p className={leKpiLabelClass}>Living expenses / month</p>
				<p className={cn(leKpiMoneyClass, 'mt-2')}>{formatMoney(livingMonthly)}</p>
			</article>
			<article className="rounded-lg border border-paper-border bg-paper-surface px-[18px] py-4">
				<p className={leKpiLabelClass}>All debits / month</p>
				<p className={cn(leKpiMoneyClass, 'mt-2')}>{formatMoney(allDebitsMonthly)}</p>
			</article>
			<article className="rounded-lg border border-paper-border bg-paper-surface px-[18px] py-4">
				<p className={leKpiLabelClass}>Months in range</p>
				<p className={cn(leKpiValueClass, 'mt-2')}>{monthsInRange}</p>
			</article>
			<article className="rounded-lg border border-paper-border bg-paper-surface px-[18px] py-4">
				<p className={leKpiLabelClass}>Period</p>
				<p className={cn(leKpiRangeClass, 'mt-2')}>{periodRange}</p>
			</article>
		</section>
	);
}

export type SortDir = 'asc' | 'desc';

function SortIndicator({ active, direction }: { active: boolean; direction: SortDir }) {
	return (
		<span
			className={cn(
				'inline-grid h-3 w-2.5 shrink-0 opacity-35 transition-opacity',
				active && 'opacity-100'
			)}
			aria-hidden
		>
			<svg viewBox="0 0 10 12" fill="none" stroke="currentColor" strokeWidth="1.6">
				<path
					d="M2 4.2 5 1.5 8 4.2"
					opacity={active && direction === 'desc' ? 0.28 : 1}
				/>
				<path
					d="M2 7.8 5 10.5 8 7.8"
					opacity={active && direction === 'asc' ? 0.28 : 1}
				/>
			</svg>
		</span>
	);
}

type SortHeaderProps = {
	label: string;
	active: boolean;
	direction: SortDir;
	align?: 'left' | 'right';
	onClick: () => void;
	className?: string;
};

export function SortHeader({
	label,
	active,
	direction,
	align = 'left',
	onClick,
	className,
}: SortHeaderProps) {
	const ariaSort = active ? (direction === 'asc' ? 'ascending' : 'descending') : 'none';
	const numeric = align === 'right';

	return (
		<th scope="col" aria-sort={ariaSort} className={cn(tableThClass, className)}>
			<button
				type="button"
				onClick={onClick}
				className={cn(
					'inline-flex max-w-full cursor-pointer items-center gap-1 border-0 bg-transparent p-0 text-inherit hover:text-paper-fg',
					active && 'text-paper-fg',
					numeric ? 'ml-auto flex-row-reverse' : 'text-left'
				)}
			>
				{label}
				<SortIndicator active={active} direction={direction} />
			</button>
		</th>
	);
}

type ChildSortHeaderProps = {
	label: string;
	active: boolean;
	direction: SortDir;
	align?: 'left' | 'right';
	onClick: () => void;
};

export function ChildSortHeader({
	label,
	active,
	direction,
	align = 'left',
	onClick,
}: ChildSortHeaderProps) {
	const ariaSort = active ? (direction === 'asc' ? 'ascending' : 'descending') : 'none';
	const numeric = align === 'right';

	return (
		<td
			aria-sort={ariaSort}
			className={cn(
				'border-b border-paper-border bg-[color-mix(in_oklch,var(--fg)_2%,var(--bg))] px-3 py-1.5 align-middle text-[10px] font-medium uppercase tracking-[0.06em] text-paper-muted',
				numeric && 'text-right'
			)}
		>
			<button
				type="button"
				onClick={onClick}
				className={cn(
					'inline-flex cursor-pointer items-center gap-1 border-0 bg-transparent p-0 text-inherit hover:text-paper-fg',
					active && 'text-paper-fg',
					numeric && 'ml-auto flex-row-reverse'
				)}
			>
				{label}
				<span
					className={cn(
						'inline-grid h-2.5 w-2 shrink-0 opacity-35',
						active && 'opacity-100'
					)}
					aria-hidden
				>
					<svg viewBox="0 0 10 12" fill="none" stroke="currentColor" strokeWidth="1.6">
						<path
							d="M2 4.2 5 1.5 8 4.2"
							opacity={active && direction === 'desc' ? 0.28 : 1}
						/>
						<path
							d="M2 7.8 5 10.5 8 7.8"
							opacity={active && direction === 'asc' ? 0.28 : 1}
						/>
					</svg>
				</span>
			</button>
		</td>
	);
}

export function MappingStatusPill({
	status,
}: {
	status: 'default' | 'override' | 'excluded';
}) {
	if (status === 'override') {
		return (
			<span
				className={cn(
					pillBaseClass,
					'border-[color-mix(in_oklch,var(--accent)_30%,var(--border))] bg-[color-mix(in_oklch,var(--accent)_8%,var(--surface))] text-secondary-default'
				)}
			>
				Override
			</span>
		);
	}
	if (status === 'excluded') {
		return (
			<span
				className={cn(
					pillBaseClass,
					'border-[color-mix(in_oklch,var(--muted)_35%,var(--border))] bg-[color-mix(in_oklch,var(--muted)_8%,var(--surface))] text-paper-muted'
				)}
			>
				Excluded
			</span>
		);
	}
	return <span className={cn(pillBaseClass, 'border-paper-border text-paper-muted')}>Default</span>;
}

export function TableLoadingRow({ colSpan, label }: { colSpan: number; label: string }) {
	return (
		<tr>
			<td colSpan={colSpan} className={cn(tableTdClass, 'text-paper-muted')}>
				<span className="inline-flex items-center gap-2">
					<Loader2 className="h-4 w-4 animate-spin" />
					{label}
				</span>
			</td>
		</tr>
	);
}
