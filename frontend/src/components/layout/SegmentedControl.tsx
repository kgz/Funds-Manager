import { cn } from '@/lib/utils/cn';

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
		<div
			className={cn(
				'inline-flex shrink-0 rounded-paper border border-paper-border p-0.5',
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
							'cursor-pointer rounded px-2.5 py-1 text-xs font-medium tracking-[0.02em] transition-colors',
							active
								? (option.activeClassName ??
									'bg-paper-surface text-paper-fg shadow-sm')
								: (option.inactiveClassName ??
									'text-paper-muted hover:text-paper-fg')
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
