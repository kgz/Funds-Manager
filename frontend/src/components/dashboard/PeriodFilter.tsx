import type { DashboardPeriod } from '@/components/dashboard/period';
import { PERIOD_LABELS } from '@/components/dashboard/period';
import { SegmentedControl } from '@/components/layout/SegmentedControl';

const PERIODS: DashboardPeriod[] = [
	'this-month',
	'last-3-months',
	'last-6-months',
	'last-12-months',
	'all',
];

type PeriodFilterProps = {
	value: DashboardPeriod;
	onChange: (value: DashboardPeriod) => void;
	periods?: DashboardPeriod[];
	pending?: boolean;
	ariaLabel?: string;
	className?: string;
};

export function PeriodFilter({
	value,
	onChange,
	periods = PERIODS,
	pending = false,
	ariaLabel = 'Dashboard period',
	className,
}: PeriodFilterProps) {
	return (
		<div aria-busy={pending} className={pending ? 'opacity-80' : undefined}>
			<SegmentedControl
				ariaLabel={ariaLabel}
				value={value}
				onChange={onChange}
				className={className}
				options={periods.map((period) => ({
					value: period,
					label: PERIOD_LABELS[period],
				}))}
			/>
		</div>
	);
}
