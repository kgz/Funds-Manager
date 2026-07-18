import { cn } from '@/lib/utils/cn';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { glassCardClass } from './tokens';

type ModalSize = 'sm' | 'md' | 'lg' | 'xl';

type ModalProps = {
	open: boolean;
	onClose: () => void;
	title: ReactNode;
	description?: ReactNode;
	children?: ReactNode;
	footer?: ReactNode;
	size?: ModalSize;
	titleClassName?: string;
	closeDisabled?: boolean;
	/** Tall modal: header/footer fixed, children area grows and scrolls internally */
	fillViewport?: boolean;
};

const sizeClass: Record<ModalSize, string> = {
	sm: 'max-w-md',
	md: 'max-w-lg',
	lg: 'max-w-2xl',
	xl: 'max-w-5xl',
};

export function Modal({
	open,
	onClose,
	title,
	description,
	children,
	footer,
	size = 'sm',
	titleClassName,
	closeDisabled = false,
	fillViewport = false,
}: ModalProps) {
	if (!open) {
		return null;
	}

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
			aria-modal="true"
			role="dialog"
		>
			<button
				type="button"
				className="absolute inset-0 cursor-pointer bg-paper-fg/35 backdrop-blur-sm"
				aria-label="Close dialog"
				onClick={closeDisabled ? undefined : onClose}
				disabled={closeDisabled}
			/>
			<div
				className={cn(
					glassCardClass,
					'relative z-10 flex w-full flex-col bg-paper-surface shadow-2xl shadow-paper-fg/15',
					fillViewport ? 'max-h-[calc(100dvh-2rem)]' : 'p-5',
					sizeClass[size]
				)}
			>
				<div
					className={cn(
						'flex shrink-0 items-start justify-between gap-3',
						fillViewport ? 'border-b border-paper-border px-5 py-4' : 'mb-4'
					)}
				>
					<div className="min-w-0">
						<h2
							className={cn(
								'text-lg font-semibold tracking-[-0.02em] text-paper-fg',
								titleClassName
							)}
						>
							{title}
						</h2>
						{description !== undefined ? (
							<div className="mt-2 text-[13px] text-paper-muted">{description}</div>
						) : null}
					</div>
					<button
						type="button"
						onClick={onClose}
						disabled={closeDisabled}
						className="flex-shrink-0 cursor-pointer rounded-md p-2 text-paper-muted hover:bg-paper hover:text-paper-fg disabled:opacity-50"
						aria-label="Close"
					>
						<X className="h-5 w-5" />
					</button>
				</div>
				{children !== undefined && fillViewport ? (
					<div className="flex min-h-0 flex-1 flex-col overflow-hidden px-5 py-4">
						{children}
					</div>
				) : (
					children
				)}
				{footer !== undefined ? (
					<div
						className={cn(
							'flex shrink-0 justify-end gap-3',
							fillViewport
								? 'border-t border-paper-border px-5 py-4'
								: 'mt-5'
						)}
					>
						{footer}
					</div>
				) : null}
			</div>
		</div>
	);
}
