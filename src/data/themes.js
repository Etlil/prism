// Full visual themes, not just an accent colour.
//
// Each theme supplies the whole token set the app is built on — background,
// card, border, ink, accent — plus a corner radius and a font that suit it. A
// theme is picked as one thing, so the parts can't clash the way a free accent
// picker allowed.
//
// Every theme defines BOTH a light and a dark variant, so the light/dark toggle
// keeps working whichever theme is on. For the dark-leaning themes the light
// variant is a daytime version of the same idea rather than a different look.
//
// The keys here match the CSS custom properties in assets/base.css.

export const themes = [
  {
    id: 'notebook',
    name: 'Notebook',
    blurb: 'Cream paper and ink',
    font: "'Times New Roman', Times, serif",
    radius: { sm: '4px', md: '6px', lg: '8px' },
    light: {
      bg: '#f6f1e4',
      bgSoft: '#efe8d6',
      bgCard: '#fffdf6',
      border: 'rgba(60, 48, 30, 0.16)',
      text: '#2f2a20',
      textSoft: 'rgba(47, 42, 32, 0.76)',
      accent: '#2f6fb5',
    },
    dark: {
      bg: '#1c1a15',
      bgSoft: '#24211a',
      bgCard: '#2b2720',
      border: 'rgba(233, 224, 200, 0.14)',
      text: '#efe7d4',
      textSoft: 'rgba(239, 231, 212, 0.62)',
      accent: '#7fb0e8',
    },
  },
  {
    id: 'space',
    name: 'Space',
    blurb: 'Deep sky and starlight',
    font: "'Internet Friends', sans-serif",
    radius: { sm: '10px', md: '16px', lg: '24px' },
    light: {
      bg: '#eef1fb',
      bgSoft: '#e2e7f7',
      bgCard: '#ffffff',
      border: 'rgba(40, 50, 100, 0.14)',
      text: '#1b2144',
      textSoft: 'rgba(27, 33, 68, 0.76)',
      accent: '#5b57d4',
    },
    dark: {
      bg: '#070a18',
      bgSoft: '#0e1226',
      bgCard: '#161b33',
      border: 'rgba(160, 175, 255, 0.16)',
      text: '#e6eaff',
      textSoft: 'rgba(230, 234, 255, 0.64)',
      accent: '#9d8bff',
    },
  },
  {
    id: 'girly',
    name: 'Girly',
    blurb: 'Blush, rose and soft edges',
    font: "'Baby Doll', cursive",
    radius: { sm: '14px', md: '22px', lg: '32px' },
    light: {
      bg: '#fdf1f5',
      bgSoft: '#fbe4ec',
      bgCard: '#ffffff',
      border: 'rgba(150, 60, 100, 0.15)',
      text: '#40222f',
      textSoft: 'rgba(64, 34, 47, 0.76)',
      accent: '#d64d86',
    },
    dark: {
      bg: '#1e1218',
      bgSoft: '#291821',
      bgCard: '#33202a',
      border: 'rgba(255, 190, 215, 0.16)',
      text: '#fbe6ee',
      textSoft: 'rgba(251, 230, 238, 0.64)',
      accent: '#ff8ab8',
    },
  },
  {
    id: 'gothic',
    name: 'Gothic',
    blurb: 'Charcoal and old crimson',
    font: "'Magic Crush', cursive",
    radius: { sm: '2px', md: '3px', lg: '4px' },
    light: {
      bg: '#eceaea',
      bgSoft: '#dedbdb',
      bgCard: '#f8f7f7',
      border: 'rgba(30, 25, 25, 0.22)',
      text: '#1d1a1a',
      textSoft: 'rgba(29, 26, 26, 0.76)',
      accent: '#9b1c2e',
    },
    dark: {
      bg: '#0c0b0c',
      bgSoft: '#141213',
      bgCard: '#1b1819',
      border: 'rgba(220, 200, 205, 0.16)',
      text: '#ece7e8',
      textSoft: 'rgba(236, 231, 232, 0.6)',
      // Nudged 1% darker so white label text on it clears 4.5:1.
      accent: '#d0445b',
    },
  },
  {
    id: 'forest',
    name: 'Forest',
    blurb: 'Moss, sage and bark',
    font: "'Elegant Bloom', cursive",
    radius: { sm: '8px', md: '14px', lg: '20px' },
    light: {
      bg: '#f0f4ec',
      bgSoft: '#e3ebdc',
      bgCard: '#fbfdf9',
      border: 'rgba(40, 70, 40, 0.16)',
      text: '#22301f',
      textSoft: 'rgba(34, 48, 31, 0.76)',
      accent: '#3f7d43',
    },
    dark: {
      bg: '#0f150f',
      bgSoft: '#161f16',
      bgCard: '#1d281d',
      border: 'rgba(190, 220, 190, 0.15)',
      text: '#e4eede',
      textSoft: 'rgba(228, 238, 222, 0.62)',
      accent: '#7cc47f',
    },
  },
  {
    id: 'sunset',
    name: 'Sunset',
    blurb: 'Peach, amber and dusk',
    font: "'Omori', sans-serif",
    radius: { sm: '10px', md: '18px', lg: '26px' },
    light: {
      bg: '#fff3e9',
      bgSoft: '#ffe6d5',
      bgCard: '#fffaf6',
      border: 'rgba(140, 70, 30, 0.16)',
      text: '#3b2418',
      textSoft: 'rgba(59, 36, 24, 0.76)',
      // Nudged 2% darker so white label text on it clears 4.5:1.
      accent: '#c5521e',
    },
    dark: {
      bg: '#170f0b',
      bgSoft: '#211611',
      bgCard: '#2c1d16',
      border: 'rgba(255, 205, 175, 0.16)',
      text: '#f8e5d9',
      textSoft: 'rgba(248, 229, 217, 0.64)',
      accent: '#ff9a5c',
    },
  },
]

export const defaultThemeId = 'notebook'

export function themeById(id) {
  return themes.find((t) => t.id === id) ?? themes.find((t) => t.id === defaultThemeId)
}

// --- Ink on top of the accent ----------------------------------------------
//
// The app used to hardcode `color: white` on every accent-filled button. That
// only works while the accent is dark. The dark themes use light pastel
// accents, where white text lands around 2:1 — effectively unreadable.
//
// So the ink is computed instead of assumed: whichever of near-black or white
// contrasts better against that accent. Computed rather than stored per theme
// so it stays correct if an accent is ever tweaked.

const DARK_INK = '#16130f'

function relativeLuminance(hex) {
  const [r, g, b] = hex
    .replace('#', '')
    .match(/../g)
    .map((pair) => {
      const c = parseInt(pair, 16) / 255
      return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
    })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrastRatio(a, b) {
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

export function inkOn(accentHex) {
  return contrastRatio('#ffffff', accentHex) >= contrastRatio(DARK_INK, accentHex)
    ? '#ffffff'
    : DARK_INK
}
