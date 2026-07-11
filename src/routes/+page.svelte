<script lang="ts">
  import { resolve } from "$app/paths";
  import Notch from "$lib/components/Notch.svelte";
  import pv from "$lib/assets/img/pv.png";

  const BASE_URL = "https://stacks-todo.com";
  const TITLE = "STACKS — 忙しさを、美しく。";
  const DESCRIPTION =
    "Google Tasks と連携してタスクをボールとして表示するインテリア型デバイス。回転する外枠でキー入力なしに操作できます。";
  const OG_IMAGE = `${BASE_URL}/og-image.png`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: "STACKS",
    description: DESCRIPTION,
    url: BASE_URL,
    brand: { "@type": "Brand", name: "STACKS" },
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

<header class="fixed top:48px right:48px w:fit h:94px bg:#fff rbl:40px">
  <nav
    class="rel w:full h:full flex flex:row list-style:none ai:center jc:end pb:20px pl:60px gap:44px f:18px_li f:semibold_li fg:#393939_li"
  >
    <Notch corner="bl" class="abs top:0 left:0 translateX(-100%)" />
    <Notch corner="bl" class="abs bottom:0 right:0 translateY(100%)" />
    <ul class="flex flex:row gap:40px">
      <li>
        <a href={resolve("/")}>STACKS とは</a>
      </li>
      <li>
        <a href={resolve("/")}>Movie</a>
      </li>
      <li>
        <a href={resolve("/")}>使い方</a>
      </li>
      <li>
        <a href={resolve("/")}>ニュース</a>
      </li>
    </ul>
    <ul>
      <li>
        <a
          href={resolve("/")}
          class="flex flex:row ai:center jc:center h:48px r:25px p:8px|30px gap:8px bg:#18A9BD fg:#fff fill:#fff>svg>path"
        >
          <span>購入する</span>
          <svg
            width="13"
            height="13"
            viewBox="0 0 13 13"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M11.608 0C12.0657 0.000213122 12.4361 0.370395 12.4362 0.828125V8.29004C12.4362 8.74793 12.0649 9.11912 11.6071 9.11914C11.1497 9.1188 10.7784 8.74836 10.778 8.29102V2.83008L1.41565 12.1934C1.09191 12.517 0.566575 12.517 0.242801 12.1934C-0.0809609 11.8696 -0.0809064 11.3443 0.242801 11.0205L9.60608 1.65723H4.14514C3.68777 1.65695 3.31652 1.28643 3.31604 0.829102C3.31604 0.371195 3.68821 -3.37175e-07 4.14612 0H11.608Z"
            />
          </svg>
        </a>
      </li>
    </ul>
  </nav>
</header>

<div class="fixed top:0 left:0 w:100% h:100dvh flex">
  <div class="w:full h:full rel">
    <span class="abs top:0 left:0 w:100% h:48px bg:#fff">
      <Notch corner="br" class="abs bottom:0 left:48px translateY(100%)" />
    </span>

    <span class="abs bottom:0 left:0 w:100% h:48px bg:#fff">
      <Notch corner="tr" class="abs top:0 left:48px translateY(-100%)" />
	  <Notch corner="tl" class="abs top:0 right:48px translateY(-100%)" />
    </span>
  </div>
</div>

<main class="flex flex:column w:100% p:48px ai:center jc:center">
  <div class="w:100% h:calc(100dvh-96px) flex">
    <img src={pv} alt="pv" class="obj:cover w:100% r:48px" />
  </div>
  <div class="flex flex:column ai:center py:200px gap:80px">
    <h2
      class="f:32px fg:#393939 f:bold line-height:1.5 letter-spacing:.02em text-align:center"
    >
      タスク管理は、<br />もっと楽しくていい
    </h2>
    <div class="flex flex:column gap:40px f:16px color:#393939 line-height:2 text-align:center">
      <p>毎日繰り返すタスク管理。</p>
      <p>
        だからこそ、<br />ただ便利なだけではなく、<br
        />使う時間そのものが心地よい体験であってほしい。
      </p>
      <p>STACKSは、タスク管理アプリと連携する専用ディスプレイです。</p>
      <p>デスクに置くだけで、タスクを確認し、進捗を眺め、</p>
      <p>
        少し楽しく、少し美しく。<br />日常のタスク管理を、達成を積み重ねる。
      </p>
    </div>
  </div>
</main>
