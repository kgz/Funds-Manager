import { AlertTriangle, Check } from 'lucide-react';
import { DateTime } from 'luxon';
import type { ReactNode } from 'react';
import {
	BREAKDOWN_PRESET_PERIODS,
	PERIOD_LABELS,
	type DashboardPeriod,
} from '@/components/dashboard/period';
import { cn } from '@/lib/utils/cn';
import {
	formatPeriodRange,
	leKpiLabelClass,
	leKpiMoneyClass,
	leSegmentButtonActiveClass,
	leSegmentButtonClass,
	leSegmentedClass,
	pillBaseClass,
	tableTdClass,
	tableThClass,
} from '@/pages/lender-expenses/shared';
import type { CoverageItem } from './coverage-items';

export type { CoverageItem } from './coverage-items';

export {
	formatPeriodRange,
	leSegmentButtonActiveClass,
	leSegmentButtonClass,
	leSegmentedClass,
	tableTdClass,
	tableThClass,
};

export const rsSegmentedClass = leSegmentedClass;
export const rsSegmentButtonClass = leSegmentButtonClass;
export const rsSegmentButtonActiveClass = leSegmentButtonActiveClass;

const rsCoveragePanelBaseClass = 'rounded-paper border px-4 py-[14px]';

const rsCoveragePanelDefaultClass = 'border-paper-border bg-paper';

const rsCoveragePanelWarnClass =
	'border-[color-mix(in_oklch,var(--warn)_35%,var(--border))] bg-[color-mix(in_oklch,var(--warn)_5%,var(--bg))]';

const rsCoverageItemBaseClass =
	'flex items-start gap-2 rounded-paper border px-3 py-2.5 text-[12px] leading-[1.35]';

const rsCoverageItemOkClass =
	'border-[color-mix(in_oklch,var(--success)_30%,var(--border))] bg-[color-mix(in_oklch,var(--success)_6%,var(--surface))]';

const rsCoverageItemWarnClass =
	'border-[color-mix(in_oklch,var(--warn)_35%,var(--border))] bg-[color-mix(in_oklch,var(--warn)_8%,var(--surface))]';

function coverageItemSurfaceClass(state: CoverageItem['state']): string {
	if (state === 'ok') {
		return rsCoverageItemOkClass;
	}
	if (state === 'warn') {
		return rsCoverageItemWarnClass;
	}
	return 'border-paper-border bg-paper-surface';
}

