import { chartTooltipClass } from '@/graphs/theme';
import { HelpCircle } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

export function RepeatPaymentsHelp() {
	const [open, setOpen] = useState(false);
	const rootRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!open) {
			return;
		}
		const onPointerDown = (event: PointerEvent) => {
			const target = event.target;
			if (target instanceof Node && rootRef.current?.contains(target)) {
				return;
			}
			setOpen(false);
		};
		document.addEventListener('pointerdown', onPointerDown);
		return () => document.removeEventListener('pointerdown', onPointerDown);
	}, [open]);

	return (
		<div ref={rootRef} className="relative inline-flex items-center">
			<button
				type="button"
				className="cursor-pointer text-paper-muted transition-colors hover:text-paper-muted"
				aria-label="How repeat payments are detected"
				aria-expanded={open}
				onClick={() => setOpen((current) => !current)}
			>
				<HelpCircle className="h-4 w-4" />
			</button>
			{open ? (
				<div
					className={`${chartTooltipClass} absolute left-0 top-full z-50 mt-2 w-80 space-y-2 text-left text-sm`}
					role="dialog"
					aria-label="Repeat payments help"
				>
					<p className="text-paper-fg">
						We look for charges or deposits that show up more than once with a
						similar amount and timing. Each row is an estimate from your imported
						transactions.
					</p>
					<p className="text-paper-muted">
						<strong className="font-medium text-paper-fg">
							Estimated monthly totals
						</strong>{' '}
						add up what each pattern would cost or earn per month, based on how
						often it usually appears.
					</p>
					<p className="text-paper-muted">
						<strong className="font-medium text-paper-fg">Match score</strong>{' '}
						is higher when the amount and spacing are more consistent.
					</p>
					<p className="text-paper-muted">
						Lower &ldquo;minimum occurrences&rdquo; to surface weaker patterns.
					</p>
				</div>
			) : null}
		</div>
	);
}
