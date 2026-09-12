import { defineConfig } from 'vitepress';

export default defineConfig({
	title: 'Funds Manager',
	description: 'Self-hosted personal finance — guides and feature docs',
	base: '/Funds-Manager/',
	cleanUrls: true,
	ignoreDeadLinks: true,
	themeConfig: {
		nav: [
			{ text: 'Guide', link: '/guide/getting-started' },
			{ text: 'Features', link: '/features/' },
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
						{ text: 'Local development', link: '/guide/local-development' },
						{ text: 'Docker', link: '/guide/docker' },
						{ text: 'Contributing', link: '/guide/contributing' },
					],
				},
			],
			'/features/': [
				{
					text: 'Features',
					items: [
						{ text: 'Overview', link: '/features/' },
						{ text: 'Planning', link: '/features/planning' },
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
			message: 'Personal / self-hosted — not financial advice.',
			copyright: 'Copyright © Funds Manager contributors',
		},
	},
});
