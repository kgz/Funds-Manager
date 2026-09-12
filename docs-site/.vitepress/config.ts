import { defineConfig } from 'vitepress';
import lightbox from 'vitepress-plugin-lightbox';

export default defineConfig({
	title: 'Funds Manager',
	description: 'Self-hosted personal finance - setup guide and user guide',
	base: '/Funds-Manager/',
	cleanUrls: true,
	ignoreDeadLinks: true,
	markdown: {
		config: (md) => {
			md.use(lightbox, {});
		},
	},
	themeConfig: {
		nav: [
			{ text: 'Guide', link: '/guide/getting-started' },
			{ text: 'User guide', link: '/user-guide/' },
			{
				text: 'GitHub',
				link: 'https://github.com/kgz/Funds-Manager',
			},
		],
		sidebar: {
			'/guide/': [
				{
					text: 'Guide',
					items: [
						{ text: 'Getting started', link: '/guide/getting-started' },
						{ text: 'Run from a git clone', link: '/guide/local-development' },
						{ text: 'Run with Docker', link: '/guide/docker' },
						{ text: 'User guide', link: '/user-guide/' },
						{ text: 'Contributing', link: '/guide/contributing' },
					],
				},
			],
			'/user-guide/': [
				{
					text: 'Overview',
					items: [
						{ text: 'User guide', link: '/user-guide/' },
						{ text: 'Dashboard', link: '/user-guide/dashboard' },
						{ text: 'Breakdown', link: '/user-guide/breakdown' },
						{ text: 'Future predictions', link: '/user-guide/predictions' },
					],
				},
				{
					text: 'Cash flow',
					items: [
						{ text: 'Transactions', link: '/user-guide/transactions' },
						{ text: 'Income', link: '/user-guide/income' },
						{ text: 'Living expenses', link: '/user-guide/living-expenses' },
						{ text: 'Serviceability', link: '/user-guide/serviceability' },
						{ text: 'Report snapshots', link: '/user-guide/report-snapshots' },
						{ text: 'Repeat payments', link: '/user-guide/repeat-payments' },
						{ text: 'Planning', link: '/user-guide/planning' },
					],
				},
				{
					text: 'Net worth',
					items: [
						{ text: 'Accounts', link: '/user-guide/accounts' },
						{ text: 'Assets', link: '/user-guide/assets' },
						{ text: 'Liabilities', link: '/user-guide/liabilities' },
					],
				},
				{
					text: 'Data & setup',
					items: [
						{ text: 'Statements', link: '/user-guide/statements' },
						{ text: 'Categories', link: '/user-guide/categories' },
						{ text: 'Settings', link: '/user-guide/settings' },
					],
				},
			],
		},
		socialLinks: [
			{ icon: 'github', link: 'https://github.com/kgz/Funds-Manager' },
		],
		search: {
			provider: 'local',
		},
		editLink: {
			pattern:
				'https://github.com/kgz/Funds-Manager/edit/main/docs-site/:path',
			text: 'Edit this page',
		},
		footer: {
			message: 'Personal / self-hosted - not financial advice.',
			copyright: 'Copyright (c) Funds Manager contributors',
		},
	},
});
