import { cn } from '@/lib/utils/cn';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { glassCardClass } from './tokens';

type ModalSize = 'sm' | 'md' | 'lg';

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
};

const sizeClass: Record<ModalSize, string> = {
	sm: 'max-w-md',
	md: 'max-w-lg',
	lg: 'max-w-2xl',
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
}: ModalProps) {
	if (!open) {
		return null;
	}

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center p-4"
			aria-modal="true"
			role="dialog"
		>
			<button
				type="button"
				className="absolute inset-0 cursor-pointer bg-black/70 backdrop-blur-sm"
				aria-label="Close dialog"
				onClick={closeDisabled ? undefined : onClose}
				disabled={closeDisabled}
			/>
			<div
				className={cn(
					glassCardClass,
					'relative z-10 w-full p-5 shadow-2xl shadow-black/40',
					sizeClass[size]
				)}
			>
				<div className="mb-4 flex items-start justify-between gap-3">
					<div className="min-w-0">
						<h2
							className={cn(
								'text-lg font-semibold text-white',
								titleClassName
							)}
						>
							{title}
						</h2>
						{description !== undefined ? (
							<div className="mt-2 text-sm text-white/70">{description}</div>
						) : null}
					</div>
					<button
						type="button"
						onClick={onClose}
						disabled={closeDisabled}
						className="flex-shrink-0 cursor-pointer rounded-md p-2 text-white/70 hover:bg-white/10 hover:text-white disabled:opacity-50"
						aria-label="Close"
					>
						<X className="h-5 w-5" />
					</button>
				</div>
				{children}
				{footer !== undefined ? (
					<div className="mt-5 flex justify-end gap-3">{footer}</div>
				) : null}
			</div>
		</div>
	);
}
