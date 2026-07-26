import { cn } from '@/lib/utils/cn';
import {
	leSegmentButtonActiveClass,
	leSegmentButtonClass,
	leSegmentedClass,
} from '@/pages/lender-expenses/shared';

type SegmentOption<T extends string> = {
	value: T;
	label: string;
	activeClassName?: string;
	inactiveClassName?: string;
};

type SegmentedControlProps<T extends string> = {
	value: T;
	onChange: (value: T) => void;
	options: SegmentOption<T>[];
	ariaLabel: string;
	className?: string;
};

export function SegmentedControl<T extends string>({
	value,
	onChange,
	options,
	ariaLabel,
	className,
}: SegmentedControlProps<T>) {
	return (
		<div className={cn(leSegmentedClass, className)} role="group" aria-label={ariaLabel}>
			{options.map((option) => {
				const active = value === option.value;
				return (
					<button
						key={option.value}
						type="button"
						className={cn(
							leSegmentButtonClass,
							active
								? (option.activeClassName ?? leSegmentButtonActiveClass)
								: option.inactiveClassName
						)}
						aria-pressed={active}
						onClick={() => onChange(option.value)}
					>
						{option.label}
					</button>
				);
			})}
		</div>
	);
}
