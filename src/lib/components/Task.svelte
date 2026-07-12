<script lang="ts">
  type Color = "red" | "orange" | "blue";

  type Palette = Record<
    Color,
    {
      base: string;
      acc: string;
    }
  >;

  const colorPalette: Palette = {
    red: {
      base: "#DF4242",
      acc: "#EF6053",
    },
    orange: {
      base: "#DE6E29",
      acc: "#E68938",
    },
    blue: {
      base: "#429FD8",
      acc: "#50C2FB",
    },
  };

  let {
    color: colorType,
    size = 100,
    r = 0,
    class: className
  }: { color: Color; size?: number; r?: number; class?: string } = $props();
</script>

<svg
  width="197"
  height="197"
  viewBox="0 0 197 197"
  fill="none"
  class="rotate({r}deg) w:{size}px h:{size}px {className}"
>
  <path
    d="M196.285 98.4444C196.285 152.814 152.345 196.889 98.1425 196.889C43.9399 196.889 0 152.814 0 98.4444C0 44.0751 43.9399 0 98.1425 0C152.345 0 196.285 44.0751 196.285 98.4444Z"
    fill={colorPalette[colorType].base}
  />
  <path
    d="M98.1426 196.889C124.172 196.889 149.135 186.517 167.54 168.055C185.945 149.593 196.285 124.554 196.285 98.4445C196.285 72.3354 185.945 47.2956 167.54 28.8337C149.135 10.3718 124.172 5.08363e-06 98.1426 0L98.1426 98.4444L98.1426 196.889Z"
    fill={colorPalette[colorType].acc}
  />
</svg>
