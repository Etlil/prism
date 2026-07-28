<script setup>
import { ref } from 'vue'
import { reactionTypes, toggleReaction } from '@/data/fakeEntries'

const props = defineProps({
  entry: { type: Object, required: true },
})

// Local to each card — every PolaroidPhoto instance gets its own `flipped`,
// so flipping one doesn't affect the others.
const flipped = ref(false)

// A fixed little tilt per card (not random-per-render) so the wall of photos
// looks like a scattered pile instead of a rigid grid, but stays stable.
const tilt = (props.entry.id % 2 === 0 ? 1 : -1) * (1.5 + ((props.entry.id * 7) % 3))
</script>

<template>
  <figure class="polaroid-card" :style="{ '--tilt': tilt + 'deg' }">
    <div class="flip-scene" role="button" tabindex="0" @click="flipped = !flipped" @keydown.enter="flipped = !flipped">
      <div class="flip-inner" :class="{ flipped }">
        <div class="face front">
          <div class="photo" :style="{ background: entry.photo }"></div>
          <p class="caption">{{ entry.note }}</p>
        </div>
        <div class="face back">
          <span class="mood-chip" :style="{ background: entry.mood?.colorHex }">
            {{ entry.mood?.label }}
          </span>
          <time class="date">{{ entry.isoDate }}</time>
          <p class="journal-text">{{ entry.journalText }}</p>
          <p class="flip-hint">tap to flip back</p>
        </div>
      </div>
    </div>

    <div class="reactions-bar">
      <button
        v-for="r in reactionTypes"
        :key="r.key"
        type="button"
        class="reaction"
        :class="{ active: entry.myReaction === r.key }"
        @click="toggleReaction(entry, r.key)"
      >
        <span>{{ r.emoji }}</span>
        <span v-if="entry.reactions[r.key]" class="count">{{ entry.reactions[r.key] }}</span>
      </button>
    </div>
  </figure>
</template>

<style scoped>
.polaroid-card {
  width: 100%;
}

.flip-scene {
  perspective: 1400px;
  cursor: pointer;
  transform: rotate(var(--tilt));
  transition: transform 0.2s;
}

.flip-scene:hover {
  transform: rotate(0deg) scale(1.02);
}

.flip-inner {
  position: relative;
  width: 100%;
  aspect-ratio: 4 / 5;
  transform-style: preserve-3d;
  transition: transform 0.6s ease;
}

.flip-inner.flipped {
  transform: rotateY(180deg);
}

.face {
  position: absolute;
  inset: 0;
  backface-visibility: hidden;
  border-radius: 4px;
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.18);
}

.front {
  background: #fdfdfd;
  padding: 10px 10px 30px;
  display: flex;
  flex-direction: column;
}

.photo {
  flex: 1;
  border-radius: 1px;
}

.caption {
  padding-top: 8px;
  text-align: center;
  font-size: 0.78rem;
  color: #2c2c2c;
}

.back {
  transform: rotateY(180deg);
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.mood-chip {
  align-self: flex-start;
  padding: 0.2rem 0.6rem;
  border-radius: 999px;
  font-size: 0.7rem;
  color: white;
}

.date {
  font-size: 0.7rem;
  color: var(--color-text-soft);
}

.journal-text {
  font-size: 0.85rem;
  overflow-y: auto;
  flex: 1;
}

.flip-hint {
  font-size: 0.68rem;
  color: var(--color-text-soft);
  text-align: center;
}

.reactions-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
  margin-top: 0.6rem;
}

.reaction {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.25rem 0.55rem;
  border-radius: 999px;
  border: 1px solid var(--color-border);
  background: var(--color-bg-card);
  color: var(--color-text-soft);
  font-size: 0.85rem;
  cursor: pointer;
}

.reaction:hover {
  border-color: var(--accent);
}

.reaction.active {
  border-color: var(--accent);
  color: var(--accent);
  font-weight: 600;
}

.count {
  font-size: 0.75rem;
}
</style>
