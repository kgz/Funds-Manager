export function formatChartAxisCompactMoney(value: number): string {
	const abs = Math.abs(value);
	const sign = value < 0 ? '−' : '';

	if (abs >= 1_000_000) {
		const millions = abs / 1_000_000;
		const rounded =
			millions >= 10
				? Math.round(millions)
				: Math.round(millions * 10) / 10;
		const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
		return `${sign}$${text}m`;
	}

	if (abs >= 1_000) {
		return `${sign}$${Math.round(abs / 1_000)}k`;
	}

	return `${sign}$${Math.round(abs)}`;
}
