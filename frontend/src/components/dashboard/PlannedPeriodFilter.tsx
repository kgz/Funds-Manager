import {
	PLANNED_FORWARD_PRESET_PERIODS,
	plannedPeriodLabels,
	type PlannedPeriod,
} from '@/components/dashboard/period';
import {
	leSegmentButtonActiveClass,
	leSegmentButtonClass,
	leSegmentedClass,
} from '@/pages/lender-expenses/shared';
import { cn } from '@/lib/utils/cn';

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
			className={cn(leSegmentedClass, pending && 'opacity-80')}
			role="group"
			aria-label={ariaLabel}
			aria-busy={pending}
		>
			{periods.map((period) => (
				<button
					key={period}
					type="button"
					className={cn(
						leSegmentButtonClass,
						value === period && leSegmentButtonActiveClass
					)}
					aria-pressed={value === period}
					onClick={() => onChange(period)}
				>
					{labels[period]}
				</button>
			))}
		</div>
	);
}
