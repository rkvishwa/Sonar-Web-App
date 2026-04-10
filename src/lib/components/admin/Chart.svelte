<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import Chart from "chart.js/auto";

  let { type, data, options = {} } = $props();

  let canvas: HTMLCanvasElement;
  let chart: Chart | null = null;

  onMount(() => {
    if (canvas) {
      chart = new Chart(canvas, {
        type,
        data,
        options: {
          responsive: true,
          maintainAspectRatio: false,
          ...options
        }
      });
    }

    return () => {
      if (chart) {
        chart.destroy();
      }
    };
  });

  $effect(() => {
    if (chart && data) {
      chart.data = data;
      chart.options = { ...chart.options, ...options };
      chart.update();
    }
  });
</script>

<div class="relative w-full h-full min-h-[300px]">
  <canvas bind:this={canvas}></canvas>
</div>
