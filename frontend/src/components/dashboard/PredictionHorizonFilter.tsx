import {
	PREDICTION_HORIZON_VALUES,
	predictionHorizonLabels,
	type PredictionHorizon,
} from '@/components/dashboard/period';

type PredictionHorizonFilterProps = {
	value: PredictionHorizon;
	onChange: (value: PredictionHorizon) => void;
	pending?: boolean;
	ariaLabel?: string;
};

const horizons = PREDICTION_HORIZON_VALUES;

export function PredictionHorizonFilter({
	value,
	onChange,
	pending = false,
	ariaLabel = 'Forecast horizon',
}: PredictionHorizonFilterProps) {
	const labels = predictionHorizonLabels();

	return (
		<div
			className="inline-flex max-w-full flex-wrap gap-0.5 rounded-[calc(var(--radius)+2px)] border border-paper-border bg-paper p-[3px] transition-opacity duration-300"
			role="group"
			aria-label={ariaLabel}
			aria-busy={pending}
		>
			{horizons.map((horizon) => (
				<button
					key={horizon}
					type="button"
					className={`h-[26px] cursor-pointer rounded-paper border-0 px-2.5 text-xs font-medium tracking-[0.02em] transition-colors ${
						value === horizon
							? 'bg-paper-surface text-paper-fg shadow-sm'
							: 'bg-transparent text-paper-muted hover:text-paper-fg'
					} ${pending && value === horizon ? 'opacity-80' : 'opacity-100'}`}
					aria-pressed={value === horizon}
					onClick={() => onChange(horizon)}
				>
					{labels[horizon]}
				</button>
			))}
		</div>
	);
}
