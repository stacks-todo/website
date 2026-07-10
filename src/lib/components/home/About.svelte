<script lang="ts">
	import eyebrow from '$lib/assets/img/home/eyebrow-badge.svg';
	import productPhoto from '$lib/assets/img/home/product-photo.png';
</script>

<section id="about" class="padding-block:96 padding-block:160@sm padding-inline:16 padding-inline:32@sm padding-inline:48@lg">
	<div
		class="max-width:1200 margin-inline:auto flex flex:column flex:row@lg ai:center@lg gap:48 gap:80@lg"
	>
		<div class="flex:1">
			<img src={eyebrow} alt="STACKSとは" class="height:20 margin-bottom:24" />
			<h2
				class="font:28 font:34@sm font:40@lg font-weight:700 color:#28BDD1 line-height:1.5 letter-spacing:.02em margin-bottom:24 font-family:'Noto Sans JP',sans-serif white-space:nowrap@lg"
			>
				タスク管理アプリと連携し、<br />残りのタスク量を可視化
			</h2>
			<p class="font:16 font:18@sm color:#333 line-height:2">
				溜まったタスクの解消をより楽しく、より簡単にするプロダクト。<br />
				インテリアとしてのクオリティも追求して設計している。
			</p>
		</div>
		<div class="flex:1 flex jc:center@lg">
			<img src={productPhoto} alt="STACKS デバイス" class="width:full max-width:420 obj:contain" />
		</div>
	</div>
</section>
