<script lang="ts">
  import { onMount } from "svelte";
  import { resolve } from "$app/paths";
  import Task from "$lib/components/Task.svelte";
  import Notch from "$lib/components/Notch.svelte";
  import Logo from "$lib/components/Logo.svelte";
  import pv from "$lib/assets/img/pv.png?enhanced";
  import pvOverlay from "$lib/assets/img/pv_overlay.png?enhanced";
  import pvTitle from "$lib/assets/img/pv_title.svg";
  import desc01 from "$lib/assets/img/desc_01.png?enhanced";
  import desc02 from "$lib/assets/img/desc_02.png?enhanced";
  import desc03 from "$lib/assets/img/desc_03.png?enhanced";
  import { icon } from "$lib/assets/icons";
  import { m } from "$lib/paraglide/messages";
  import { getLocale, setLocale, locales, localizeHref, deLocalizeUrl } from "$lib/paraglide/runtime";

  function lines(text: string): string[] {
    return text.split("\n");
  }

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

  const MOBILE_WIDTH = 834;
  const BALL_SCALE_WIDTH = 900;
  const BALL_SCALE_MIN = 0.34;
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
  let menuOpen = $state(false);

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

  function ballScale(width: number): number {
    return Math.max(BALL_SCALE_MIN, Math.min(1, width / BALL_SCALE_WIDTH));
  }

  function spawnBalls(width: number, height: number) {
    const scale = ballScale(width);
    balls = initialBalls.map((b, i) => {
      const r = (b.size * scale) / 2;
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
    const radius = BURST_RADIUS * ballScale(footerEl?.clientWidth ?? BALL_SCALE_WIDTH);
    for (const b of balls) {
      const dx = b.x - cx;
      const dy = b.y - cy;
      const dist = Math.hypot(dx, dy) || 1;
      if (dist < radius) {
        const power = BURST_POWER * (1 - dist / radius);
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

  const VIDEO_ID = "emxMcyfFROg";
  let videoIframe: HTMLIFrameElement | undefined = $state();
  let videoMuted = $state(true);

  function postToPlayer(func: string) {
    videoIframe?.contentWindow?.postMessage(
      JSON.stringify({ event: "command", func, args: [] }),
      "https://www.youtube.com",
    );
  }

  function toggleVideoMute() {
    postToPlayer(videoMuted ? "unMute" : "mute");
    videoMuted = !videoMuted;
  }

  const ANCHOR_OFFSET = 160;
  const ANCHOR_OFFSET_MOBILE = 96;

  const navItems = [
    { id: "about", label: () => m.nav_about() },
    { id: "movie", label: () => m.nav_movie() },
    { id: "how-to-use", label: () => m.nav_how_to_use() },
    { id: "news", label: () => m.nav_news() },
  ];

  function anchorOffset(): number {
    return window.innerWidth < MOBILE_WIDTH ? ANCHOR_OFFSET_MOBILE : ANCHOR_OFFSET;
  }

  function scrollToAnchor(id: string, behavior: ScrollBehavior = "smooth") {
    const el = document.getElementById(id);
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - anchorOffset();
    window.scrollTo({ top, behavior });
  }

  function handleAnchorClick(e: MouseEvent, id: string) {
    e.preventDefault();
    menuOpen = false;
    scrollToAnchor(id);
    history.pushState(null, "", `#${id}`);
  }

  function handleWindowKeydown(e: KeyboardEvent) {
    if (e.key === "Escape") menuOpen = false;
  }

  function handleWindowResize() {
    if (window.innerWidth >= MOBILE_WIDTH) menuOpen = false;
  }

  function handleTopClick(e: MouseEvent) {
    if (deLocalizeUrl(location.href).pathname !== resolve("/")) return;
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: "smooth" });
    history.pushState(null, "", location.pathname);
  }

  onMount(() => {
    if (!footerEl) return;
    trySpawn();

    if (location.hash) {
      scrollToAnchor(location.hash.slice(1), "auto");
    }

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
  const TITLE = m.meta_title();
  const DESCRIPTION = m.meta_description();
  const OG_IMAGE = `${BASE_URL}/og-image.png`;
  const CANONICAL_URL = getLocale() === "ja" ? BASE_URL : `${BASE_URL}/${getLocale()}`;
  const OG_LOCALE = getLocale() === "ja" ? "ja_JP" : "en_US";

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
    image: OG_IMAGE,
    brand: {
      "@type": "Brand",
      name: "STACKS",
      sameAs: links.map((l) => l.link),
    },
  };
</script>

<svelte:window onkeydown={handleWindowKeydown} onresize={handleWindowResize} />

<svelte:head>
  <title>{TITLE}</title>
  <meta name="description" content={DESCRIPTION} />
  <meta name="robots" content="index, follow" />
  <link rel="canonical" href={CANONICAL_URL} />
  <link rel="alternate" hreflang="ja" href={BASE_URL} />
  <link rel="alternate" hreflang="en" href={`${BASE_URL}/en`} />
  <link rel="alternate" hreflang="x-default" href={BASE_URL} />

  <meta property="og:type" content="website" />
  <meta property="og:url" content={CANONICAL_URL} />
  <meta property="og:site_name" content="STACKS" />
  <meta property="og:title" content={TITLE} />
  <meta property="og:description" content={DESCRIPTION} />
  <meta property="og:image" content={OG_IMAGE} />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:alt" content={TITLE} />
  <meta property="og:locale" content={OG_LOCALE} />

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content={TITLE} />
  <meta name="twitter:description" content={DESCRIPTION} />
  <meta name="twitter:image" content={OG_IMAGE} />
  <meta name="twitter:image:alt" content={TITLE} />

  {@html `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>`}
</svelte:head>

{#if menuOpen}
  <button
    type="button"
    aria-label={m.nav_menu_close_aria()}
    onclick={() => (menuOpen = false)}
    class="fixed inset:0 z:998 bg:transparent b:none hidden@sm"
  ></button>
{/if}

<header
  class="fixed top:48px right:48px top:20px@<sm right:20px@<sm w:fit h:94px h:auto@<sm bg:#fff rbl:40px rbl:24px@<sm z:999 ~width|.45s|cubic-bezier(.22,1,.36,1) {menuOpen
    ? 'w:240px@<sm'
    : 'w:64px@<sm'}"
>
  <Notch corner="bl" class="abs top:0 left:0 translateX(-100%) w:20px@<sm h:20px@<sm" />
  <Notch corner="bl" class="abs bottom:0 right:0 translateY(100%) w:20px@<sm h:20px@<sm" />
  <nav
    class="rel w:full h:full h:64px@<sm flex flex:row list-style:none ai:center jc:end pb:20px pb:0@<sm pl:60px pl:0@<sm gap:44px f:18px_li f:semibold_li fg:#393939_li"
  >
    <ul class="flex flex:row gap:40px hidden@<sm">
      {#each navItems as item}
        <li>
          <a
            href={localizeHref(`${resolve("/")}#${item.id}`)}
            onclick={(e) => handleAnchorClick(e, item.id)}>{item.label()}</a
          >
        </li>
      {/each}
    </ul>
    <ul class="flex flex:row gap:16px ai:center hidden@<sm">
      <li>
        <ul class="flex flex:row gap:8px f:14px" aria-label={m.lang_switch_aria()}>
          {#each locales as l}
            <li>
              <button
                type="button"
                onclick={() => setLocale(l)}
                aria-current={getLocale() === l ? "true" : undefined}
                class="fg:#393939 opacity:{getLocale() === l ? '1' : '.4'}"
              >{l.toUpperCase()}</button>
            </li>
          {/each}
        </ul>
      </li>
      <li>
        <a
          href={localizeHref(resolve("/"))}
          class="flex flex:row ai:center jc:center h:48px r:25px p:8px|30px gap:8px bg:#18A9BD fg:#fff fill:#fff>svg>path"
        >
          <span>{m.nav_buy()}</span>
          <svg
            width="13"
            height="13"
            viewBox="0 0 13 13"
            fill="none"
            aria-hidden="true"
            focusable="false"
          >
            <path
              d="M11.608 0C12.0657 0.000213122 12.4361 0.370395 12.4362 0.828125V8.29004C12.4362 8.74793 12.0649 9.11912 11.6071 9.11914C11.1497 9.1188 10.7784 8.74836 10.778 8.29102V2.83008L1.41565 12.1934C1.09191 12.517 0.566575 12.517 0.242801 12.1934C-0.0809609 11.8696 -0.0809064 11.3443 0.242801 11.0205L9.60608 1.65723H4.14514C3.68777 1.65695 3.31652 1.28643 3.31604 0.829102C3.31604 0.371195 3.68821 -3.37175e-07 4.14612 0H11.608Z"
            />
          </svg>
        </a>
      </li>
    </ul>
    <button
      type="button"
      onclick={() => (menuOpen = !menuOpen)}
      aria-expanded={menuOpen}
      aria-controls="mobile-menu"
      aria-label={menuOpen ? m.nav_menu_close_aria() : m.nav_menu_open_aria()}
      class="flex flex:column ai:center jc:center gap:5px w:64px h:64px hidden@sm"
    >
      <span
        class="block w:20px h:2px r:1px bg:#393939 ~transform|.3s|cubic-bezier(.22,1,.36,1)"
        style:transform={menuOpen ? "translateY(7px) rotate(45deg)" : "none"}
      ></span>
      <span
        class="block w:20px h:2px r:1px bg:#393939 ~opacity|.2s"
        style:opacity={menuOpen ? 0 : 1}
      ></span>
      <span
        class="block w:20px h:2px r:1px bg:#393939 ~transform|.3s|cubic-bezier(.22,1,.36,1)"
        style:transform={menuOpen ? "translateY(-7px) rotate(-45deg)" : "none"}
      ></span>
    </button>
  </nav>
  <div
    id="mobile-menu"
    inert={!menuOpen}
    class="grid hidden@sm ~grid-template-rows|.45s|cubic-bezier(.22,1,.36,1) {menuOpen
      ? 'grid-template-rows:1fr'
      : 'grid-template-rows:0fr'}"
  >
    <div class="overflow:hidden">
      <div
        class="flex flex:column gap:18px px:20px pb:24px ~opacity|.3s {menuOpen
          ? 'opacity:1'
          : 'opacity:0'}"
      >
        <ul class="flex flex:column gap:16px list-style:none f:16px_li f:semibold_li fg:#393939_li">
          {#each navItems as item}
            <li>
              <a
                href={localizeHref(`${resolve("/")}#${item.id}`)}
                onclick={(e) => handleAnchorClick(e, item.id)}>{item.label()}</a
              >
            </li>
          {/each}
        </ul>
        <span class="w:full bb:1px|solid|#E6E2E0"></span>
        <div class="flex flex:row ai:center jc:space-between gap:12px">
          <ul class="flex flex:row gap:10px f:15px f:semibold" aria-label={m.lang_switch_aria()}>
            {#each locales as l}
              <li>
                <button
                  type="button"
                  onclick={() => setLocale(l)}
                  aria-current={getLocale() === l ? "true" : undefined}
                  class="fg:#393939 opacity:{getLocale() === l ? '1' : '.4'}"
                >{l.toUpperCase()}</button>
              </li>
            {/each}
          </ul>
          <a
            href={localizeHref(resolve("/"))}
            class="flex flex:row ai:center jc:center h:40px r:20px p:6px|18px f:14px gap:8px bg:#18A9BD fg:#fff fill:#fff>svg>path"
          >
            <span>{m.nav_buy()}</span>
            <svg
              width="13"
              height="13"
              viewBox="0 0 13 13"
              fill="none"
              aria-hidden="true"
              focusable="false"
            >
              <path
                d="M11.608 0C12.0657 0.000213122 12.4361 0.370395 12.4362 0.828125V8.29004C12.4362 8.74793 12.0649 9.11912 11.6071 9.11914C11.1497 9.1188 10.7784 8.74836 10.778 8.29102V2.83008L1.41565 12.1934C1.09191 12.517 0.566575 12.517 0.242801 12.1934C-0.0809609 11.8696 -0.0809064 11.3443 0.242801 11.0205L9.60608 1.65723H4.14514C3.68777 1.65695 3.31652 1.28643 3.31604 0.829102C3.31604 0.371195 3.68821 -3.37175e-07 4.14612 0H11.608Z"
              />
            </svg>
          </a>
        </div>
      </div>
    </div>
  </div>
</header>

<div class="fixed top:0 left:0 w:100% h:100dvh flex pointer-events:none z:999">
  <div class="w:full h:full rel">
    <span class="abs top:0 left:0 w:100% h:48px h:20px@<sm bg:#fff">
      <Notch corner="br" class="abs bottom:0 left:48px left:20px@<sm translateY(100%) w:20px@<sm h:20px@<sm" />
    </span>

    <span class="abs bottom:0 left:0 w:100% h:48px h:20px@<sm bg:#fff">
      <Notch corner="tr" class="abs top:0 left:48px left:20px@<sm translateY(-100%) w:20px@<sm h:20px@<sm" />
      <Notch corner="tl" class="abs top:0 right:48px right:20px@<sm translateY(-100%) w:20px@<sm h:20px@<sm" />
    </span>
  </div>
</div>

<main class="flex flex:column w:100% p:48px p:20px@<sm ai:center jc:center">
  <h1 class="opacity:0 abs">{TITLE}</h1>
  <div class="w:100% h:calc(100dvh-96px) h:calc(100dvh-40px)@<sm flex rel r:48px r:24px@<sm overflow:hidden">
    <div class="abs inset:0 pointer-events:none transform-origin:left|top scale(.5)@<sm">
      <Task color="red" r={0} size={200} class="abs top:-10px left:-160px" />
      <Task color="red" r={-10} size={300} class="abs top:-30px left:190px" />
      <Task color="red" r={2} size={200} class="abs top:-160px left:40px" />
      <Task color="blue" r={-30} size={120} class="abs top:50px left:50px" />
      <Task color="blue" r={-60} size={100} class="abs top:-60px left:460px" />
      <Task color="blue" r={120} size={90} class="abs top:20px left:720px" />
      <Task color="orange" r={20} size={140} class="abs top:50px left:500px" />
      <Task
        color="orange"
        r={-40}
        size={140}
        class="abs top:-80px left:580px"
      />
    </div>
    <div class="abs inset:0 pointer-events:none transform-origin:right|bottom scale(.5)@<sm">
      <Task
        color="red"
        r={-10}
        size={300}
        class="abs bottom:-170px right:430px"
      />
      <Task color="red" r={2} size={250} class="abs bottom:44px right:-44px" />
      <Task
        color="blue"
        r={-30}
        size={120}
        class="abs bottom:300px right:-50px"
      />
      <Task
        color="blue"
        r={-60}
        size={90}
        class="abs bottom:-10px right:330px"
      />
      <Task
        color="blue"
        r={120}
        size={90}
        class="abs bottom:80px right:390px"
      />
      <Task
        color="orange"
        r={0}
        size={200}
        class="abs bottom:-160px right:-100px"
      />
      <Task
        color="orange"
        r={20}
        size={140}
        class="abs bottom:100px right:240px"
      />
      <Task
        color="orange"
        r={-40}
        size={140}
        class="abs bottom:-40px right:170px"
      />
    </div>
    <div class="w:180px w:110px@<sm abs bottom:200px bottom:110px@<sm left:80px left:24px@<sm">
      <Logo color="#fff" />
    </div>
    <img
      src={pvTitle}
      alt={m.hero_pv_title_alt()}
      class="w:600px w:calc(100%-48px)@<sm abs bottom:100px bottom:48px@<sm left:80px left:24px@<sm"
    />
    <enhanced:img
      src={pvOverlay}
      alt=""
      sizes="100vw"
      class="obj:cover w:100% h:100% abs bottom:0 left:0 mix-blend-mode:overlay"
    />
    <enhanced:img
      src={pv}
      alt={m.hero_pv_alt()}
      sizes="100vw"
      class="obj:cover object-position:70%|50%@<sm w:full h:100%"
      fetchpriority="high"
    />
  </div>
  <section class="flex flex:column ai:center py:200px py:100px@<sm w:full@<sm rel" aria-labelledby="about">
    <div class="hidden@<lg">
      <Task color="blue" r={10} size={60} class="abs top:170px left:-250px" />
      <Task
        color="orange"
        r={-2}
        size={100}
        class="abs top:240px left:-170px"
      />
      <Task color="red" r={-30} size={150} class="abs top:400px left:-320px" />
      <Task color="blue" r={60} size={60} class="abs top:680px left:-160px" />
      <Task color="red" r={120} size={150} class="abs top:940px left:-250px" />
    </div>
    <div class="hidden@<lg">
      <Task color="red" r={-10} size={150} class="abs top:300px right:-250px" />
      <Task color="blue" r={20} size={60} class="abs top:560px right:-340px" />
      <Task
        color="orange"
        r={-30}
        size={100}
        class="abs top:800px right:-320px"
      />
      <Task color="blue" r={30} size={60} class="abs top:980px right:-160px" />
      <Task
        color="orange"
        r={120}
        size={100}
        class="abs top:1100px right:-250px"
      />
    </div>
    <div>
      <h2
        id="about"
        class="py:80px py:40px@<sm f:32px f:24px@<sm fg:#393939 f:bold line-height:1.5 letter-spacing:.02em text-align:center"
      >
        {#each lines(m.about_heading()) as line, i}{#if i > 0}<br />{/if}{line}{/each}
      </h2>
    </div>
    <div
      class="pb:80px pb:40px@<sm flex flex:column gap:40px gap:24px@<sm w:full@<sm max-w:640px f:16px f:14px@<sm color:#393939 line-height:2 text-align:center"
    >
      <p>{m.about_p1()}</p>
      <p>
        {#each lines(m.about_p2()) as line, i}{#if i > 0}<br />{/if}{line}{/each}
      </p>
      <p>{m.about_p3()}</p>
      <p>{m.about_p4()}</p>
      <p>
        {#each lines(m.about_p5()) as line, i}{#if i > 0}<br />{/if}{line}{/each}
      </p>
    </div>
    <div class="w:200px w:140px@<sm">
      <Logo color="#333" />
    </div>
  </section>

  <section class="flex flex:column ai:center py:200px py:100px@<sm gap:80px gap:40px@<sm w:full" aria-labelledby="movie">
    <div class="flex flex:row ai:center gap:10px">
      <div class="rel w:80px h:80px">
        <Task color="orange" r={-10} size={40} class="abs top:20px left:0" />
        <Task color="blue" r={10} size={25} class="abs top:0 left:40px" />
      </div>
      <h2 id="movie" class="f:40px f:28px@<sm f:bold">{m.movie_heading()}</h2>
    </div>
    <div class="rel w:full max-w:1200px r:48px r:24px@<sm overflow:hidden b:16px|solid|#393939 b:8px|solid|#393939@<sm">
      <iframe
        bind:this={videoIframe}
        class="w:full video pointer-events:none"
        src={`https://www.youtube.com/embed/${VIDEO_ID}?autoplay=1&mute=1&loop=1&playlist=${VIDEO_ID}&preload=none&playsinline=1&rel=0&modestbranding=1&color=white&cc_load_policy=1&enablejsapi=1&controls=0&disablekb=1&iv_load_policy=3`}
        title="YouTube video player"
        frameborder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        referrerpolicy="strict-origin-when-cross-origin"
        allowfullscreen
      ></iframe>
      <div class="abs bottom:20px bottom:12px@<sm right:20px right:12px@<sm z:1 flex flex:row gap:12px gap:8px@<sm">
        <button
          type="button"
          onclick={toggleVideoMute}
          aria-label={videoMuted ? m.movie_unmute_aria() : m.movie_mute_aria()}
          class="flex ai:center jc:center w:48px w:40px@<sm h:48px h:40px@<sm r:24px r:20px@<sm bg:#18A9BD fill:#fff>svg"
        >
          {#if videoMuted}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
              <path d="M4 9v6h4l5 5V4L8 9H4Z" fill="white" />
              <path
                d="M18.5 8.5 15 12m0 0-3.5 3.5M15 12l-3.5-3.5M15 12l3.5 3.5"
                stroke="white"
                stroke-width="1.6"
                stroke-linecap="round"
              />
            </svg>
          {:else}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
              <path d="M4 9v6h4l5 5V4L8 9H4Z" fill="white" />
              <path
                d="M16.5 9c1 1 1.5 2 1.5 3s-.5 2-1.5 3M18.8 6.7c1.8 1.6 2.7 3.4 2.7 5.3s-.9 3.7-2.7 5.3"
                stroke="white"
                stroke-width="1.6"
                stroke-linecap="round"
                fill="none"
              />
            </svg>
          {/if}
        </button>
        <a
          href={`https://www.youtube.com/watch?v=${VIDEO_ID}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={m.movie_watch_aria()}
          class="flex ai:center jc:center w:48px w:40px@<sm h:48px h:40px@<sm r:24px r:20px@<sm bg:#18A9BD fill:#fff>svg"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
            <path
              d="M9 6H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3M13 4h7v7M20 4l-9 9"
              stroke="white"
              stroke-width="1.6"
              stroke-linecap="round"
              stroke-linejoin="round"
              fill="none"
            />
          </svg>
        </a>
      </div>
    </div>
  </section>

  <section class="flex flex:column ai:center py:200px py:100px@<sm gap:80px gap:40px@<sm w:full" aria-labelledby="how-to-use">
    <div class="flex flex:row flex:column@<sm ai:center gap:60px gap:16px@<sm">
      <div class="rel w:120px h:100px hidden@<sm">
        <Task color="red" r={10} size={80} class="abs top:20px left:0" />
        <Task color="orange" r={-10} size={50} class="abs top:-25 left:64px" />
      </div>
      <div class="flex flex:column ai:center gap:10px">
        <h2 id="how-to-use" class="f:40px f:28px@<sm fg:#393939 f:bold">{m.howto_heading()}</h2>
        <span class="f:25px f:18px@<sm fg:#989492 f:semibold">{m.howto_subheading()}</span>
      </div>
      <div class="rel w:100px h:100px hidden@<sm">
        <Task color="blue" r={10} size={30} class="abs top:20px left:0" />
      </div>
    </div>
    <div class="w:full flex flex:column gap:20px gap:16px@<sm">
      <div
        class="bg:#3F9BD6 rel w:full h:600px h:auto@<sm r:48px r:24px@<sm pl:200px pl:120px@<lg p:32px|24px@<sm flex flex:column@<sm ai:center ai:start@<sm gap:24px@<sm overflow:hidden"
      >
        <span
          class="abs top:-100px top:-40px@<sm left:-80px left:-20px@<sm f:600px f:240px@<sm f:bold line-h:600px line-h:240px@<sm fg:#CFCFD8 opacity:.1 z:0"
          >01</span
        >
        <div class="flex flex:column z:1">
          <div class="rel flex@<sm ai:center@<sm gap:10px@<sm mb:40px mb:20px@<sm">
            <span class="abs rel@<sm top:50% top:auto@<sm left:-40px left:auto@<sm translateY(-50%) translateY(0)@<sm">
              <svg
                class="w:30px"
                viewBox="0 0 21 21"
                fill="none"
                aria-hidden="true"
                focusable="false"
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
            <p class="f:30px f:20px@<sm f:bold fg:#fff">{m.howto_label()}</p>
          </div>
          <h3 class="f:40px f:28px@<lg f:20px@<sm f:17px@<4xs f:semibold fg:#fff mb:100px mb:24px@<sm">
            {#each lines(m.howto1_title()) as line, i}{#if i > 0}<br />{/if}{line}{/each}
          </h3>
          <p class="fg:#fff f:14px@<sm">
            {#each lines(m.howto1_body()) as line, i}{#if i > 0}<br />{/if}{line}{/each}
          </p>
        </div>
        <div class="abs static@<sm w:740px w:45%@<lg w:full@<sm top:0 right:0 z:0">
          <enhanced:img
            src={desc01}
            alt={m.howto1_alt()}
            class="w:100% h:auto"
            loading="lazy"
          />
        </div>
      </div>
      <div
        class="bg:#DE6E29 rel w:full h:600px h:auto@<sm r:48px r:24px@<sm pl:200px pl:120px@<lg p:32px|24px@<sm flex flex:column@<sm ai:center ai:start@<sm gap:24px@<sm overflow:hidden"
      >
        <span
          class="abs top:-100px top:-40px@<sm left:-80px left:-20px@<sm f:600px f:240px@<sm f:bold line-h:600px line-h:240px@<sm fg:#CFCFD8 opacity:.1 z:0"
          >02</span
        >
        <div class="flex flex:column z:1">
          <div class="rel flex@<sm ai:center@<sm gap:10px@<sm mb:40px mb:20px@<sm">
            <span class="abs rel@<sm top:50% top:auto@<sm left:-40px left:auto@<sm translateY(-50%) translateY(0)@<sm">
              <svg
                class="w:30px"
                viewBox="0 0 21 21"
                fill="none"
                aria-hidden="true"
                focusable="false"
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
            <p class="f:30px f:20px@<sm f:bold fg:#fff">{m.howto_label()}</p>
          </div>
          <h3 class="f:40px f:28px@<lg f:20px@<sm f:17px@<4xs f:semibold fg:#fff mb:100px mb:24px@<sm">
            {#each lines(m.howto2_title()) as line, i}{#if i > 0}<br />{/if}{line}{/each}
          </h3>
          <p class="fg:#fff f:14px@<sm">
            {#each lines(m.howto2_body()) as line, i}{#if i > 0}<br />{/if}{line}{/each}
          </p>
        </div>
        <div class="abs static@<sm w:800px w:48%@<lg w:full@<sm top:-20px right:-20px z:0">
          <enhanced:img
            src={desc02}
            alt={m.howto2_alt()}
            class="w:100% h:auto"
            loading="lazy"
          />
        </div>
      </div>
      <div
        class="bg:#DF4242 rel w:full h:600px h:auto@<sm r:48px r:24px@<sm pl:200px pl:120px@<lg p:32px|24px@<sm flex flex:column@<sm ai:center ai:start@<sm gap:24px@<sm overflow:hidden"
      >
        <span
          class="abs top:-100px top:-40px@<sm left:-80px left:-20px@<sm f:600px f:240px@<sm f:bold line-h:600px line-h:240px@<sm fg:#CFCFD8 opacity:.1 z:0"
          >03</span
        >
        <div class="flex flex:column z:1">
          <div class="rel flex@<sm ai:center@<sm gap:10px@<sm mb:40px mb:20px@<sm">
            <span class="abs rel@<sm top:50% top:auto@<sm left:-40px left:auto@<sm translateY(-50%) translateY(0)@<sm">
              <svg
                class="w:30px"
                viewBox="0 0 21 21"
                fill="none"
                aria-hidden="true"
                focusable="false"
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
            <p class="f:30px f:20px@<sm f:bold fg:#fff">{m.howto_label()}</p>
          </div>
          <h3 class="f:40px f:28px@<lg f:20px@<sm f:17px@<4xs f:semibold fg:#fff mb:100px mb:24px@<sm">
            {#each lines(m.howto3_title()) as line, i}{#if i > 0}<br />{/if}{line}{/each}
          </h3>
          <p class="fg:#fff f:14px@<sm">
            {#each lines(m.howto3_body()) as line, i}{#if i > 0}<br />{/if}{line}{/each}
          </p>
        </div>
        <div class="abs static@<sm w:740px w:45%@<lg w:full@<sm top:-20px right:0 z:0">
          <enhanced:img
            src={desc03}
            alt={m.howto3_alt()}
            class="w:100% h:auto"
            loading="lazy"
          />
        </div>
      </div>
    </div>
  </section>

  <section class="flex flex:row flex:column@<lg ai:start ai:center@<lg jc:center gap:100px gap:120px@<lg gap:60px@<sm py:200px py:100px@<sm w:full" aria-labelledby="news">
    <div class="flex flex:row ai:center gap:20px gap:12px@<sm">
      <div class="rel w:120px h:100px w:80px@<sm">
        <Task color="red" r={10} size={70} class="abs top:60px left:0 top:50px@<sm scale(.8)@<sm" />
        <Task color="orange" r={-10} size={40} class="abs top:18 left:60px left:50px@<sm scale(.8)@<sm" />
        <Task color="blue" r={20} size={20} class="abs top:-10 left:36px scale(.8)@<sm" />
      </div>
      <div class="flex flex:column ai:start gap:10px">
        <h2 id="news" class="f:50px f:32px@<sm fg:#393939 f:bold">{m.news_heading()}</h2>
        <span class="f:25px f:16px@<sm fg:#989492 f:semibold">{m.news_subheading()}</span>
      </div>
      <div class="rel w:60px h:100px">
        <Task color="orange" r={-10} size={40} class="abs top:-40px left:0" />
        <Task color="blue" r={10} size={20} class="abs top:-80px left:-20px" />
      </div>
    </div>
    <ul class="flex flex:column w:900px w:full@<lg max-w:900px gap:40px gap:24px@<sm list-style:none" aria-labelledby="news">
      {#each newsItems as item}
        <li class="flex flex:column gap:40px gap:16px@<sm">
          <div class="grid grid-template-columns:100px|100px|1fr grid-template-columns:auto|1fr@<sm gap:80px gap:6px|16px@<sm">
            <time class="f:19px f:14px@<sm fg:#393939" datetime={item.date.replaceAll(".", "-")}
              >{item.date}</time
            >
            <span class="f:20px f:15px@<sm f:medium fg:#989492 w:100px w:auto@<sm">{item.tag}</span>
            <p class="f:20px f:15px@<sm f:medium fg:#393939 grid-column:1/3@<sm">{item.title}</p>
          </div>
          <span class="w:full bb:1px|solid|#E6E2E0"></span>
        </li>
      {/each}
    </ul>
  </section>

  <footer
    bind:this={footerEl}
    class="bg:#333333 rel w:full h:calc(100dvh-96px) h:70dvh@<sm r:48px r:24px@<sm p:80px p:32px|24px@<sm flex flex:column gap:60px gap:28px@<sm overflow:hidden"
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

    <div class="rel z:1 flex flex:row flex:column@<sm gap:100px gap:20px@<sm ai:end ai:start@<sm">
      <div class="w:200px w:150px@<sm">
        <a href={localizeHref(resolve("/"))} onclick={handleTopClick} aria-label={m.footer_top_aria()}
          ><Logo color="#fff" /></a
        >
      </div>
      <span class="flex hidden@<sm w:2px h:30px bg:#fff"></span>
      <div class="flex flex:row gap:20px gap:16px@<sm">
        {#each links as link}
          <div>
            <a
              href={link.link}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={m.footer_social_aria({ label: link.label })}
              >{@html icon(link.label)}</a
            >
          </div>
        {/each}
      </div>
    </div>
    <div class="rel z:1">
      <p class="fg:#A6A3A2 f:13px@<sm">{m.footer_copyright()}</p>
    </div>
  </footer>
</main>
