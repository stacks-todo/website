<script lang="ts">
	import '@master/normal.css';
	import '../app.css';
	import { onMount } from 'svelte';
	import Lenis from 'lenis';
	import type { Snippet } from 'svelte';

	const { children }: { children: Snippet } = $props();

	onMount(() => {
		const lenis = new Lenis();

		function raf(time: number) {
			lenis.raf(time);
			requestAnimationFrame(raf);
		}
		const frame = requestAnimationFrame(raf);

		return () => {
			cancelAnimationFrame(frame);
			lenis.destroy();
		};
	});
</script>

{@render children()}
