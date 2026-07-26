import { useCallback, useEffect, useState } from 'react';
import { Copy, Link2, Trash2 } from 'lucide-react';
import { InlineAlert } from '@/components/layout/InlineAlert';
import {
	glassCardClass,
	inputDarkClass,
	panelHintClass,
	panelTitleClass,
} from '@/components/layout/tokens';
import { cn } from '@/lib/utils/cn';
import { rsBtnPrimaryClass } from '@/pages/report-snapshots/shared';
import {
	createBrokerReportShare,
	fetchBrokerReportShares,
	revokeBrokerReportShare,
	shareUrl,
	type BrokerReportShare,
	type ReportRedaction,
} from '@/types/broker-report';

type SharePanelProps = {
	snapshotId: number;
};

export function SharePanel({ snapshotId }: SharePanelProps) {
	const [shares, setShares] = useState<BrokerReportShare[]>([]);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [copiedToken, setCopiedToken] = useState<string | null>(null);
	const [hideAccountNumbers, setHideAccountNumbers] = useState(true);
	const [merchantPatterns, setMerchantPatterns] = useState('');

	const load = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const data = await fetchBrokerReportShares(snapshotId);
			setShares(data);
		} catch (err: unknown) {
			setError(err instanceof Error ? err.message : 'Failed to load shares');
			setShares([]);
		} finally {
			setLoading(false);
		}
	}, [snapshotId]);

	useEffect(() => {
		void load();
	}, [load]);

	const handleCreate = async () => {
		setSaving(true);
		setError(null);
		const redaction: ReportRedaction = {
			hideAccountNumbers,
			hiddenMerchantPatterns: merchantPatterns
				.split('\n')
				.map((line) => line.trim())
				.filter((line) => line.length > 0),
		};
		try {
			const share = await createBrokerReportShare(snapshotId, redaction);
			setShares((current) => [share, ...current]);
		} catch (err: unknown) {
			setError(err instanceof Error ? err.message : 'Failed to create share link');
		} finally {
			setSaving(false);
		}
	};

	const handleRevoke = async (shareId: number) => {
		try {
			await revokeBrokerReportShare(snapshotId, shareId);
			setShares((current) => current.filter((share) => share.id !== shareId));
		} catch (err: unknown) {
			setError(err instanceof Error ? err.message : 'Failed to revoke share');
		}
	};

	const handleCopy = async (share: BrokerReportShare) => {
		const url = shareUrl(share.urlPath);
		try {
			await navigator.clipboard.writeText(url);
			setCopiedToken(share.token);
			window.setTimeout(() => setCopiedToken(null), 2000);
		} catch {
			setError('Could not copy link — copy manually from the list below.');
		}
	};

	return (
		<div className={`${glassCardClass} broker-report-no-print space-y-4 p-4`}>
			<div className="flex items-center gap-2">
				<Link2 size="1rem" className="text-paper-muted" aria-hidden />
				<h2 className={panelTitleClass}>Share link (optional)</h2>
			</div>
			<p className={panelHintClass}>
				Send a read-only copy if needed. Revoke the link when you are done.
			</p>
			{error !== null ? <InlineAlert variant="error">{error}</InlineAlert> : null}
			<label className="flex items-center gap-2 text-sm text-paper-fg">
				<input
					type="checkbox"
					checked={hideAccountNumbers}
					onChange={(event) => setHideAccountNumbers(event.target.checked)}
				/>
				Hide account numbers
			</label>
			<label className="block space-y-1 text-sm text-paper-fg">
				<span>Merchant patterns to redact (one per line)</span>
				<textarea
					className={cn(inputDarkClass, 'min-h-20 w-full px-3 py-2')}
					value={merchantPatterns}
					onChange={(event) => setMerchantPatterns(event.target.value)}
					placeholder="e.g. coles&#10;woolworths"
				/>
			</label>
			<button
				type="button"
				className={rsBtnPrimaryClass}
				disabled={saving}
				onClick={() => void handleCreate()}
			>
				{saving ? 'Creating…' : 'Create share link'}
			</button>
			{loading ? <p className={panelHintClass}>Loading shares…</p> : null}
			{shares.length > 0 ? (
				<ul className="space-y-2 text-sm">
					{shares.map((share) => (
						<li
							key={share.id}
							className="flex flex-wrap items-center justify-between gap-2 rounded-paper border border-paper-border bg-paper px-3 py-2"
						>
							<span className="font-mono text-xs text-paper-muted">
								{shareUrl(share.urlPath)}
							</span>
							<div className="flex gap-2">
								<button
									type="button"
									className="inline-flex cursor-pointer items-center gap-1 text-paper-muted transition-colors hover:text-paper-fg"
									onClick={() => void handleCopy(share)}
								>
									<Copy size="0.875rem" aria-hidden />
									{copiedToken === share.token ? 'Copied' : 'Copy'}
								</button>
								<button
									type="button"
									className="inline-flex cursor-pointer items-center gap-1 text-[color:var(--danger)] transition-colors hover:opacity-80"
									onClick={() => void handleRevoke(share.id)}
								>
									<Trash2 size="0.875rem" aria-hidden />
									Revoke
								</button>
							</div>
						</li>
					))}
				</ul>
			) : null}
		</div>
	);
}
