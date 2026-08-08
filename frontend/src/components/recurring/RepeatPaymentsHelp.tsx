import { cn } from '@/lib/utils/cn';
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
				className={cn(
					'grid h-[22px] w-[22px] cursor-pointer place-items-center rounded-full border border-paper-border bg-paper-surface text-paper-muted transition-[background,color,border-color] duration-150 hover:border-[color-mix(in_oklch,var(--fg)_20%,var(--border))] hover:text-paper-fg',
					open &&
						'border-[color-mix(in_oklch,var(--accent)_40%,var(--border))] bg-[color-mix(in_oklch,var(--accent)_6%,var(--surface))] text-secondary-default'
				)}
				aria-label="How repeat payments are detected"
				aria-expanded={open}
				onClick={() => setOpen((current) => !current)}
			>
				<svg
					width="13"
					height="13"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					strokeLinecap="round"
					strokeLinejoin="round"
					aria-hidden="true"
				>
					<circle cx="12" cy="12" r="10" />
					<path d="M9.1 9a3 3 0 0 1 5.82 1c0 2-3 3-3 3" />
					<path d="M12 17h.01" />
				</svg>
			</button>
			{open ? (
				<div
					className="absolute left-0 top-[calc(100%+8px)] z-50 w-80 rounded-[10px] border border-paper-border bg-paper-surface p-3.5 text-[12.5px] leading-normal shadow-[0_16px_44px_color-mix(in_oklch,var(--fg)_16%,transparent)]"
					role="dialog"
					aria-label="Repeat payments help"
				>
					<p className="m-0 mb-2 text-paper-muted">
						We look for charges or deposits that show up more than once with a
						similar amount and timing. Each row is an estimate from your imported
						transactions.
					</p>
					<p className="m-0 mb-2 text-paper-muted">
						<strong className="font-semibold text-paper-fg">
							Estimated monthly totals
						</strong>{' '}
						add up what each pattern would cost or earn per month, based on how
						often it usually appears.
					</p>
					<p className="m-0 mb-2 text-paper-muted">
						<strong className="font-semibold text-paper-fg">Match score</strong>{' '}
						is higher when the amount and spacing are more consistent.
					</p>
					<p className="m-0 text-paper-muted">
						Lower &ldquo;minimum occurrences&rdquo; to surface weaker patterns.
					</p>
				</div>
			) : null}
		</div>
	);
}
