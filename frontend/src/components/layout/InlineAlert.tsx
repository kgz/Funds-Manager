import { cn } from '@/lib/utils/cn';
import { AlertCircle, AlertTriangle, X } from 'lucide-react';
import type { ReactNode } from 'react';

type InlineAlertVariant = 'error' | 'warning' | 'info';

type InlineAlertProps = {
	variant?: InlineAlertVariant;
	children: ReactNode;
	onDismiss?: () => void;
	className?: string;
};

const variantStyles: Record<InlineAlertVariant, string> = {
	error: 'bg-red-50 border-red-200 text-red-800',
	warning: 'bg-amber-50 border-amber-200 text-amber-900',
	info: 'bg-paper border-paper-border text-paper-fg',
};

const variantIcons: Record<InlineAlertVariant, typeof AlertCircle> = {
	error: AlertCircle,
	warning: AlertTriangle,
	info: AlertCircle,
};

export function InlineAlert({
	variant = 'error',
	children,
	onDismiss,
	className,
}: InlineAlertProps) {
	const Icon = variantIcons[variant];

	return (
		<div
			className={cn(
				'flex items-start gap-2 rounded-paper border p-3 text-sm',
				variantStyles[variant],
				className
			)}
		>
			<Icon size={18} className="mt-0.5 flex-shrink-0" />
			<div className="min-w-0 flex-grow">{children}</div>
			{onDismiss !== undefined ? (
				<button
					type="button"
					onClick={onDismiss}
					className="flex-shrink-0 cursor-pointer opacity-70 hover:opacity-100"
					aria-label="Dismiss"
				>
					<X size={16} />
				</button>
			) : null}
		</div>
	);
}
