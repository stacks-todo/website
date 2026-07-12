import { sveltekit } from '@sveltejs/kit/vite';
import { enhancedImages } from '@sveltejs/enhanced-img';
import { paraglideVitePlugin } from '@inlang/paraglide-js';
import masterCSS from '@master/css.vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		enhancedImages(),
		sveltekit(),
		masterCSS(),
		paraglideVitePlugin({
			project: './project.inlang',
			outdir: './src/lib/paraglide',
			strategy: ['url', 'baseLocale']
		})
	],
	server: {
		fs: {
			allow: [
				"./master.css.ts",
			]
		}
	}
});
