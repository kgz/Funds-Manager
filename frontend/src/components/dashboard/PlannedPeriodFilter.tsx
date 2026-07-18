import {
	PLANNED_FORWARD_PRESET_PERIODS,
	plannedPeriodLabels,
	type PlannedPeriod,
} from '@/components/dashboard/period';

type PlannedPeriodFilterProps = {
	value: PlannedPeriod;
	onChange: (value: PlannedPeriod) => void;
	periods?: PlannedPeriod[];
	pending?: boolean;
	ariaLabel?: string;
};

export function PlannedPeriodFilter({
	value,
	onChange,
	periods = PLANNED_FORWARD_PRESET_PERIODS,
	pending = false,
	ariaLabel = 'Planned spending period',
}: PlannedPeriodFilterProps) {
	const labels = plannedPeriodLabels();

	return (
		<div
			className="inline-flex max-w-full flex-wrap rounded-md border border-paper-border p-0.5 transition-opacity duration-300"
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
							? 'border-secondary-default bg-secondary-default/15 text-secondary-default shadow-sm'
							: 'text-paper-muted hover:bg-paper hover:text-paper-fg'
					} ${pending && value === period ? 'opacity-80' : 'opacity-100'}`}
					aria-pressed={value === period}
					onClick={() => onChange(period)}
				>
					{labels[period]}
				</button>
			))}
		</div>
	);
}
