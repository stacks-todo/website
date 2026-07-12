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

  const ANCHOR_OFFSET = 160;

  function scrollToAnchor(id: string, behavior: ScrollBehavior = "smooth") {
    const el = document.getElementById(id);
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - ANCHOR_OFFSET;
    window.scrollTo({ top, behavior });
  }

  function handleAnchorClick(e: MouseEvent, id: string) {
    e.preventDefault();
    scrollToAnchor(id);
    history.pushState(null, "", `#${id}`);
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

<header class="fixed top:48px right:48px w:fit h:94px bg:#fff rbl:40px z:999">
  <nav
    class="rel w:full h:full flex flex:row list-style:none ai:center jc:end pb:20px pl:60px gap:44px f:18px_li f:semibold_li fg:#393939_li"
  >
    <Notch corner="bl" class="abs top:0 left:0 translateX(-100%)" />
    <Notch corner="bl" class="abs bottom:0 right:0 translateY(100%)" />
    <ul class="flex flex:row gap:40px">
      <li>
        <a
          href={localizeHref(resolve("/#about"))}
          onclick={(e) => handleAnchorClick(e, "about")}>{m.nav_about()}</a
        >
      </li>
      <li>
        <a href={localizeHref(resolve("/#movie"))} onclick={(e) => handleAnchorClick(e, "movie")}
          >{m.nav_movie()}</a
        >
      </li>
      <li>
        <a href={localizeHref(resolve("/#how-to-use"))} onclick={(e) => handleAnchorClick(e, "how-to-use")}
          >{m.nav_how_to_use()}</a
        >
      </li>
      <li>
        <a href={localizeHref(resolve("/#news"))} onclick={(e) => handleAnchorClick(e, "news")}
          >{m.nav_news()}</a
        >
      </li>
    </ul>
    <ul class="flex flex:row gap:16px ai:center">
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
  <h1 class="opacity:0 abs">{TITLE}</h1>
  <div class="w:100% h:calc(100dvh-96px) flex rel r:48px overflow:hidden">
    <div>
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
    <div>
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
    <div class="w:180px abs bottom:200px left:80px">
      <Logo color="#fff" />
    </div>
    <img
      src={pvTitle}
      alt={m.hero_pv_title_alt()}
      class="w:600px abs bottom:100px left:80px"
    />
    <enhanced:img
      src={pvOverlay}
      alt=""
      class="obj:cover w:100% h:auto abs bottom:0 left:0 mix-blend-mode:overlay"
    />
    <enhanced:img
      src={pv}
      alt={m.hero_pv_alt()}
      class="obj:cover w:full h:auto"
      fetchpriority="high"
    />
  </div>
  <section class="flex flex:column ai:center py:200px rel" aria-labelledby="about">
    <div>
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
    <div>
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
        class="py:80px f:32px fg:#393939 f:bold line-height:1.5 letter-spacing:.02em text-align:center"
      >
        {#each lines(m.about_heading()) as line, i}{#if i > 0}<br />{/if}{line}{/each}
      </h2>
    </div>
    <div
      class="pb:80px flex flex:column gap:40px f:16px color:#393939 line-height:2 text-align:center"
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
    <div class="w:200px">
      <Logo color="#333" />
    </div>
  </section>

  <section class="flex flex:column ai:center py:200px gap:80px" aria-labelledby="movie">
    <div class="flex flex:row ai:center gap:10px">
      <div class="rel w:80px h:80px">
        <Task color="orange" r={-10} size={40} class="abs top:20px left:0" />
        <Task color="blue" r={10} size={25} class="abs top:0 left:40px" />
      </div>
      <h2 id="movie" class="f:40px f:bold">{m.movie_heading()}</h2>
    </div>
    <div class="w:1200px r:48px overflow:hidden b:16px|solid|#393939">
      <iframe
        class="w:full video pointer-events:none"
        src="https://www.youtube.com/embed/emxMcyfFROg?&autoplay=1&amp;mute=1&loop=1&playlist=emxMcyfFROg&preload=none&playsinline=1&rel=0&modestbranding=1&color=white&cc_load_policy=1"
        title="YouTube video player"
        frameborder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        referrerpolicy="strict-origin-when-cross-origin"
        allowfullscreen
      ></iframe>
    </div>
  </section>

  <section class="flex flex:column ai:center py:200px gap:80px w:full" aria-labelledby="how-to-use">
    <div class="flex flex:row ai:center gap:60px">
      <div class="rel w:120px h:100px">
        <Task color="red" r={10} size={80} class="abs top:20px left:0" />
        <Task color="orange" r={-10} size={50} class="abs top:-25 left:64px" />
      </div>
      <div class="flex flex:column ai:center gap:10px">
        <h2 id="how-to-use" class="f:40px fg:#393939 f:bold">{m.howto_heading()}</h2>
        <span class="f:25px fg:#989492 f:semibold">{m.howto_subheading()}</span>
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
            <p class="f:30px f:bold fg:#fff">{m.howto_label()}</p>
          </div>
          <h3 class="f:40px f:semibold fg:#fff mb:100px">
            {#each lines(m.howto1_title()) as line, i}{#if i > 0}<br />{/if}{line}{/each}
          </h3>
          <p class="fg:#fff">
            {#each lines(m.howto1_body()) as line, i}{#if i > 0}<br />{/if}{line}{/each}
          </p>
        </div>
        <div class="abs w:740px top:0 right:0 z:0">
          <enhanced:img
            src={desc01}
            alt={m.howto1_alt()}
            class="w:100% h:auto"
          />
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
            <p class="f:30px f:bold fg:#fff">{m.howto_label()}</p>
          </div>
          <h3 class="f:40px f:semibold fg:#fff mb:100px">
            {#each lines(m.howto2_title()) as line, i}{#if i > 0}<br />{/if}{line}{/each}
          </h3>
          <p class="fg:#fff">
            {#each lines(m.howto2_body()) as line, i}{#if i > 0}<br />{/if}{line}{/each}
          </p>
        </div>
        <div class="abs w:800px top:-20px right:-20px z:0">
          <enhanced:img
            src={desc02}
            alt={m.howto2_alt()}
            class="w:100% h:auto"
          />
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
            <p class="f:30px f:bold fg:#fff">{m.howto_label()}</p>
          </div>
          <h3 class="f:40px f:semibold fg:#fff mb:100px">
            {#each lines(m.howto3_title()) as line, i}{#if i > 0}<br />{/if}{line}{/each}
          </h3>
          <p class="fg:#fff">
            {#each lines(m.howto3_body()) as line, i}{#if i > 0}<br />{/if}{line}{/each}
          </p>
        </div>
        <div class="abs w:740px top:-20px right:0 z:0">
          <enhanced:img
            src={desc03}
            alt={m.howto3_alt()}
            class="w:100% h:auto"
          />
        </div>
      </div>
    </div>
  </section>

  <section class="flex flex:row ai:start jc:center gap:100px py:200px w:full" aria-labelledby="news">
    <div class="flex flex:row ai:center gap:20px">
      <div class="rel w:120px h:100px">
        <Task color="red" r={10} size={70} class="abs top:60px left:0" />
        <Task color="orange" r={-10} size={40} class="abs top:18 left:60px" />
        <Task color="blue" r={20} size={20} class="abs top:-10 left:36px" />
      </div>
      <div class="flex flex:column ai:start gap:10px">
        <h2 id="news" class="f:50px fg:#393939 f:bold">{m.news_heading()}</h2>
        <span class="f:25px fg:#989492 f:semibold">{m.news_subheading()}</span>
      </div>
      <div class="rel w:60px h:100px">
        <Task color="orange" r={-10} size={40} class="abs top:-40px left:0" />
        <Task color="blue" r={10} size={20} class="abs top:-80px left:-20px" />
      </div>
    </div>
    <ul class="flex flex:column w:900px gap:40px list-style:none" aria-labelledby="news">
      {#each newsItems as item}
        <li class="flex flex:column gap:40px">
          <div class="grid grid-template-columns:100px|100px|1fr gap:80px">
            <time class="f:19px fg:#393939" datetime={item.date.replaceAll(".", "-")}
              >{item.date}</time
            >
            <span class="f:20px f:medium fg:#989492 w:100px">{item.tag}</span>
            <p class="f:20px f:medium fg:#393939">{item.title}</p>
          </div>
          <span class="w:full bb:1px|solid|#E6E2E0"></span>
        </li>
      {/each}
    </ul>
  </section>

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
        <a href={localizeHref(resolve("/"))} onclick={handleTopClick} aria-label={m.footer_top_aria()}
          ><Logo color="#fff" /></a
        >
      </div>
      <span class="flex w:2px h:30px bg:#fff"></span>
      <div class="flex flex:row gap:20px">
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
      <p class="fg:#A6A3A2">{m.footer_copyright()}</p>
    </div>
  </footer>
</main>
