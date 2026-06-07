import { cn } from '@/lib/utils/cn';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';

type DrawerProps = {
	open: boolean;
	onClose: () => void;
	eyebrow?: ReactNode;
	title: ReactNode;
	description?: ReactNode;
	headerActions?: ReactNode;
	children: ReactNode;
	footer?: ReactNode;
	className?: string;
	panelClassName?: string;
};

export function Drawer({
	open,
	onClose,
	eyebrow,
	title,
	description,
	headerActions,
	children,
	footer,
	className,
	panelClassName,
}: DrawerProps) {
	if (!open) {
		return null;
	}

	return (
		<>
			<button
				type="button"
				className="fixed inset-0 z-40 cursor-pointer bg-black/50 transition-opacity duration-200"
				aria-label="Close panel"
				onClick={onClose}
			/>
			<aside
				className={cn(
					'fixed top-0 right-0 z-50 flex h-full w-full max-w-md flex-col',
					'border-l border-white/10 bg-gray-950 shadow-2xl',
					panelClassName
				)}
			>
				<div
					className={cn(
						'flex shrink-0 flex-col gap-3 border-b border-white/10 p-4',
						className
					)}
				>
					<div className="flex items-start justify-between gap-3">
						<div className="min-w-0">
							{eyebrow !== undefined ? (
								<p className="text-xs font-medium uppercase tracking-wide text-white/50">
									{eyebrow}
								</p>
							) : null}
							<h2 className="text-lg font-semibold text-white">{title}</h2>
							{description !== undefined ? (
								<div className="mt-1 text-sm text-white/70">{description}</div>
							) : null}
						</div>
						<button
							type="button"
							className="shrink-0 cursor-pointer rounded-md p-2 text-white/70 hover:bg-white/10 hover:text-white"
							aria-label="Close"
							onClick={onClose}
						>
							<X className="h-5 w-5" />
						</button>
					</div>
					{headerActions}
				</div>
				<div className="min-h-0 flex-1 overflow-y-auto p-4">{children}</div>
				{footer !== undefined ? (
					<div className="shrink-0 border-t border-white/10 p-4">{footer}</div>
				) : null}
			</aside>
		</>
	);
}
