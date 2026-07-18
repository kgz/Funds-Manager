import { cn } from '@/lib/utils/cn';
import { AlertCircle } from 'lucide-react';
import { buttonOutlineClass } from './tokens';

type ErrorStateProps = {
	title?: string;
	message: string;
	onRetry?: () => void;
	retryLabel?: string;
	className?: string;
};

export function ErrorState({
	title = 'Something went wrong',
	message,
	onRetry,
	retryLabel = 'Retry',
	className,
}: ErrorStateProps) {
	return (
		<div
			className={cn(
				'flex min-h-[40vh] items-center justify-center p-4 md:p-6',
				className
			)}
		>
			<div className="max-w-md rounded-paper border border-red-500/30 bg-red-50 p-8 text-center">
				<AlertCircle className="mx-auto h-12 w-12 text-red-600" />
				<h2 className="mt-4 text-lg font-semibold tracking-[-0.02em] text-paper-fg">{title}</h2>
				<p className="mt-2 text-[13px] text-paper-muted">{message}</p>
				{onRetry !== undefined ? (
					<button
						type="button"
						onClick={onRetry}
						className={cn(buttonOutlineClass, 'mt-6')}
					>
						{retryLabel}
					</button>
				) : null}
			</div>
		</div>
	);
}
