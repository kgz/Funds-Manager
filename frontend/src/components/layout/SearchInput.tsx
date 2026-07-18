import { cn } from '@/lib/utils/cn';
import { Search, X } from 'lucide-react';
import { inputDarkClass } from './tokens';

type SearchInputProps = {
	value: string;
	onChange: (value: string) => void;
	placeholder?: string;
	className?: string;
	inputClassName?: string;
};

export function SearchInput({
	value,
	onChange,
	placeholder = 'Search…',
	className,
	inputClassName,
}: SearchInputProps) {
	return (
		<div className={cn('relative', className)}>
			<Search
				size={16}
				className="absolute left-3 top-1/2 -translate-y-1/2 text-paper-muted"
			/>
			<input
				type="text"
				role="searchbox"
				value={value}
				onChange={(e) => onChange(e.target.value)}
				placeholder={placeholder}
				className={cn(
					inputDarkClass,
					'w-full py-2 pl-9',
					value.length > 0 ? 'pr-9' : 'pr-3',
					inputClassName
				)}
			/>
			{value.length > 0 ? (
				<button
					type="button"
					onClick={() => onChange('')}
					className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer text-paper-muted hover:text-paper-fg"
					aria-label="Clear search"
				>
					<X size={16} />
				</button>
			) : null}
		</div>
	);
}
