export const chartTheme = {
	grid: {
		stroke: 'rgba(255, 255, 255, 0.08)',
		strokeDasharray: '3 3',
	},
	axis: {
		stroke: 'rgba(255, 255, 255, 0.2)',
		tick: { fill: 'rgba(255, 255, 255, 0.65)', fontSize: 12 },
	},
	legend: {
		wrapperStyle: { fontSize: '12px', color: 'rgba(255, 255, 255, 0.8)', paddingTop: '12px' },
	},
} as const;

export const chartTooltipClass =
	'bg-gray-900/95 text-white p-2 rounded-md border border-white/15 text-sm shadow-lg';
