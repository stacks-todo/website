<script lang="ts">
	import logo from "$lib/assets/img/title_logo.svg";
</script>

<div
	class="flex flex:column ai:center jc:center gap:40px min-height:100vh bg:#50C2FB color:white text-align:center px:24"
>
	<div class="h:100px">
		<img
			class="brightness(0)|invert(1) h:full obj:contain"
			src={logo}
			alt="title logo"
		/>
	</div>

	<div class="flex flex:column gap:10px">
		<p
			class="font:1em font-weight:600 letter-spacing:.25em text-transform:uppercase color:white"
		>
			Under Construction
		</p>

		<p class="font:16 color:white max-width:360px line-height:1.7">
			近日公開予定。
		</p>
	</div>
</div>
