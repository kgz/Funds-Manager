import { Settings as SettingsIcon } from 'lucide-react';
import { GlassCard } from '@/components/layout/GlassCard';
import { PageHeader } from '@/components/layout/PageHeader';
import { PageShell } from '@/components/layout/PageShell';

export const Settings = () => {
	return (
		<PageShell>
			<PageHeader
				title="Settings"
				subtitle="App preferences and configuration."
				icon={<SettingsIcon className="h-6 w-6 text-secondary-default" />}
			/>
			<GlassCard className="p-6">
				<p className="text-sm text-white/60">
					Settings are not configured yet. This page will host theme, data, and
					account preferences.
				</p>
			</GlassCard>
		</PageShell>
	);
};
