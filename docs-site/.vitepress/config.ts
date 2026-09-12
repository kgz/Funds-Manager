import { defineConfig } from 'vitepress';

export default defineConfig({
	title: 'Funds Manager',
	description: 'Self-hosted personal finance - setup guide and user guide',
	base: '/Funds-Manager/',
	cleanUrls: true,
	ignoreDeadLinks: true,
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
					text: 'User guide',
					items: [
						{ text: 'Overview', link: '/user-guide/' },
						{ text: 'Planning', link: '/user-guide/planning' },
						{ text: 'Future predictions', link: '/user-guide/predictions' },
						{ text: 'Transactions', link: '/user-guide/transactions' },
						{ text: 'Accounts', link: '/user-guide/accounts' },
						{ text: 'Liabilities', link: '/user-guide/liabilities' },
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
