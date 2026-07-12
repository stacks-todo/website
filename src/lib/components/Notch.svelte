<script lang="ts">
  type Corner = "tl" | "tr" | "bl" | "br";

  interface Props {
    corner: Corner;
    class?: string;
  }

  let {
    corner,
    class: className = "",
  }: Props = $props();

  const SIZE = 48;
  const EXT = 2;

  const tx = $derived(corner.endsWith("r"));
  const ty = $derived(corner.startsWith("b"));

  const Nx = $derived(tx ? SIZE : 0);
  const Ny = $derived(ty ? SIZE : 0);
  const Cx = $derived(SIZE - Nx);
  const Cy = $derived(SIZE - Ny);

  const ex = $derived(tx ? -1 : 1);
  const ey = $derived(ty ? -1 : 1);

  const P1 = $derived(`${Cx},${Ny}`);
  const P2 = $derived(`${Nx},${Cy}`);
  const Q = $derived(`${Cx + ex * EXT},${Cy + ey * EXT}`);
  const R1 = $derived(`${Cx + ex * EXT},${Ny}`);
  const R2 = $derived(`${Nx},${Cy + ey * EXT}`);
  const sweep = $derived(tx === ty ? 1 : 0);

  const d = $derived(
    `M${R2} L${Q} L${R1} L${P1} A${SIZE} ${SIZE} 0 0 ${sweep} ${P2} Z`,
  );
</script>

<svg
  class={`block ${className}`}
  width={SIZE}
  height={SIZE}
  viewBox={`0 0 ${SIZE} ${SIZE}`}
  style="overflow: visible"
>
  <path {d} fill="#fff" />
</svg>
