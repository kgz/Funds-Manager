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
			className="inline-flex max-w-full flex-wrap rounded-md border border-paper-border p-0.5 transition-opacity duration-300"
			role="group"
			aria-label={ariaLabel}
			aria-busy={pending}
		>
			{horizons.map((horizon) => (
				<button
					key={horizon}
					type="button"
					className={`cursor-pointer rounded px-3 py-1.5 text-sm transition-all duration-200 ease-out ${
						value === horizon
							? 'border-secondary-default bg-secondary-default/15 text-secondary-default shadow-sm'
							: 'text-paper-muted hover:bg-paper hover:text-paper-fg'
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
