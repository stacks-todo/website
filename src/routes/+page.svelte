<script lang="ts">
	import SiteHeader from '$lib/components/home/SiteHeader.svelte';
	import Hero from '$lib/components/home/Hero.svelte';
	import About from '$lib/components/home/About.svelte';
	import Steps from '$lib/components/home/Steps.svelte';

	const BASE_URL = 'https://stacks-todo.com';
	const TITLE = 'STACKS — 忙しさを、美しく。';
	const DESCRIPTION =
		'Google Tasks と連携してタスクをボールとして表示するインテリア型デバイス。回転する外枠でキー入力なしに操作できます。';
	const OG_IMAGE = `${BASE_URL}/og-image.png`;

	const jsonLd = {
		'@context': 'https://schema.org',
		'@type': 'Product',
		name: 'STACKS',
		description: DESCRIPTION,
		url: BASE_URL,
		brand: { '@type': 'Brand', name: 'STACKS' }
	};
</script>

<svelte:head>
	<title>{TITLE}</title>
	<meta name="description" content={DESCRIPTION} />
	<link rel="canonical" href={BASE_URL} />

	<!-- Open Graph -->
	<meta property="og:type" content="website" />
	<meta property="og:url" content={BASE_URL} />
	<meta property="og:site_name" content="STACKS" />
	<meta property="og:title" content={TITLE} />
	<meta property="og:description" content={DESCRIPTION} />
	<meta property="og:image" content={OG_IMAGE} />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta property="og:image:alt" content={TITLE} />
	<meta property="og:locale" content="ja_JP" />

	<!-- Twitter Card -->
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={TITLE} />
	<meta name="twitter:description" content={DESCRIPTION} />
	<meta name="twitter:image" content={OG_IMAGE} />
	<meta name="twitter:image:alt" content={TITLE} />

	<!-- JSON-LD -->
	{@html `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>`}
</svelte:head>

<SiteHeader />

<main>
	<Hero />
	<About />
	<Steps />
</main>
