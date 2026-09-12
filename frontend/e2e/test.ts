import { createHash, randomBytes } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { test as baseTest } from '@playwright/test';

const istanbulCLIOutput = path.join(process.cwd(), '.nyc_output');
const coverageEnabled = process.env.E2E_COVERAGE === '1';

type IstanbulCoverage = Record<string, unknown>;

declare global {
	interface Window {
		__coverage__?: IstanbulCoverage;
		collectIstanbulCoverage?: (coverageJSON: string) => void;
	}
}

function generateUUID(): string {
	return randomBytes(16).toString('hex');
}

async function flushCoverageFromPages(
	pages: { evaluate: (fn: () => void) => Promise<void> }[]
): Promise<void> {
	for (const page of pages) {
		await page.evaluate(() => {
			const coverage = window.__coverage__;
			if (coverage && window.collectIstanbulCoverage) {
				window.collectIstanbulCoverage(JSON.stringify(coverage));
			}
		});
	}
}

export const test = baseTest.extend({
	context: async ({ context }, use) => {
		if (!coverageEnabled) {
			await use(context);
			return;
		}

		await mkdir(istanbulCLIOutput, { recursive: true });

		await context.exposeFunction(
			'collectIstanbulCoverage',
			async (coverageJSON: string) => {
				if (!coverageJSON) {
					return;
				}
				const hash = createHash('sha1').update(coverageJSON).digest('hex').slice(0, 12);
				const file = path.join(
					istanbulCLIOutput,
					`playwright_coverage_${generateUUID()}_${hash}.json`
				);
				await writeFile(file, coverageJSON, 'utf8');
			}
		);

		await context.addInitScript(() => {
			window.addEventListener('beforeunload', () => {
				const coverage = window.__coverage__;
				if (coverage && window.collectIstanbulCoverage) {
					window.collectIstanbulCoverage(JSON.stringify(coverage));
				}
			});
		});

		await use(context);
		await flushCoverageFromPages(context.pages());
	},
});

export const expect = test.expect;
