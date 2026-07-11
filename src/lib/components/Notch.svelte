<script lang="ts">
  type Corner = "tl" | "tr" | "bl" | "br";

  interface Props {
    /** 逆角丸(凹み)にするコーナー */
    corner: Corner;
    class?: string;
  }

  let {
    corner,
    class: className = "",
  }: Props = $props();

  const tx = $derived(corner.endsWith("r"));
  const ty = $derived(corner.startsWith("b"));
</script>

<span
  class={`notch ${className} block overflow:hidden w:48px h:48px translate(${tx ? "0" : "-50%"},${ty ? "0" : "-50%"})::before shadow:${tx ? "-48" : "48"}px|${ty ? "-48" : "48"}px|0|0|#fff::before`}
></span>

<style>
  .notch::before {
    content: "";
    display: block;
    position: absolute;
    top: 0;
    left: 0;
    width: 200%;
    height: 200%;
    border-radius: 50%;
  }
</style>
