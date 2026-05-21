import { render } from '@master/css-server';
import masterConfig from '../master.css.ts';
import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	const response = await resolve(event, {
		transformPageChunk: ({ html }) => render(html, masterConfig).html
	});
	return response;
};
