<script setup>
import { computed } from 'vue'
import { entries } from '@/data/fakeEntries'
import PolaroidPhoto from '@/components/PolaroidPhoto.vue'

const sorted = computed(() => [...entries].sort((a, b) => (a.isoDate < b.isoDate ? 1 : -1)))
</script>

<template>
  <div class="photo-journal">
    <header class="page-header">
      <h1>Photo Journal</h1>
      <p class="subtitle">Tap a photo to flip it over and read the entry.</p>
    </header>

    <div class="wall">
      <PolaroidPhoto v-for="entry in sorted" :key="entry.id" :entry="entry" />
    </div>
  </div>
</template>

<style scoped>
.photo-journal {
  max-width: 1100px;
}

.page-header {
  margin-bottom: 2rem;
}

h1 {
  font-size: 1.6rem;
}

.subtitle {
  color: var(--color-text-soft);
  font-size: 0.9rem;
  margin-top: 0.25rem;
}

.wall {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 2.5rem 1.75rem;
}
</style>
