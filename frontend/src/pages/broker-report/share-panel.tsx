import { useCallback, useEffect, useState } from 'react';
import { Copy, Link2, Trash2 } from 'lucide-react';
import { InlineAlert } from '@/components/layout/InlineAlert';
import { glassCardClass } from '@/components/layout/tokens';
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
				<Link2 size="1rem" aria-hidden />
				<h2 className="text-sm font-semibold text-white">Share link (optional)</h2>
			</div>
			<p className="text-sm text-white/60">
				Send a read-only copy if needed. Revoke the link when you are done.
			</p>
			{error !== null ? <InlineAlert variant="error">{error}</InlineAlert> : null}
			<label className="flex items-center gap-2 text-sm text-white/80">
				<input
					type="checkbox"
					checked={hideAccountNumbers}
					onChange={(event) => setHideAccountNumbers(event.target.checked)}
				/>
				Hide account numbers
			</label>
			<label className="block space-y-1 text-sm text-white/80">
				<span>Merchant patterns to redact (one per line)</span>
				<textarea
					className="min-h-20 w-full rounded border border-white/10 bg-black/30 px-3 py-2 text-white"
					value={merchantPatterns}
					onChange={(event) => setMerchantPatterns(event.target.value)}
					placeholder="e.g. coles&#10;woolworths"
				/>
			</label>
			<button
				type="button"
				className="rounded bg-secondary-default px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
				disabled={saving}
				onClick={() => void handleCreate()}
			>
				{saving ? 'Creating…' : 'Create share link'}
			</button>
			{loading ? <p className="text-sm text-white/50">Loading shares…</p> : null}
			{shares.length > 0 ? (
				<ul className="space-y-2 text-sm">
					{shares.map((share) => (
						<li
							key={share.id}
							className="flex flex-wrap items-center justify-between gap-2 rounded border border-white/10 bg-black/20 px-3 py-2"
						>
							<span className="font-mono text-xs text-white/70">
								{shareUrl(share.urlPath)}
							</span>
							<div className="flex gap-2">
								<button
									type="button"
									className="inline-flex items-center gap-1 text-white/80 hover:text-white"
									onClick={() => void handleCopy(share)}
								>
									<Copy size="0.875rem" aria-hidden />
									{copiedToken === share.token ? 'Copied' : 'Copy'}
								</button>
								<button
									type="button"
									className="inline-flex items-center gap-1 text-red-300 hover:text-red-200"
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
