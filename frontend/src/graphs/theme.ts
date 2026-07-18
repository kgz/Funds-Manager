export const chartTheme = {
	grid: {
		stroke: 'oklch(18% 0.012 250 / 0.08)',
		strokeDasharray: '3 3',
	},
	axis: {
		stroke: 'oklch(18% 0.012 250 / 0.16)',
		tick: { fill: 'oklch(54% 0.012 250)', fontSize: 12 },
	},
	legend: {
		wrapperStyle: {
			fontSize: '12px',
			color: 'oklch(54% 0.012 250)',
			paddingTop: '12px',
		},
	},
} as const;

export const chartTooltipClass =
	'bg-paper-surface text-paper-fg p-2 rounded-paper border border-paper-border text-sm shadow-lg';
