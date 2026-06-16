import { categoryPillStyle } from '@/lib/contrastTextColor';
import { cn } from '@/lib/utils/cn';

type CategoryPillProps = {
	name: string;
	colour?: string | null;
	className?: string;
};

export function CategoryPill({ name, colour, className }: CategoryPillProps) {
	return (
		<span
			className={cn(
				'inline-block shrink-0 rounded px-2 py-0.5 text-xs font-medium',
				className,
			)}
			style={categoryPillStyle(colour)}
		>
			{name}
		</span>
	);
}
