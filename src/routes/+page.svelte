<script lang="ts">
  import { onMount } from "svelte";
  import { resolve } from "$app/paths";
  import Task from "$lib/components/Task.svelte";
  import Notch from "$lib/components/Notch.svelte";
  import Logo from "$lib/components/Logo.svelte";
  import pv from "$lib/assets/img/pv.png";
  import desc01 from "$lib/assets/img/desc_01.png";
  import desc02 from "$lib/assets/img/desc_02.png";
  import desc03 from "$lib/assets/img/desc_03.png";
  import { icon } from "$lib/assets/icons";

  type BallColor = "red" | "orange" | "blue";

  interface Ball {
    color: BallColor;
    r: number;
    angle: number;
    x: number;
    y: number;
    vx: number;
    vy: number;
  }

  const initialBalls: {
    color: BallColor;
    size: number;
    rot: number;
    leftFrac: number;
    bottom: number;
  }[] = [
    { color: "red", size: 600, rot: 20, leftFrac: -0.05, bottom: -100 },
    { color: "red", size: 360, rot: -10, leftFrac: 0.45, bottom: -100 },
    { color: "orange", size: 250, rot: 12, leftFrac: 0.87, bottom: -80 },
    { color: "orange", size: 250, rot: 10, leftFrac: 0.22, bottom: -50 },
    { color: "blue", size: 120, rot: -10, leftFrac: 0.38, bottom: -20 },
    { color: "blue", size: 120, rot: 20, leftFrac: 0.62, bottom: 160 },
    { color: "orange", size: 250, rot: -12, leftFrac: 0.68, bottom: 300 },
    { color: "blue", size: 120, rot: -25, leftFrac: 0.81, bottom: 40 },
    { color: "blue", size: 120, rot: 15, leftFrac: 0.3, bottom: 60 },
  ];

  const GRAVITY = 0.5;
  const FRICTION = 0.985;
  const RESTITUTION = 0.15;
  const RESOLVE_ITERS = 6;
  const GAP = 10;
  const WALL_OVERFLOW = 50;
  const BURST_RADIUS = 500;
  const BURST_POWER = 16;
  const ROLL_TO_DEG = 180 / Math.PI;
  const RESTING_VY = 1;
  const SLEEP_SPEED_SQ = 0.05;
  const SLEEP_FRAMES = 45;
  const SPAWN_STAGGER = 40;

  let footerEl: HTMLElement | undefined = $state();
  let balls: Ball[] = $state.raw([]);
  let rafId: number | undefined;
  let idleFrames = 0;
  let spawned = false;

  function isNearBottom(): boolean {
    if (!footerEl) return false;
    const r = footerEl.getBoundingClientRect();
    return r.top < window.innerHeight * 0.6;
  }

  function isHidden(): boolean {
    if (!footerEl) return true;
    const r = footerEl.getBoundingClientRect();
    return r.top > window.innerHeight * 0.9;
  }

  function spawnBalls(width: number, height: number) {
    balls = initialBalls.map((b, i) => {
      const r = b.size / 2;
      return {
        color: b.color,
        r,
        angle: b.rot,
        x: b.leftFrac * width + r,
        y: -r - i * SPAWN_STAGGER - Math.random() * SPAWN_STAGGER,
        vx: 0,
        vy: 0,
      };
    });
  }

  function maxSpeedSq(): number {
    let max = 0;
    for (const b of balls) {
      const s = b.vx * b.vx + b.vy * b.vy;
      if (s > max) max = s;
    }
    return max;
  }

  function physicsStep(width: number, height: number) {
    for (const b of balls) {
      b.vy += GRAVITY;
      b.vx *= FRICTION;
      b.vy *= FRICTION;
      b.x += b.vx;
      b.y += b.vy;
      b.angle += (b.vx / b.r) * ROLL_TO_DEG;
    }

    for (let iter = 0; iter < RESOLVE_ITERS; iter++) {
      for (let i = 0; i < balls.length; i++) {
        for (let j = i + 1; j < balls.length; j++) {
          const bi = balls[i];
          const bj = balls[j];
          const dx = bj.x - bi.x;
          const dy = bj.y - bi.y;
          const dist = Math.hypot(dx, dy);
          const minDist = bi.r + bj.r + GAP;
          if (dist < minDist && dist > 0.01) {
            const nx = dx / dist;
            const ny = dy / dist;
            const push = (minDist - dist) * 0.5;
            bi.x -= nx * push;
            bi.y -= ny * push;
            bj.x += nx * push;
            bj.y += ny * push;

            const rv = (bj.vx - bi.vx) * nx + (bj.vy - bi.vy) * ny;
            if (rv < 0) {
              const imp = rv * (1 + RESTITUTION) * 0.5;
              bi.vx += imp * nx;
              bi.vy += imp * ny;
              bj.vx -= imp * nx;
              bj.vy -= imp * ny;
            }
          }
        }
      }
    }

    for (const b of balls) {
      const left = -WALL_OVERFLOW + b.r;
      const right = width + WALL_OVERFLOW - b.r;
      const floor = height + WALL_OVERFLOW - b.r;

      if (b.x < left) {
        b.x = left;
        if (b.vx < 0) b.vx = -b.vx * RESTITUTION;
      } else if (b.x > right) {
        b.x = right;
        if (b.vx > 0) b.vx = -b.vx * RESTITUTION;
      }

      if (b.y > floor) {
        b.y = floor;
        if (b.vy > RESTING_VY) {
          b.vy = -b.vy * RESTITUTION;
        } else if (b.vy > 0) {
          b.vy = 0;
        }
      }
    }
  }

  function burst(cx: number, cy: number) {
    for (const b of balls) {
      const dx = b.x - cx;
      const dy = b.y - cy;
      const dist = Math.hypot(dx, dy) || 1;
      if (dist < BURST_RADIUS) {
        const power = BURST_POWER * (1 - dist / BURST_RADIUS);
        b.vx += (dx / dist) * power;
        b.vy += (dy / dist) * power - power * 0.4;
      }
    }
  }

  function wake() {
    idleFrames = 0;
    if (rafId === undefined) {
      rafId = requestAnimationFrame(loop);
    }
  }

  function loop() {
    rafId = undefined;
    if (!footerEl) return;

    physicsStep(footerEl.clientWidth, footerEl.clientHeight);
    balls = balls.map((b) => ({ ...b }));

    idleFrames = maxSpeedSq() < SLEEP_SPEED_SQ ? idleFrames + 1 : 0;
    if (idleFrames < SLEEP_FRAMES) {
      rafId = requestAnimationFrame(loop);
    }
  }

  function handleFooterClick(e: MouseEvent) {
    if (!footerEl) return;
    const rect = footerEl.getBoundingClientRect();
    burst(e.clientX - rect.left, e.clientY - rect.top);
    wake();
  }

  function handleFooterKeydown(e: KeyboardEvent) {
    if (!footerEl || (e.key !== "Enter" && e.key !== " ")) return;
    const rect = footerEl.getBoundingClientRect();
    burst(rect.width / 2, rect.height / 2);
    wake();
  }

  function trySpawn() {
    if (spawned || !footerEl || !isNearBottom()) return;
    spawned = true;
    spawnBalls(footerEl.clientWidth, footerEl.clientHeight);
    wake();
  }

  function tryReset() {
    if (!spawned || !isHidden()) return;
    spawned = false;
    balls = [];
    idleFrames = 0;
    if (rafId !== undefined) {
      cancelAnimationFrame(rafId);
      rafId = undefined;
    }
  }

  onMount(() => {
    if (!footerEl) return;
    trySpawn();

    const onScroll = () => {
      trySpawn();
      tryReset();
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
      if (rafId !== undefined) cancelAnimationFrame(rafId);
    };
  });

  const BASE_URL = "https://stacks-todo.com";
  const TITLE = "STACKS — 忙しさを、美しく。";
  const DESCRIPTION =
    "Google Tasks と連携してタスクをボールとして表示するインテリア型デバイス。回転する外枠でキー入力なしに操作できます。";
  const OG_IMAGE = `${BASE_URL}/og-image.png`;

  const newsItems = [
    {
      date: "2026.05.20",
      tag: "UPDATE",
      title: "ソフトウェア v1.2.0 リリース — UI 刷新・レスポンス改善",
    },
    {
      date: "2026.04.08",
      tag: "NEWS",
      title: "製品紹介動画を公開しました",
    },
    {
      date: "2026.02.14",
      tag: "NEWS",
      title: "Booth にて正式販売を開始しました",
    },
    {
      date: "2025.12.01",
      tag: "RELEASE",
      title: "クローズドベータテスト終了・フィードバック募集",
    },
    {
      date: "2025.12.01",
      tag: "RELEASE",
      title: "クローズドベータテスト終了・フィードバック募集",
    },
    {
      date: "2025.12.01",
      tag: "RELEASE",
      title: "クローズドベータテスト終了・フィードバック募集",
    },
  ];

  const links = [
    {
      label: "x",
      link: "https://x.com/stacks_todo/",
    },
    {
      label: "instagram",
      link: "https://www.instagram.com/stacks_todo/",
    },
    {
      label: "note",
      link: "https://note.com/stacks_todo/",
    },
    {
      label: "youtube",
      link: "https://www.youtube.com/@stacks_todo/",
    },
    {
      label: "qiita",
      link: "https://qiita.com/stacks_todo/",
    },
  ];

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

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content={TITLE} />
  <meta name="twitter:description" content={DESCRIPTION} />
  <meta name="twitter:image" content={OG_IMAGE} />
  <meta name="twitter:image:alt" content={TITLE} />

  {@html `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>`}
