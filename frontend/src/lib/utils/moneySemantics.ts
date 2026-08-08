import { plannedAmountTypeFromCents } from '@/types/plannedSpending';

/** Semantic money text — use instead of raw Tailwind green/red utility classes */
export const moneyDangerClass = 'text-[color:var(--danger)]';
export const moneySuccessClass = 'text-[color:var(--success)]';

export const moneyDangerColor = 'var(--danger)';
export const moneySuccessColor = 'var(--success)';

export function moneyClassForSignedCents(cents: number): string | undefined {
	if (cents > 0) {
		return moneySuccessClass;
	}
	if (cents < 0) {
		return moneyDangerClass;
	}
	return undefined;
}

export function moneyClassForPlannedCents(cents: number): string {
	return plannedAmountTypeFromCents(cents) === 'income'
		? moneySuccessClass
		: moneyDangerClass;
}

export function moneyColorForPlannedCents(cents: number): string {
	return plannedAmountTypeFromCents(cents) === 'income'
		? moneySuccessColor
		: moneyDangerColor;
}

export function formatSignedMoneyFromDollars(
	amount: number,
	forceSign: 'plus' | 'minus' | 'auto' = 'auto'
): string {
	const abs = Math.abs(amount).toLocaleString('en-AU', {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	});
	const body = `$${abs}`;
	if (forceSign === 'plus') {
		return `+${body}`;
	}
	if (forceSign === 'minus') {
		return `−${body}`;
	}
	if (amount > 0) {
		return `+${body}`;
	}
	if (amount < 0) {
		return `−${body}`;
	}
	return body;
}

export function formatSignedMoneyFromCents(
	cents: number,
	forceSign: 'plus' | 'minus' | 'auto' = 'auto'
): string {
	return formatSignedMoneyFromDollars(cents / 100, forceSign);
}

export function formatPlannedMoneyFromCents(cents: number): string {
	const magnitude = Math.abs(cents) / 100;
	const body = `$${magnitude.toLocaleString('en-AU', {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	})}`;
	return plannedAmountTypeFromCents(cents) === 'spending' ? `−${body}` : `+${body}`;
}

function formatMoneyDollars(n: number): string {
	return `$${n.toLocaleString('en-AU', {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	})}`;
}

export function formatMoneyNeg(amount: number): string {
	return `−${formatMoneyDollars(Math.abs(amount))}`;
}

export function formatMoneyPos(amount: number): string {
	return `+${formatMoneyDollars(amount)}`;
}

export function formatNetMoney(amount: number): string {
	if (amount === 0) {
		return formatMoneyDollars(0);
	}
	if (amount > 0) {
		return formatMoneyPos(amount);
	}
	return formatMoneyNeg(amount);
}
