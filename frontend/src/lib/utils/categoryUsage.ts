export type CategoryUsageFields = {
	line_count?: number;
	spending_total?: number;
	income_total?: number;
};

export type UncategorizedUsage = {
	line_count: number;
	spending_total: number;
	income_total: number;
};

function formatDollars(value: number): string {
	const minimumFractionDigits = value % 1 !== 0 ? 2 : 0;
	return `$${value.toLocaleString('en-AU', {
		minimumFractionDigits,
		maximumFractionDigits: 2,
	})}`;
}

function formatLineCount(lines: number): string {
	return `${lines.toLocaleString('en-AU')} statement line${lines === 1 ? '' : 's'}`;
}

export function categoryUsageTitle(usage: CategoryUsageFields): string | null {
	const lines = usage.line_count ?? 0;
	if (lines === 0) {
		return null;
	}
	return `Across ${formatLineCount(lines)} from your imported bank statements`;
}

export function categoryUsageLabel(usage: CategoryUsageFields): string | null {
	const lines = usage.line_count ?? 0;
	if (lines === 0) {
		return null;
	}

	const spending = usage.spending_total ?? 0;
	const income = usage.income_total ?? 0;
	const parts: string[] = [];

	if (spending > 0) {
		parts.push(`${formatDollars(spending)} spent`);
	}
	if (income > 0) {
		parts.push(`${formatDollars(income)} received`);
	}

	if (parts.length > 0) {
		return parts.join(' · ');
	}

	return formatLineCount(lines);
}

export function uncategorizedBannerText(usage: UncategorizedUsage): string {
	const lines = usage.line_count;
	const spending = usage.spending_total;
	const income = usage.income_total;
	const parts: string[] = [formatLineCount(lines)];

	if (spending > 0) {
		parts.push(`${formatDollars(spending)} spending`);
	}
	if (income > 0) {
		parts.push(`${formatDollars(income)} income`);
	}

	if (parts.length === 1) {
		return `${parts[0]} still need a category.`;
	}

	return `${parts[0]} (${parts.slice(1).join(', ')}) still need a category.`;
}

export function categoryDeleteUsageWarning(usage: CategoryUsageFields): string | null {
	const lines = usage.line_count ?? 0;
	if (lines === 0) {
		return null;
	}

	const label = categoryUsageLabel(usage);
	const lineText = formatLineCount(lines);

	if (label && label !== lineText) {
		return `${label} across ${lineText} still use this category. They stay assigned but the category is hidden until restored.`;
	}

	return `${lineText} still use this category. They stay assigned but the category is hidden until restored.`;
}
