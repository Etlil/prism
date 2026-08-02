<script setup>
import { computed } from 'vue'

const props = defineProps({
  colors: { type: Array, default: () => [] },
  label: { type: String, default: '' },
  isToday: { type: Boolean, default: false },
  // Grid positions that aren't real dates (Feb 30, Apr 31) render as a gap and
  // must not be tappable.
  disabled: { type: Boolean, default: false },
})

// conic-gradient draws the pie natively — no SVG or chart library needed. Each
// mood gets an equal slice, so two photos tagged joyful and sad split the
// pixel in half.
const background = computed(() => {
  if (props.colors.length === 0) return 'var(--color-bg-soft)'
  if (props.colors.length === 1) return props.colors[0]

  const slice = 100 / props.colors.length
  const stops = props.colors
    .map((color, i) => `${color} ${i * slice}% ${(i + 1) * slice}%`)
    .join(', ')
  return `conic-gradient(${stops})`
})
</script>

<template>
  <!-- A button rather than a div so it is reachable by keyboard and announced
       as something you can activate. The parent decides what a tap does. -->
  <button
    type="button"
    class="mood-cell"
    :class="{ 'is-today': isToday }"
    :style="{ background }"
    :title="label"
    :aria-label="label"
    :disabled="disabled"
  ></button>
</template>

<style scoped>
.mood-cell {
  width: 100%;
  aspect-ratio: 1;
  border-radius: 3px;
  border: 1px solid var(--color-border);
  /* Buttons bring their own padding, font and background — all of which would
     break the grid geometry. */
  padding: 0;
  font: inherit;
  cursor: pointer;
  /* Stops a tap on a phone waiting to see if it's a double-tap-to-zoom. */
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}

.mood-cell:disabled {
  cursor: default;
}

.mood-cell:not(:disabled):hover {
  /* Inset, like the today ring: an outer glow on a ~25px cell gets painted
     over by its neighbours. */
  box-shadow: inset 0 0 0 2px var(--color-text);
}

.mood-cell:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 1px;
  z-index: 1;
}

/* Drawn inset rather than outside the cell: an outer ring is painted over by
   neighbouring cells and is wider than the gap between them, so it gets cut
   off once the grid shrinks. An inset ring is always fully visible. */
.is-today {
  box-shadow:
    inset 0 0 0 1px var(--color-bg),
    inset 0 0 0 3px var(--color-text);
}

</style>
