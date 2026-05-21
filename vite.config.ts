import { sveltekit } from '@sveltejs/kit/vite';
import masterCSS from '@master/css.vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit(), masterCSS()],
	server: {
		fs: {
			allow: [
				"./master.css.ts",
			]
		}
	}
});