</svelte:head>

<header class="fixed top:48px right:48px w:fit h:94px bg:#fff rbl:40px z:999">
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

<div class="fixed top:0 left:0 w:100% h:100dvh flex pointer-events:none z:999">
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
      タスク管理は、<br />もっと楽しくていい。
    </h2>
    <div
      class="flex flex:column gap:40px f:16px color:#393939 line-height:2 text-align:center"
    >
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
    <div class="w:200px">
      <Logo color="#333" />
    </div>
  </div>
  <div class="flex flex:column ai:center py:200px gap:80px">
    <div class="flex flex:row ai:center gap:10px">
      <div class="rel w:80px h:80px">
        <Task color="orange" r={-10} size={40} class="abs top:20px left:0" />
        <Task color="blue" r={10} size={25} class="abs top:0 left:40px" />
      </div>
      <h class="f:40px f:bold">Movie</h>
    </div>
    <div class="w:1200px r:48px overflow:hidden b:16px|solid|#393939">
      <iframe
        class="w:full video"
        src="https://www.youtube.com/embed/emxMcyfFROg?&autoplay=1&amp;mute=1&loop=1&playlist=emxMcyfFROg&preload=none&playsinline=1&rel=0&modestbranding=1&color=white&cc_load_policy=1"
        title="YouTube video player"
        frameborder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        referrerpolicy="strict-origin-when-cross-origin"
        allowfullscreen
      ></iframe>
    </div>
  </div>

  <div class="flex flex:column ai:center py:200px gap:80px w:full">
    <div class="flex flex:row ai:center gap:60px">
      <div class="rel w:120px h:100px">
        <Task color="red" r={10} size={80} class="abs top:20px left:0" />
        <Task color="orange" r={-10} size={50} class="abs top:-25 left:64px" />
      </div>
      <div class="flex flex:column ai:center gap:10px">
        <h1 class="f:40px fg:#393939 f:bold">使い方</h1>
        <span class="f:25px fg:#989492 f:semibold">How to use</span>
      </div>
      <div class="rel w:100px h:100px">
        <Task color="blue" r={10} size={30} class="abs top:20px left:0" />
      </div>
    </div>
    <div class="w:full flex flex:column gap:20px">
      <div
        class="bg:#3F9BD6 rel w:full h:600px r:48px pl:200px flex ai:center overflow:hidden"
      >
        <span
          class="abs top:-100px left:-80px f:600px f:bold line-h:600px fg:#CFCFD8 opacity:.1 z:0"
          >01</span
        >
        <div class="flex flex:column z:1">
          <div class="rel mb:40px">
            <span class="abs top:50% left:-40px translateY(-50%)">
              <svg
                class="w:30px"
                viewBox="0 0 21 21"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M2.9263 17.0919C6.83379 21.0077 13.1762 21.0143 17.0919 17.1068C21.0077 13.1993 21.0143 6.85685 17.1068 2.94113C13.1993 -0.9746 6.85685 -0.981193 2.94112 2.9263C-0.974603 6.83378 -0.98119 13.1762 2.9263 17.0919ZM5.09619 5.08658C7.63852 2.55135 11.7537 2.55503 14.2905 5.09551L5.08541 14.2793C2.55018 11.7369 2.55571 7.62341 5.09619 5.08658Z"
                  fill="white"
                />
                <path
                  fill-rule="evenodd"
                  clip-rule="evenodd"
                  d="M14.2905 5.09551C11.7537 2.55503 7.63852 2.55135 5.09619 5.08658C2.55571 7.62341 2.55018 11.7369 5.08541 14.2793L14.2905 5.09551Z"
                  fill="#D9D9D9"
                />
              </svg>
            </span>
            <h2 class="f:30px f:bold fg:#fff">STACKSとは</h2>
          </div>
          <h3 class="f:40px f:semibold fg:#fff mb:100px">
            タスク管理アプリと連携し、<br />残りのタスク量を可視化
          </h3>
          <p class="fg:#fff">
            溜まったタスクの解消をより楽しく、より簡単にするプロダクト。<br
            />インテリアとしてのクオリティも追求して設計している。
          </p>
        </div>
        <div class="abs w:740px top:0 right:0 z:0">
          <img src={desc01} alt="description" />
        </div>
      </div>
      <div
        class="bg:#DE6E29 rel w:full h:600px r:48px pl:200px flex ai:center overflow:hidden"
      >
        <span
          class="abs top:-100px left:-80px f:600px f:bold line-h:600px fg:#CFCFD8 opacity:.1 z:0"
          >02</span
        >
        <div class="flex flex:column z:1">
          <div class="rel mb:40px">
            <span class="abs top:50% left:-40px translateY(-50%)">
              <svg
                class="w:30px"
                viewBox="0 0 21 21"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M2.9263 17.0919C6.83379 21.0077 13.1762 21.0143 17.0919 17.1068C21.0077 13.1993 21.0143 6.85685 17.1068 2.94113C13.1993 -0.9746 6.85685 -0.981193 2.94112 2.9263C-0.974603 6.83378 -0.98119 13.1762 2.9263 17.0919ZM5.09619 5.08658C7.63852 2.55135 11.7537 2.55503 14.2905 5.09551L5.08541 14.2793C2.55018 11.7369 2.55571 7.62341 5.09619 5.08658Z"
                  fill="white"
                />
                <path
                  fill-rule="evenodd"
                  clip-rule="evenodd"
                  d="M14.2905 5.09551C11.7537 2.55503 7.63852 2.55135 5.09619 5.08658C2.55571 7.62341 2.55018 11.7369 5.08541 14.2793L14.2905 5.09551Z"
                  fill="#D9D9D9"
                />
              </svg>
            </span>
            <h2 class="f:30px f:bold fg:#fff">STACKSとは</h2>
          </div>
          <h3 class="f:40px f:semibold fg:#fff mb:100px">
            アプリの内容が本体の<br />ディスプレイに同期される
          </h3>
          <p class="fg:#fff">
            溜まったタスクの解消をより楽しく、より簡単にするプロダクト。<br
            />インテリアとしてのクオリティも追求して設計している。
          </p>
        </div>
        <div class="abs w:800px top:0 right:-20px z:0">
          <img src={desc02} alt="description" />
        </div>
      </div>
      <div
        class="bg:#DF4242 rel w:full h:600px r:48px pl:200px flex ai:center overflow:hidden"
      >
        <span
          class="abs top:-100px left:-80px f:600px f:bold line-h:600px fg:#CFCFD8 opacity:.1 z:0"
          >03</span
        >
        <div class="flex flex:column z:1">
          <div class="rel mb:40px">
            <span class="abs top:50% left:-40px translateY(-50%)">
              <svg
                class="w:30px"
                viewBox="0 0 21 21"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M2.9263 17.0919C6.83379 21.0077 13.1762 21.0143 17.0919 17.1068C21.0077 13.1993 21.0143 6.85685 17.1068 2.94113C13.1993 -0.9746 6.85685 -0.981193 2.94112 2.9263C-0.974603 6.83378 -0.98119 13.1762 2.9263 17.0919ZM5.09619 5.08658C7.63852 2.55135 11.7537 2.55503 14.2905 5.09551L5.08541 14.2793C2.55018 11.7369 2.55571 7.62341 5.09619 5.08658Z"
                  fill="white"
                />
                <path
                  fill-rule="evenodd"
                  clip-rule="evenodd"
                  d="M14.2905 5.09551C11.7537 2.55503 7.63852 2.55135 5.09619 5.08658C2.55571 7.62341 2.55018 11.7369 5.08541 14.2793L14.2905 5.09551Z"
                  fill="#D9D9D9"
                />
              </svg>
            </span>
            <h2 class="f:30px f:bold fg:#fff">STACKSとは</h2>
          </div>
          <h3 class="f:40px f:semibold fg:#fff mb:100px">
            本体のディスプレイから<br />タスクの確認、完了を行う
          </h3>
          <p class="fg:#fff">
            溜まったタスクの解消をより楽しく、より簡単にするプロダクト。<br
            />インテリアとしてのクオリティも追求して設計している。
          </p>
        </div>
        <div class="abs w:740px top:0 right:0 z:0">
          <img src={desc03} alt="description" />
        </div>
      </div>
    </div>
  </div>

  <div class="flex flex:row ai:start jc:center gap:100px py:200px w:full">
    <div class="flex flex:row ai:center gap:20px">
      <div class="rel w:120px h:100px">
        <Task color="red" r={10} size={70} class="abs top:60px left:0" />
        <Task color="orange" r={-10} size={40} class="abs top:18 left:60px" />
        <Task color="blue" r={20} size={20} class="abs top:-10 left:36px" />
      </div>
      <div class="flex flex:column ai:start gap:10px">
        <h class="f:50px fg:#393939 f:bold">お知らせ</h>
        <span class="f:25px fg:#989492 f:semibold">News</span>
      </div>
      <div class="rel w:60px h:100px">
        <Task color="orange" r={-10} size={40} class="abs top:-40px left:0" />
        <Task color="blue" r={10} size={20} class="abs top:-80px left:-20px" />
      </div>
    </div>
    <div class="flex flex:column w:900px gap:40px">
      {#each newsItems as item}
        <div class="grid grid-template-columns:100px|100px|1fr gap:80px">
          <p class="f:19px fg:#393939">{item.date}</p>
          <span class="f:20px f:medium fg:#989492 w:100px">{item.tag}</span>
          <p class="f:20px f:medium fg:#393939">{item.title}</p>
        </div>
        <span class="w:full bb:1px|solid|#E6E2E0"></span>
      {/each}
    </div>
  </div>

  <footer
    bind:this={footerEl}
    class="bg:#333333 rel w:full h:calc(100dvh-96px) r:48px p:80px flex flex:column gap:60px overflow:hidden"
  >
    <div
      class="abs inset:0 z:0"
      role="button"
      tabindex="0"
      onclick={handleFooterClick}
      onkeydown={handleFooterKeydown}
    >
      {#each balls as ball, i (i)}
        <div
          class="abs pointer-events:none"
          style="left:{ball.x - ball.r}px; top:{ball.y -
            ball.r}px; width:{ball.r * 2}px; height:{ball.r *
            2}px; transform: rotate({ball.angle}deg);"
        >
          <Task color={ball.color} size={ball.r * 2} class="" />
        </div>
      {/each}
    </div>

    <div class="rel z:1 flex flex:row gap:100px ai:end">
      <div class="w:200px">
        <Logo color="#fff" />
      </div>
      <span class="flex w:2px h:30px bg:#fff"></span>
      <div class="flex flex:row gap:20px">
        {#each links as link}
          <div>
            {@html icon(link.label)}
          </div>
        {/each}
      </div>
    </div>
    <div class="rel z:1">
      <p class="fg:#A6A3A2">&copy; 2026 STACKS</p>
    </div>
  </footer>
</main>
