<script lang="ts">
	import heroPhoto from '$lib/assets/img/home/hero-photo.jpg';
	import decorTopLeft from '$lib/assets/img/home/hero-decor-topleft.svg';
	import decorRight from '$lib/assets/img/home/hero-decor-right.svg';
	import overlaySubtract from '$lib/assets/img/home/hero-overlay-subtract.svg';
	import circlePhoto from '$lib/assets/img/home/hero-circle-photo.png';
	import logoMark from '$lib/assets/img/home/hero-logo-mark.svg';
</script>

<section id="top" class="position:relative padding-top:96 padding-top:112@sm padding-inline:16 padding-inline:32@sm padding-inline:48@lg">
	<div
		class="position:relative overflow:hidden r:32 r:64@sm min-height:520 min-height:640@sm min-height:760@lg bg:#18A9BD"
	>
		<img
			src={heroPhoto}
			alt="STACKS 本体とタスクボール"
			class="position:absolute inset:0 width:full height:full obj:cover opacity:.9"
		/>
		<img
			src={decorTopLeft}
			alt=""
			aria-hidden="true"
			class="position:absolute left:-10% top:-12% width:60% max-width:640 pointer-events:none"
		/>
		<img
			src={decorRight}
			alt=""
			aria-hidden="true"
			class="position:absolute right:-8% bottom:-6% width:58% max-width:560 pointer-events:none"
		/>
		<img
			src={overlaySubtract}
			alt=""
			aria-hidden="true"
			class="position:absolute inset:0 width:full height:full mix-blend-mode:overlay pointer-events:none"
		/>
		<img
			src={circlePhoto}
			alt=""
			aria-hidden="true"
			class="display:none display:block@sm position:absolute right:8% top:10% width:24% max-width:360 r:full box-shadow:0/12/40/0/rgba(0,0,0,.28) transform:rotate(-4deg)"
		/>

		<div
			class="position:absolute inset:0 flex flex:column jc:flex-end gap:16 gap:20@sm padding:32 padding:48@sm padding:80@lg"
		>
			<img src={logoMark} alt="STACKS" class="height:28 height:36@sm" />
			<h1
				class="font:44 font:64@sm font:88@lg font-weight:900 color:#f7f7f7 line-height:1.32 letter-spacing:.02em text-shadow:0/0/4/rgba(0,0,0,.15) font-family:'Noto Sans JP',sans-serif"
			>
				忙しさを、美しく。
			</h1>
		</div>
	</div>
</section>
