<script setup>
import { computed, ref } from 'vue'
import { useEntries, dayLoggedAt } from '@/composables/useEntries'
import { useStreak } from '@/composables/useStreak'
import { SCORE_LABELS } from '@/composables/useMoods'
import { todayIso } from '@/lib/calendar'
import { toIsoDate, fromIsoDate } from '@/lib/dates'

// Hand-drawn SVG rather than a chart library, same reasoning as the
// conic-gradient pixels: one series over time needs a path and some circles,
// and a library would be more bytes than the whole app.

const { scoresFor, moodsFor } = useEntries()
const { encouragement } = useStreak()

const DAYS = 30

// Internal coordinate space. The SVG scales to its container, so these are
// just proportions — nothing here is pixels on screen.
const PLOT = { left: 52, right: 690, top: 18, bottom: 214 }
const VIEW_W = 700
const VIEW_H = 250

const hovered = ref(null)

const points = computed(() => {
  dayLoggedAt.value

  const end = fromIsoDate(todayIso())
  const out = []

  for (let i = DAYS - 1; i >= 0; i--) {
    const date = new Date(end)
    date.setDate(end.getDate() - i)
    const iso = toIsoDate(date)
    const scores = scoresFor(iso)

    out.push({
      iso,
      day: date.getDate(),
      // null means no entry — the line breaks rather than pretending a value.
      score: scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null,
      moods: moodsFor(iso),
    })
  }
  return out
})

const hasData = computed(() => points.value.some((p) => p.score !== null))

function xFor(index) {
  const span = PLOT.right - PLOT.left
  return PLOT.left + (index / (DAYS - 1)) * span
}

// Score 1 sits at the bottom, 5 at the top.
function yFor(score) {
  const span = PLOT.bottom - PLOT.top
  return PLOT.bottom - ((score - 1) / 4) * span
}

// Broken into runs of consecutive logged days. Drawing one line straight
// through a gap would invent days that were never recorded.
const segments = computed(() => {
  const runs = []
  let run = []

  points.value.forEach((p, i) => {
    if (p.score === null) {
      if (run.length) runs.push(run)
      run = []
      return
    }
    run.push({ ...p, index: i, x: xFor(i), y: yFor(p.score) })
  })
  if (run.length) runs.push(run)
  return runs
})

const dots = computed(() => segments.value.flat())

const gridLines = [5, 4, 3, 2, 1]

// Every fifth day, so the axis doesn't turn into a smear of numbers.
const xTicks = computed(() => points.value.filter((_, i) => i % 5 === 0 || i === DAYS - 1))

function pathFor(run) {
  return run.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
}

const hoveredPoint = computed(() =>
  hovered.value === null ? null : dots.value.find((d) => d.index === hovered.value),
)

// Keeps the tooltip inside the plot instead of running off the right edge.
function tooltipX(x) {
  return Math.min(Math.max(x, PLOT.left + 60), PLOT.right - 60)
}
</script>

