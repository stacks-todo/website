<script lang="ts">
	import logo from '$lib/assets/img/title_logo.svg';
</script>

<header
	class="position:fixed top:0 left:0 right:0 z-index:50 flex ai:center jc:space-between gap:16 px:20 px:48@sm height:64 height:80@sm bg:white(.88) border-bottom:1|solid|#eaeaea"
>
	<a href="#top" class="flex ai:center height:24 height:28@sm">
		<img src={logo} alt="STACKS" class="height:full obj:contain" />
	</a>

	<nav
		class="display:none display:flex@sm ai:center gap:32 font:14 font-weight:700 color:#333 white-space:nowrap"
	>
		<a href="#about" class="color:#333 transition">STACKSとは</a>
		<a href="#how-to-use" class="color:#333 transition">使い方</a>
		<a href="#" class="color:#333 transition">ニュース</a>
	</nav>

	<a
		href="#"
		class="flex ai:center jc:center gap:8 bg:#18A9BD color:#f7f7f7 font:13 font:14@sm font-weight:700 padding-inline:18 padding-inline:24@sm height:40 height:48@sm r:full white-space:nowrap"
	>
		購入する
		<span aria-hidden="true">→</span>
	</a>
</header>