export const formatMoney = (value: number): string =>
	`$${value.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const rsKpiLabelClass = leKpiLabelClass;
export const rsKpiMoneyClass = leKpiMoneyClass;
export const rsKpiDeltaClass = 'm-0 mt-2 text-[12px] text-paper-muted';

export const rsFieldLabelClass =
	'text-[11px] font-medium uppercase tracking-[0.06em] text-paper-muted';

export const rsSaveFieldClass = 'flex min-w-0 flex-col gap-1.5';

export const rsBtnClass =
	'inline-flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-paper border border-paper-border bg-paper-surface px-3 text-[13px] font-medium tracking-[0.02em] text-paper-fg transition-[background,transform] hover:bg-[color-mix(in_oklch,var(--fg)_3%,var(--surface))] active:translate-y-px disabled:cursor-not-allowed disabled:opacity-45';

export const rsBtnPrimaryClass =
	'inline-flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-paper border border-paper-fg bg-paper-fg px-3 text-[13px] font-medium tracking-[0.02em] !text-white transition-colors hover:bg-[color-mix(in_oklch,var(--fg)_88%,white)] disabled:cursor-not-allowed disabled:opacity-50';

export const rsBtnOutlineClass = rsBtnClass;

export const rsBtnIconClass =
	'inline-grid h-8 w-8 cursor-pointer place-items-center rounded-paper border border-transparent bg-transparent text-paper-muted transition-colors hover:border-[color-mix(in_oklch,var(--danger)_20%,var(--border))] hover:bg-[color-mix(in_oklch,var(--danger)_6%,transparent)] hover:text-[color:var(--danger)]';

export const rsSnapLinkClass =
	'font-medium text-secondary-default underline underline-offset-2 transition-colors hover:text-paper-fg';

export const rsPanelHeadClass =
	'flex items-center justify-between gap-3 border-b border-paper-border px-4 py-3.5';

export function formatSnapshotDate(value: string, mode: 'date' | 'datetime' | 'long' = 'date'): string {
	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) {
		return value;
	}
	if (mode === 'datetime') {
		return parsed.toLocaleString('en-AU', {
			day: 'numeric',
			month: 'short',
			year: 'numeric',
			hour: 'numeric',
			minute: '2-digit',
			hour12: true,
		});
	}
	return parsed.toLocaleDateString('en-AU', {
		day: 'numeric',
		month: 'short',
		year: 'numeric',
	});
}

function normalizeIsoDate(value: string): string {
	return value.slice(0, 10);
}

function periodDateRangeAt(
	period: DashboardPeriod,
	anchor: DateTime
): { start?: string; end?: string } {
	if (period === 'all') {
		return {};
	}
	const end = anchor.toISODate();
	if (end === null) {
		return {};
	}
	if (period === 'this-month') {
		const start = anchor.startOf('month').toISODate();
		return start === null ? {} : { start, end };
	}
	const monthsInclusive =
		period === 'last-3-months' ? 3 : period === 'last-6-months' ? 6 : 12;
	const start = anchor.minus({ months: monthsInclusive - 1 }).startOf('month').toISODate();
	return start === null ? {} : { start, end };
}

export function formatSnapshotPeriodLabel(start: string, end: string): string {
	const endAnchor = DateTime.fromISO(normalizeIsoDate(end));
	if (!endAnchor.isValid) {
		return formatPeriodRange(start, end);
	}
	const normStart = normalizeIsoDate(start);
	const normEnd = normalizeIsoDate(end);
	for (const period of BREAKDOWN_PRESET_PERIODS) {
		const range = periodDateRangeAt(period, endAnchor);
		if (range.start === normStart && range.end === normEnd) {
			return PERIOD_LABELS[period];
		}
	}
	return formatPeriodRange(start, end);
}

type ReportCoverageGridProps = {
	items: CoverageItem[] | null;
	loading?: boolean;
	hint?: string;
	className?: string;
};

export function ReportCoverageGrid({
	items,
	loading = false,
	hint,
	className,
}: ReportCoverageGridProps) {
	if (loading) {
		return (
			<div
				className={cn(
					rsCoveragePanelBaseClass,
					rsCoveragePanelDefaultClass,
					'text-[13px] text-paper-muted',
					className
				)}
			>
				Checking data coverage…
			</div>
		);
	}

	if (items === null || items.length === 0) {
		return null;
	}

	const hasWarn = items.some((item) => item.state === 'warn');

	return (
		<div
			className={cn(
				rsCoveragePanelBaseClass,
				hasWarn ? rsCoveragePanelWarnClass : rsCoveragePanelDefaultClass,
				className
			)}
		>
			<div className="mb-3 flex items-baseline justify-between gap-3">
				<h3 className="m-0 text-[12px] font-semibold uppercase tracking-[0.04em] text-paper-fg">
					Data coverage
				</h3>
				{hint ? <p className="m-0 text-[12px] text-paper-muted">{hint}</p> : null}
			</div>
			<div className="grid grid-cols-1 gap-2 min-[760px]:grid-cols-2 min-[1100px]:grid-cols-4">
				{items.map((item) => (
					<div
						key={item.key}
						className={cn(rsCoverageItemBaseClass, coverageItemSurfaceClass(item.state))}
					>
						<span
							className={cn(
								'grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full',
								item.state === 'ok' &&
									'bg-[color-mix(in_oklch,var(--success)_12%,var(--surface))] text-[color:var(--success)]',
								item.state === 'warn' &&
									'bg-[color-mix(in_oklch,var(--warn)_14%,var(--surface))] text-[oklch(45%_0.12_75)]'
							)}
							aria-hidden
						>
							{item.state === 'ok' ? (
								<Check className="h-3 w-3" strokeWidth={2.5} />
							) : (
								<AlertTriangle className="h-3 w-3" strokeWidth={2} />
							)}
						</span>
						<div className="min-w-0">
							<span className="block font-semibold text-paper-fg">{item.label}</span>
							<span className="block text-[11px] text-paper-muted">{item.detail}</span>
						</div>
					</div>
				))}
			</div>
		</div>
	);
}

type MetricRow = {
	label: string;
	sub?: string;
	value: string;
};

export function MetricRows({
	rows,
	totalLabel,
	totalValue,
}: {
	rows: MetricRow[];
	totalLabel: string;
	totalValue: string;
}) {
	return (
		<div className="flex flex-col">
			{rows.map((row) => (
				<div
					key={`${row.label}-${row.sub ?? ''}`}
					className="grid grid-cols-[1fr_auto] items-baseline gap-4 border-b border-paper-border py-3.5"
				>
					<div className="min-w-0">
						<span className="block text-[13px] text-paper-fg">{row.label}</span>
						{row.sub ? (
							<span className="mt-0.5 block text-[12px] text-paper-muted">{row.sub}</span>
						) : null}
					</div>
					<span className="shrink-0 font-mono text-[15px] font-medium tabular-nums text-paper-fg">
						{row.value}
					</span>
				</div>
			))}
			<div className="grid grid-cols-[1fr_auto] items-baseline gap-4 border-t border-paper-border pt-3.5">
				<span className="text-[13px] font-medium text-paper-fg">{totalLabel}</span>
				<span className="font-mono text-[20px] font-medium leading-none tracking-[-0.02em] tabular-nums text-paper-fg">
					{totalValue}
				</span>
			</div>
		</div>
	);
}

export function CoverageStatusPill({ state }: { state: 'ok' | 'warn' }) {
	if (state === 'warn') {
		return (
			<span
				className={cn(
					pillBaseClass,
					'border-[color-mix(in_oklch,var(--warn)_35%,var(--border))] bg-[color-mix(in_oklch,var(--warn)_10%,var(--surface))] text-[oklch(45%_0.12_75)]'
				)}
			>
				Needs review
			</span>
		);
	}
	return (
		<span
			className={cn(
				pillBaseClass,
				'border-[color-mix(in_oklch,var(--success)_30%,var(--border))] bg-[color-mix(in_oklch,var(--success)_8%,var(--surface))] text-[color:var(--success)]'
			)}
		>
			Sufficient
		</span>
	);
}

export function FrozenBadge() {
	return (
		<span className="ml-2 inline-flex h-[22px] items-center rounded-full border border-paper-border bg-paper px-2 align-middle text-[10px] font-medium uppercase tracking-[0.06em] text-paper-muted">
			Frozen
		</span>
	);
}

export function SurplusBar({ surplus, income }: { surplus: number; income: number }) {
	const pct = income > 0 ? Math.max(0, Math.min(100, (surplus / income) * 100)) : 0;
	const tone =
		pct < 20
			? 'bg-[color:var(--danger)]'
			: pct < 30
				? 'bg-[color:var(--warn)]'
				: 'bg-paper-fg';

	return (
		<div
			className="mt-4 h-2 overflow-hidden rounded border border-paper-border bg-paper"
			aria-hidden
		>
			<div
				className={cn('h-full rounded-[3px] transition-[width] duration-400', tone)}
				style={{ width: `${pct}%` }}
			/>
		</div>
	);
}

export function ReportKpiRow({
	items,
}: {
	items: Array<{ label: string; value: string; delta: string; valueClassName?: string }>;
}) {
	return (
		<section
			className="grid grid-cols-1 gap-3 min-[760px]:grid-cols-2 min-[1100px]:grid-cols-5"
			aria-label="Frozen snapshot summary"
		>
			{items.map((item) => (
				<article
					key={item.label}
					className="rounded-lg border border-paper-border bg-paper-surface px-[18px] py-4"
				>
					<p className={rsKpiLabelClass}>{item.label}</p>
					<p className={cn(rsKpiMoneyClass, 'mt-2', item.valueClassName)}>{item.value}</p>
					<p className={rsKpiDeltaClass}>{item.delta}</p>
				</article>
			))}
		</section>
	);
}

export function SectionEyebrow({ children, className }: { children: ReactNode; className?: string }) {
	return (
		<p
			className={cn(
				'mb-3 mt-5 first:mt-0 text-[12px] font-medium text-paper-fg',
				className
			)}
		>
			{children}
		</p>
	);
}

export function CoverageSummaryList({ items }: { items: CoverageItem[] }) {
	const warnCount = items.filter((item) => item.state === 'warn').length;

	return (
		<>
			<ul className="m-0 flex list-none flex-col p-0">
				{items.map((item) => (
					<li
						key={item.key}
						className="grid grid-cols-[1fr_auto] items-center gap-4 border-b border-paper-border py-3 text-[13px] last:border-b-0"
					>
						<div className="flex min-w-0 items-start gap-2">
							<span
								className={cn(
									'grid h-5 w-5 shrink-0 place-items-center rounded-full',
									item.state === 'ok' &&
										'bg-[color-mix(in_oklch,var(--success)_12%,var(--surface))] text-[color:var(--success)]',
									item.state === 'warn' &&
										'bg-[color-mix(in_oklch,var(--warn)_14%,var(--surface))] text-[oklch(45%_0.12_75)]'
								)}
								aria-hidden
							>
								{item.state === 'ok' ? (
									<Check className="h-3 w-3" strokeWidth={2.5} />
								) : (
									<AlertTriangle className="h-3 w-3" strokeWidth={2} />
								)}
							</span>
							<div className="min-w-0">
								<span className="block text-paper-fg">{item.label}</span>
								<span className="mt-0.5 block text-[12px] text-paper-muted">{item.detail}</span>
							</div>
						</div>
						<CoverageStatusPill state={item.state} />
					</li>
				))}
			</ul>
			{warnCount > 0 ? (
				<div className="mt-4 rounded-paper border border-[color-mix(in_oklch,var(--warn)_35%,var(--border))] bg-[color-mix(in_oklch,var(--warn)_8%,var(--surface))] px-3.5 py-3 text-[13px] text-paper-fg">
					<strong className="font-semibold">Review before sharing</strong>
					<span className="mt-1 block text-paper-muted">
						{warnCount} data area{warnCount === 1 ? '' : 's'} had warnings when this snapshot was
						saved. Figures are frozen as captured — review before sending to a broker.
					</span>
				</div>
			) : null}
		</>
	);
}
