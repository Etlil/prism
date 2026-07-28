<script setup>
// One component for every pixel shape, per CLAUDE.md: adding a new shape
// later should mean adding one CSS class here, not a new component.
defineProps({
  color: { type: String, default: '' },
  shape: { type: String, default: 'square' },
  label: { type: String, default: '' },
})
</script>

<template>
  <div
    class="mood-cell"
    :class="`shape-${shape}`"
    :style="{ background: color || 'var(--color-bg-soft)' }"
    :title="label"
  ></div>
</template>

<style scoped>
.mood-cell {
  width: 100%;
  aspect-ratio: 1;
  border: 1px solid var(--color-border);
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
