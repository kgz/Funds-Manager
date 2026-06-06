import type { DashboardPeriod } from '@/components/dashboard/period';
import { PERIOD_LABELS } from '@/components/dashboard/period';

const PERIODS: DashboardPeriod[] = ['this-month', 'last-3-months', 'all'];

type PeriodFilterProps = {
	value: DashboardPeriod;
	onChange: (value: DashboardPeriod) => void;
};

export function PeriodFilter({ value, onChange }: PeriodFilterProps) {
	return (
		<div
			className="inline-flex rounded-md border border-white/20 p-0.5"
			role="group"
			aria-label="Dashboard period"
		>
			{PERIODS.map((period) => (
				<button
					key={period}
					type="button"
					className={`rounded px-3 py-1.5 text-sm transition-colors ${
						value === period
							? 'border-secondary-default bg-secondary-default/20 text-white'
							: 'text-white/70 hover:text-white'
					}`}
					aria-pressed={value === period}
					onClick={() => onChange(period)}
				>
					{PERIOD_LABELS[period]}
				</button>
			))}
		</div>
	);
}
