import { cn } from '@/lib/utils/cn';

type SegmentOption<T extends string> = {
	value: T;
	label: string;
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
		<div
			className={cn(
				'inline-flex shrink-0 rounded-md border border-white/20 p-0.5',
				className
			)}
			role="group"
			aria-label={ariaLabel}
		>
			{options.map((option) => {
				const active = value === option.value;
				return (
					<button
						key={option.value}
						type="button"
						className={cn(
							'cursor-pointer rounded px-3 py-1.5 text-sm transition-colors',
							active
								? 'bg-secondary-default/20 text-white shadow-sm'
								: 'text-white/70 hover:bg-white/5 hover:text-white'
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
