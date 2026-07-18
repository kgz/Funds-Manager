export const chartSeriesPalette = [
	'#4a6fa5',
	'#3d8b6e',
	'#8b6b4a',
	'#c47a4a',
	'#6b7a8b',
	'#7b6d91',
	'#9a6b5f',
	'#5f8179',
	'#a18f5d',
	'#7c8796',
];

export const chartColors = {
	receiving: '#2f7d5a',
	spending: '#b85c50',
	assets: '#3d8b6e',
	debts: '#b85c50',
	netWorth: '#4a6fa5',
	trend: '#b07a33',
	mixed: '#7b6d91',
	other: '#8b929a',
	surface: '#ffffff',
};

export function chartSeriesColor(index: number): string {
	return chartSeriesPalette[Math.abs(index) % chartSeriesPalette.length];
}

export function chartSeriesColorForKey(key: string): string {
	let hash = 0;
	for (let index = 0; index < key.length; index += 1) {
		hash = (hash * 31 + key.charCodeAt(index)) | 0;
	}
	return chartSeriesColor(hash);
}

const chartFontFamily =
	'"IBM Plex Sans", -apple-system, BlinkMacSystemFont, system-ui, sans-serif';

export const chartTheme = {
	grid: {
		stroke: 'oklch(18% 0.012 250 / 0.08)',
		strokeDasharray: '3 3',
	},
	axis: {
		stroke: 'oklch(18% 0.012 250 / 0.16)',
		tick: {
			fill: 'oklch(54% 0.012 250)',
			fontSize: 12,
			fontFamily: chartFontFamily,
		},
	},
	legend: {
		wrapperStyle: {
			fontSize: '12px',
			fontFamily: chartFontFamily,
			color: 'oklch(54% 0.012 250)',
			paddingTop: '12px',
		},
	},
} as const;

export const chartTooltipClass =
	'bg-paper-surface font-sans text-[13px] text-paper-fg p-2 rounded-paper border border-paper-border shadow-lg';