<script setup>
import { computed } from 'vue'

// One component for every pixel shape, per CLAUDE.md: adding a new shape
// later should mean adding one CSS class here, not a new component.
const props = defineProps({
  colors: { type: Array, default: () => [] },
  shape: { type: String, default: 'square' },
  label: { type: String, default: '' },
  isToday: { type: Boolean, default: false },
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
  <div
    class="mood-cell"
    :class="[`shape-${shape}`, { 'is-today': isToday }]"
    :style="{ background }"
    :title="label"
  ></div>
</template>

<style scoped>
.mood-cell {
  width: 100%;
  aspect-ratio: 1;
  border: 1px solid var(--color-border);
}

/* Drawn inset rather than outside the cell: an outer ring is painted over by
   neighbouring cells and is wider than the gap between them, so it gets cut
   off once the grid shrinks. An inset ring is always fully visible. */
.is-today {
  box-shadow:
    inset 0 0 0 1px var(--color-bg),
    inset 0 0 0 3px var(--color-text);
}

.shape-square {
  border-radius: 3px;
}

.shape-rounded {
  border-radius: 30%;
}

.shape-circle {
  border-radius: 50%;
}

.shape-hexagon {
  border: none;
  clip-path: polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%);
}

.shape-star {
  border: none;
  clip-path: polygon(
    50% 0%,
    61% 35%,
    98% 35%,
    68% 57%,
    79% 91%,
    50% 70%,
    21% 91%,
    32% 57%,
    2% 35%,
    39% 35%
  );
}
</style>
