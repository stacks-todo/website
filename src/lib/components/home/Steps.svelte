<script lang="ts">
	import cardShadowA from '$lib/assets/img/home/step-card-shadow-a.svg';
	import cardShadowB from '$lib/assets/img/home/step-card-shadow-b.svg';
	import num01 from '$lib/assets/img/home/step-number-01.svg';
	import num02 from '$lib/assets/img/home/step-number-02.svg';
	import num03 from '$lib/assets/img/home/step-number-03.svg';
	import step2Caption from '$lib/assets/img/home/step2-caption.svg';
	import step3Caption from '$lib/assets/img/home/step3-caption.svg';
	import step2TableGraphic from '$lib/assets/img/home/step2-table-graphic.png';
	import mockupDots from '$lib/assets/img/home/mockup1-dots.svg';
</script>

<section
	id="how-to-use"
	class="padding-block:96 padding-block:160@sm padding-inline:16 padding-inline:32@sm padding-inline:48@lg bg:#FAFAFA"
>
	<div class="max-width:1200 margin-inline:auto grid grid-cols:1 grid-cols:3@lg gap:24 gap:32@lg">
		<!-- Card 1 -->
		<div
			class="position:relative padding-top:48 padding-bottom:72 padding-inline:32 r:24 bg:#E7E7E7 flex flex:column ai:center text-align:center"
		>
			<img src={num01} alt="01" class="height:52 margin-bottom:24" />
			<p class="font:18 font-weight:700 color:#5A5A5A line-height:1.6 margin-bottom:40 font-family:'Noto Sans JP',sans-serif">
				タスク管理アプリとSTACKS本体を連携
			</p>
			<div class="position:relative width:96 height:96">
				<img
					src={cardShadowA}
					alt=""
					aria-hidden="true"
					class="position:absolute left:0 right:0 bottom:-14 margin-inline:auto width:80%"
				/>
				<div
					class="position:relative width:96 height:96 r:full bg:#161616 border:10|solid|#4d4d4d overflow:hidden flex flex:column ai:center jc:center gap:2"
				>
					<div class="position:absolute width:72 height:72 r:full bg:#2f2f2f"></div>
					<img src={mockupDots} alt="" aria-hidden="true" class="position:relative width:56% margin-bottom:2" />
					<p class="position:relative font:16 font-weight:700 color:#f7f7f7 line-height:1">12</p>
					<p class="position:relative font:8 color:#999">Tasks</p>
				</div>
			</div>
		</div>

		<!-- Card 2 -->
		<div
			class="position:relative padding-top:48 padding-bottom:72 padding-inline:32 r:24 bg:#E7E7E7 flex flex:column ai:center text-align:center"
		>
			<img src={num02} alt="02" class="height:52 margin-bottom:24" />
			<img
				src={step2Caption}
				alt="アプリの内容が本体のディスプレイに同期される"
				class="height:52 margin-bottom:40"
			/>
			<div class="position:relative width:96 height:96">
				<img
					src={cardShadowB}
					alt=""
					aria-hidden="true"
					class="position:absolute left:0 right:0 bottom:-14 margin-inline:auto width:90%"
				/>
				<div
					class="position:relative width:96 height:96 r:full bg:#161616 border:10|solid|#4d4d4d overflow:hidden flex ai:center jc:center"
				>
					<img src={step2TableGraphic} alt="" aria-hidden="true" class="width:full height:full obj:cover" />
				</div>
			</div>
		</div>

		<!-- Card 3 -->
		<div
			class="position:relative padding-top:48 padding-bottom:72 padding-inline:32 r:24 bg:#E7E7E7 flex flex:column ai:center text-align:center"
		>
			<img src={num03} alt="03" class="height:52 margin-bottom:24" />
			<img
				src={step3Caption}
				alt="本体ディスプレイからタスクの確認、完了を行う"
				class="height:52 margin-bottom:40"
			/>
			<div class="position:relative width:96 height:96">
				<img
					src={cardShadowB}
					alt=""
					aria-hidden="true"
					class="position:absolute left:0 right:0 bottom:-14 margin-inline:auto width:90%"
				/>
				<div
					class="position:relative width:96 height:96 r:full bg:#161616 border:10|solid|#4d4d4d overflow:hidden padding:10 flex flex:column jc:center gap:4 text-align:left"
				>
					<p class="font:9 color:#f7f7f7 line-height:1.2 font-family:'Noto Sans JP',sans-serif">映像アート論 課題提出</p>
					<p class="font:7 color:#f7f7f7">3日</p>
					<p class="font:6.5 color:#aaa line-height:1.3">
						課題提出を以て出席判定なので必ず期限内に課題を提出する必要あり
					</p>
					<div class="width:44% height:8 r:4 bg:#9f3f36 margin-top:2"></div>
				</div>
			</div>
		</div>
	</div>
</section>
