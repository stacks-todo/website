<script lang="ts">
	import '@master/normal.css';
	import '../app.css';
	import type { Snippet } from 'svelte';

	const { children }: { children: Snippet } = $props();
</script>

{@render children()}
