const AU_GST_RATE = 0.1;

export type PackagePeriod = 'week' | 'month' | 'year';

export function readPackagePeriod(value: string): PackagePeriod | null {
	if (value === 'week' || value === 'month' || value === 'year') {
		return value;
	}
	return null;
}

const WEEKS_PER_MONTH = 52 / 12;

export function packageAmountToMonthly(amount: number, period: PackagePeriod): number {
	switch (period) {
		case 'week':
			return amount * WEEKS_PER_MONTH;
		case 'month':
			return amount;
		case 'year':
			return amount / 12;
	}
}

export function monthlyToPackageAmount(monthly: number, period: PackagePeriod): number {
	switch (period) {
		case 'week':
			return monthly / WEEKS_PER_MONTH;
		case 'month':
			return monthly;
		case 'year':
			return monthly * 12;
	}
}

export function yearlyGstFromMonthly(monthly: number): {
	exGst: number;
	incGst: number;
} {
	const exGst = Math.round(monthly * 12 * 100) / 100;
	const incGst = Math.round(exGst * (1 + AU_GST_RATE) * 100) / 100;
	return { exGst, incGst };
}
