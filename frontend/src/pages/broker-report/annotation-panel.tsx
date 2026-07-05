import { useCallback, useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { InlineAlert } from '@/components/layout/InlineAlert';
import { glassCardClass } from '@/components/layout/tokens';
import {
	createBrokerReportAnnotation,
	deleteBrokerReportAnnotation,
	fetchBrokerReportAnnotations,
	type BrokerReportAnnotation,
} from '@/types/broker-report';

type AnnotationPanelProps = {
	snapshotId: number;
	onChanged: () => void;
};

export function AnnotationPanel({ snapshotId, onChanged }: AnnotationPanelProps) {
	const [items, setItems] = useState<BrokerReportAnnotation[]>([]);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [transactionId, setTransactionId] = useState('');
	const [note, setNote] = useState('');
	const [excludeFromAnalysis, setExcludeFromAnalysis] = useState(false);

	const load = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const data = await fetchBrokerReportAnnotations(snapshotId);
			setItems(data);
		} catch (err: unknown) {
			setError(err instanceof Error ? err.message : 'Failed to load annotations');
			setItems([]);
		} finally {
			setLoading(false);
		}
	}, [snapshotId]);

	useEffect(() => {
		void load();
	}, [load]);

	const handleCreate = async (event: React.FormEvent) => {
		event.preventDefault();
		const parsedId = Number.parseInt(transactionId, 10);
		if (!Number.isFinite(parsedId) || note.trim().length === 0) {
			setError('Transaction id and note are required');
			return;
		}
		setSaving(true);
		setError(null);
		try {
			await createBrokerReportAnnotation(snapshotId, {
				transactionId: parsedId,
				note: note.trim(),
				excludeFromAnalysis,
			});
			setTransactionId('');
			setNote('');
			setExcludeFromAnalysis(false);
			await load();
			onChanged();
		} catch (err: unknown) {
			setError(err instanceof Error ? err.message : 'Failed to add annotation');
		} finally {
			setSaving(false);
		}
	};

	const handleDelete = async (annotationId: number) => {
		try {
			await deleteBrokerReportAnnotation(snapshotId, annotationId);
			await load();
			onChanged();
		} catch (err: unknown) {
			setError(err instanceof Error ? err.message : 'Failed to delete annotation');
		}
	};

	return (
		<div className={`${glassCardClass} broker-report-no-print space-y-4 p-4`}>
			<h2 className="text-sm font-semibold text-white">Annotations</h2>
			<p className="text-sm text-white/60">
				Flag one-off transactions so they are not mistaken for regular spending.
			</p>
			{error !== null ? <InlineAlert variant="error">{error}</InlineAlert> : null}
			<form className="space-y-3" onSubmit={(event) => void handleCreate(event)}>
				<label className="block space-y-1 text-sm text-white/80">
					<span>Transaction id</span>
					<input
						type="number"
						className="w-full rounded border border-white/10 bg-black/30 px-3 py-2 text-white"
						value={transactionId}
						onChange={(event) => setTransactionId(event.target.value)}
					/>
				</label>
				<label className="block space-y-1 text-sm text-white/80">
					<span>Note</span>
					<textarea
						className="min-h-16 w-full rounded border border-white/10 bg-black/30 px-3 py-2 text-white"
						value={note}
						onChange={(event) => setNote(event.target.value)}
					/>
				</label>
				<label className="flex items-center gap-2 text-sm text-white/80">
					<input
						type="checkbox"
						checked={excludeFromAnalysis}
						onChange={(event) => setExcludeFromAnalysis(event.target.checked)}
					/>
					Flag as exclude from analysis
				</label>
				<button
					type="submit"
					className="rounded bg-secondary-default px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
					disabled={saving}
				>
					{saving ? 'Saving…' : 'Add annotation'}
				</button>
			</form>
			{loading ? <p className="text-sm text-white/50">Loading annotations…</p> : null}
			{items.length > 0 ? (
				<ul className="space-y-2 text-sm text-white/80">
					{items.map((item) => (
						<li
							key={item.id}
							className="flex items-start justify-between gap-2 rounded border border-white/10 bg-black/20 px-3 py-2"
						>
							<div>
								<p className="font-medium text-white">
									#{item.transactionId} · {item.transactionDescription}
								</p>
								<p className="text-white/60">
									{item.transactionDate} · {item.note}
									{item.excludeFromAnalysis ? ' · exclude' : ''}
								</p>
							</div>
							<button
								type="button"
								className="text-red-300 hover:text-red-200"
								onClick={() => void handleDelete(item.id)}
							>
								<Trash2 size="0.875rem" aria-hidden />
							</button>
						</li>
					))}
				</ul>
			) : null}
		</div>
	);
}
