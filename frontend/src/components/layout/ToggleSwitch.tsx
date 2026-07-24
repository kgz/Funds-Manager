import { cn } from '@/lib/utils/cn';

type ToggleSwitchProps = {
	checked: boolean;
	onChange: (checked: boolean) => void;
	disabled?: boolean;
	ariaLabel: string;
};

export function ToggleSwitch({
	checked,
	onChange,
	disabled = false,
	ariaLabel,
}: ToggleSwitchProps) {
	return (
		<button
			type="button"
			role="switch"
			aria-checked={checked}
			aria-label={ariaLabel}
			disabled={disabled}
			onClick={() => onChange(!checked)}
			className={cn(
				'relative h-5 w-9 shrink-0 rounded-full border border-paper-border bg-paper transition-colors',
				'disabled:cursor-not-allowed disabled:opacity-50',
				checked && 'border-paper-fg bg-paper-fg'
			)}
		>
			<span
				className={cn(
					'absolute top-0.5 left-0.5 h-3.5 w-3.5 rounded-full bg-paper-muted transition-transform',
					checked && 'translate-x-4 bg-paper-surface'
				)}
				aria-hidden
			/>
		</button>
	);
}
