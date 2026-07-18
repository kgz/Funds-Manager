import { selectDarkClass } from '@/components/layout/tokens';
import { cn } from '@/lib/utils/cn';
import { useAccountFilter } from '@/hooks/useAccountFilter';

type AccountFilterProps = {
	className?: string;
};

export function AccountFilter({ className }: AccountFilterProps) {
	const { accounts, accountsLoading, accountId, setAccountId } = useAccountFilter();

	return (
		<select
			className={cn(selectDarkClass, className)}
			value={accountId ?? ''}
			disabled={accountsLoading}
			onChange={(event) => {
				const value = event.target.value;
				setAccountId(value.length > 0 ? value : null);
			}}
			aria-label="Filter by account"
		>
			<option value="" className="bg-paper-surface text-paper-fg">
				All accounts
			</option>
			{accounts.map((account) => (
				<option
					key={account.id}
					value={account.id}
					className="bg-paper-surface text-paper-fg"
				>
					{account.display_name}
				</option>
			))}
		</select>
	);
}
