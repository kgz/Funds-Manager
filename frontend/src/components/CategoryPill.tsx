import { categoryPillStyle, normalizeCategoryColour } from '@/lib/contrastTextColor';
import { cn } from '@/lib/utils/cn';

type CategoryPillProps = {
	name: string;
	colour?: string | null;
	className?: string;
	variant?: 'filled' | 'outline';
	uncategorized?: boolean;
};

export function CategoryPill({
	name,
	colour,
	className,
	variant = 'filled',
	uncategorized = false,
}: CategoryPillProps) {
	if (variant === 'outline') {
		const dotColour = normalizeCategoryColour(colour);
		return (
			<span
				className={cn(
					'inline-flex h-[26px] max-w-[220px] shrink-0 items-center gap-[7px] rounded-full border border-paper-border bg-paper py-0 pl-2 pr-2.5 text-[12px] font-medium text-paper-fg',
					uncategorized && 'font-normal italic text-paper-muted',
					className
				)}
			>
				<span
					className="h-2 w-2 shrink-0 rounded-full"
					style={{ backgroundColor: dotColour }}
					aria-hidden
				/>
				<span className="truncate">{name}</span>
			</span>
		);
	}

	return (
		<span
			className={cn(
				'inline-block shrink-0 rounded px-2 py-0.5 text-xs font-medium',
				className
			)}
			style={categoryPillStyle(colour)}
		>
			{name}
		</span>
	);
}
