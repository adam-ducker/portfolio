import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},

			// Static SPA build: the app fetches all data client-side from statsapi.mlb.com,
			// so there is nothing to prerender. A fallback page makes it a single-page app.
			adapter: adapter({ fallback: 'index.html' }),

			// Deploy under a subpath (the original site lives at /mlb/) with e.g.
			// `BASE_PATH=/mlb npm run build`. All internal links use $app/paths `base`.
			paths: {
				base: process.env.BASE_PATH ?? ''
			}
		})
	]
});
