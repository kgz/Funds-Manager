import type { DashboardPeriod } from '@/components/dashboard/period';
import { PERIOD_LABELS } from '@/components/dashboard/period';

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
};

export function PeriodFilter({
	value,
	onChange,
	periods = PERIODS,
	pending = false,
	ariaLabel = 'Dashboard period',
}: PeriodFilterProps) {
	return (
		<div
			className="inline-flex max-w-full flex-wrap rounded-md border border-white/20 p-0.5 transition-opacity duration-300"
			role="group"
			aria-label={ariaLabel}
			aria-busy={pending}
		>
			{periods.map((period) => (
				<button
					key={period}
					type="button"
					className={`cursor-pointer rounded px-3 py-1.5 text-sm transition-all duration-200 ease-out ${
						value === period
							? 'border-secondary-default bg-secondary-default/20 text-white shadow-sm'
							: 'text-white/70 hover:bg-white/5 hover:text-white'
					} ${pending && value === period ? 'opacity-80' : 'opacity-100'}`}
					aria-pressed={value === period}
					onClick={() => onChange(period)}
				>
					{PERIOD_LABELS[period]}
				</button>
			))}
		</div>
	);
}