<template>
  <section class="chart-card">
    <header class="head">
      <h2>Mood Chart</h2>
      <p class="sub">Last {{ DAYS }} days · tap a point to see the day</p>
    </header>

    <div v-if="hasData" class="plot">
      <svg :viewBox="`0 0 ${VIEW_W} ${VIEW_H}`" role="img" aria-label="Mood over the last 30 days">
        <!-- Two tinted bands and a neutral middle: good above, rough below.
             Deliberately faint so the line stays the thing you read. -->
        <rect
          :x="PLOT.left"
          :y="PLOT.top"
          :width="PLOT.right - PLOT.left"
          :height="(PLOT.bottom - PLOT.top) / 2"
          class="band-good"
        />
        <rect
          :x="PLOT.left"
          :y="PLOT.top + (PLOT.bottom - PLOT.top) / 2"
          :width="PLOT.right - PLOT.left"
          :height="(PLOT.bottom - PLOT.top) / 2"
          class="band-rough"
        />

        <!-- Gridlines and the y-axis labels. -->
        <g v-for="score in gridLines" :key="score">
          <line
            :x1="PLOT.left"
            :x2="PLOT.right"
            :y1="yFor(score)"
            :y2="yFor(score)"
            class="grid"
          />
          <text :x="PLOT.left - 10" :y="yFor(score) + 4" class="y-label">
            {{ SCORE_LABELS[score] }}
          </text>
        </g>

        <!-- One path per unbroken run of logged days. -->
        <path v-for="(run, i) in segments" :key="i" :d="pathFor(run)" class="line" />

        <g v-for="dot in dots" :key="dot.iso">
          <circle
            :cx="dot.x"
            :cy="dot.y"
            r="5"
            class="dot"
            :style="{ fill: dot.moods[0]?.color_hex || 'var(--accent)' }"
          />
          <!-- A generous invisible target: a 5px dot is not tappable on a
               phone. -->
          <circle
            :cx="dot.x"
            :cy="dot.y"
            r="16"
            class="hit"
            @mouseenter="hovered = dot.index"
            @mouseleave="hovered = null"
            @click="hovered = hovered === dot.index ? null : dot.index"
          />
        </g>

        <text
          v-for="tick in xTicks"
          :key="tick.iso"
          :x="xFor(points.indexOf(tick))"
          :y="VIEW_H - 8"
          class="x-label"
        >
          {{ tick.day }}
        </text>

        <!-- Tooltip -->
        <g v-if="hoveredPoint" class="tip" :transform="`translate(${tooltipX(hoveredPoint.x)}, 0)`">
          <line :x1="0" :x2="0" :y1="PLOT.top" :y2="PLOT.bottom" class="crosshair" />
          <rect x="-58" y="4" width="116" height="34" rx="6" class="tip-box" />
          <text x="0" y="18" class="tip-title">
            {{ hoveredPoint.moods.map((m) => m.emoji).join(' ') }}
          </text>
          <text x="0" y="31" class="tip-body">
            {{ hoveredPoint.moods.map((m) => m.label).join(', ') }}
          </text>
        </g>
      </svg>
    </div>

    <p v-else class="empty">
      Log a few days and your mood line will start showing up here.
    </p>

    <p class="encouragement">{{ encouragement }}</p>
  </section>
</template>

<style scoped>
.chart-card {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 1rem 1.1rem 1.1rem;
  margin-top: 1.5rem;
}

.head {
  margin-bottom: 0.7rem;
}

.head h2 {
  font-size: 1rem;
  font-weight: 700;
}

.sub {
  font-size: 0.75rem;
  color: var(--color-text-soft);
  margin-top: 0.15rem;
}

.plot svg {
  width: 100%;
  height: auto;
  display: block;
  overflow: visible;
}

.band-good {
  fill: #3ec46d;
  opacity: 0.07;
}

.band-rough {
  fill: #e2574c;
  opacity: 0.07;
}

.grid {
  stroke: var(--color-border);
  stroke-width: 1;
}

.y-label {
  fill: var(--color-text-soft);
  font-size: 11px;
  text-anchor: end;
  font-family: inherit;
}

.x-label {
  fill: var(--color-text-soft);
  font-size: 11px;
  text-anchor: middle;
  font-family: inherit;
  font-variant-numeric: tabular-nums;
}

.line {
  fill: none;
  stroke: var(--accent);
  stroke-width: 2.5;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.dot {
  /* A ring in the card colour keeps overlapping dots readable. */
  stroke: var(--color-bg-card);
  stroke-width: 2;
}

.hit {
  fill: transparent;
  cursor: pointer;
}

.crosshair {
  stroke: var(--color-text-soft);
  stroke-width: 1;
  stroke-dasharray: 3 3;
  opacity: 0.5;
}

.tip-box {
  fill: var(--color-text);
  opacity: 0.92;
}

.tip-title,
.tip-body {
  text-anchor: middle;
  font-family: inherit;
  fill: var(--color-bg-card);
}

.tip-title {
  font-size: 12px;
}

.tip-body {
  font-size: 10px;
  opacity: 0.85;
}

.empty {
  padding: 1.5rem 0;
  text-align: center;
  font-size: 0.85rem;
  color: var(--color-text-soft);
}

.encouragement {
  margin-top: 0.9rem;
  padding-top: 0.8rem;
  border-top: 1px solid var(--color-border);
  text-align: center;
  font-size: 0.85rem;
  line-height: 1.5;
  color: var(--color-text);
}
</style>
