import { closest } from '#/lib/panelView.ts'
import type { BackgroundConfig, HomeAssistant } from '#/types.ts'

// The backgrounds the card can lay behind the view it is in, each in a dark
// version for a dark dashboard and a pale one of the same hues for a light
// one. Most are large soft blobs of color over a plain gradient, as if seen
// out of focus.
export type Background = { id: string; name: string; dark: string; light: string }

// A soft blob of `color` centered at `at`, as wide and tall as `size`. It
// thins out slowly all the way to its edge, the way light falls off, so it
// melts into the blobs around it with no rim to show where it ends.
const FALLOFF = [
  [100, 0],
  [82, 14],
  [58, 30],
  [34, 48],
  [16, 66],
  [5, 84],
  [0, 100],
]
const blob = (size: string, at: string, color: string) =>
  `radial-gradient(ellipse ${size} at ${at}, ${FALLOFF.map(
    ([amount, stop]) => `color-mix(in oklab, ${color} ${amount}%, transparent) ${stop}%`,
  ).join(', ')})`

// Each one is a plain gradient with a few large blobs over it, laid out
// differently for every one. The dark versions are muted, close to the
// grey of graphite with only a hint of their color, and the light ones the
// same hues washed out almost to white.
export const BACKGROUNDS: Background[] = [
  {
    id: 'graphite',
    name: 'Graphite',
    dark: 'linear-gradient(160deg, #3a3f4f 0%, #1d2029 45%, #0d0e13 100%)',
    light: 'linear-gradient(160deg, #fcfcfd 0%, #eaecf0 45%, #d9dde4 100%)',
  },
  {
    id: 'dusk',
    name: 'Dusk',
    dark: [
      blob('150% 90%', '10% 0%', '#3d2a47'),
      blob('120% 80%', '95% 5%', '#452c43'),
      blob('110% 70%', '70% 62%', 'rgba(150, 122, 92, 0.28)'),
      blob('150% 90%', '20% 100%', '#22394a'),
      blob('120% 80%', '100% 90%', '#1f2945'),
      'linear-gradient(180deg, #1d1823 0%, #181a24 50%, #11141c 100%)',
    ].join(', '),
    light: [
      blob('150% 90%', '10% 0%', '#ecdcf2'),
      blob('120% 80%', '95% 5%', '#f3dcec'),
      blob('110% 70%', '70% 62%', 'rgba(255, 232, 196, 0.85)'),
      blob('150% 90%', '20% 100%', '#d8e8f1'),
      blob('120% 80%', '100% 90%', '#dce2f3'),
      'linear-gradient(180deg, #f6f0f8 0%, #f2f2f8 50%, #ecf1f7 100%)',
    ].join(', '),
  },
  {
    id: 'ocean',
    name: 'Ocean',
    dark: [
      blob('130% 90%', '85% 0%', '#1c4a4c'),
      blob('110% 90%', '0% 40%', '#243850'),
      blob('110% 65%', '30% 75%', 'rgba(64, 168, 158, 0.24)'),
      blob('90% 60%', '62% 42%', 'rgba(52, 140, 138, 0.2)'),
      blob('140% 90%', '100% 100%', '#1a2440'),
      'linear-gradient(200deg, #152126 0%, #131a24 50%, #0e121b 100%)',
    ].join(', '),
    light: [
      blob('130% 90%', '85% 0%', '#c9f0ea'),
      blob('110% 90%', '0% 40%', '#d8e5f5'),
      blob('110% 65%', '30% 75%', 'rgba(190, 240, 230, 0.9)'),
      blob('90% 60%', '62% 42%', 'rgba(196, 238, 234, 0.75)'),
      blob('140% 90%', '100% 100%', '#dadff2'),
      'linear-gradient(200deg, #eef7f7 0%, #eef3f9 50%, #eaeef7 100%)',
    ].join(', '),
  },
  {
    id: 'forest',
    name: 'Forest',
    dark: [
      blob('150% 100%', '0% 0%', '#283f34'),
      blob('100% 65%', '80% 22%', 'rgba(160, 146, 100, 0.22)'),
      blob('120% 80%', '10% 95%', '#333b28'),
      blob('120% 85%', '100% 85%', '#1e3434'),
      'linear-gradient(150deg, #161e1a 0%, #121916 50%, #0d1210 100%)',
    ].join(', '),
    light: [
      blob('150% 100%', '0% 0%', '#d9eedf'),
      blob('100% 65%', '80% 22%', 'rgba(255, 240, 200, 0.9)'),
      blob('120% 80%', '10% 95%', '#e6ecd0'),
      blob('120% 85%', '100% 85%', '#d4e9e7'),
      'linear-gradient(150deg, #f0f7f2 0%, #eef4f0 50%, #eaf2f0 100%)',
    ].join(', '),
  },
  {
    id: 'ember',
    name: 'Ember',
    dark: [
      blob('130% 85%', '100% 0%', '#45282f'),
      blob('120% 95%', '0% 30%', '#2e2337'),
      blob('130% 65%', '45% 95%', 'rgba(168, 118, 82, 0.26)'),
      blob('100% 70%', '90% 65%', '#422c26'),
      'linear-gradient(170deg, #1e1619 0%, #1a151c 50%, #120e15 100%)',
    ].join(', '),
    light: [
      blob('130% 85%', '100% 0%', '#f5dce3'),
      blob('120% 95%', '0% 30%', '#e9dcf1'),
      blob('130% 65%', '45% 95%', 'rgba(255, 228, 196, 0.9)'),
      blob('100% 70%', '90% 65%', '#f7e0d4'),
      'linear-gradient(170deg, #faf1f3 0%, #f8f2f3 50%, #f2eef6 100%)',
    ].join(', '),
  },
]

// The one laid behind the view when the config names none.
export const DEFAULT_BACKGROUND = 'graphite'
// Leaves the dashboard's own background as its theme has it.
export const THEME_BACKGROUND = 'theme'

// The background chosen for a light or a dark dashboard, as CSS, or null to
// leave the theme's.
export function backgroundOf(config: BackgroundConfig | undefined, dark: boolean): string | null {
  const id = (dark ? config?.dark : config?.light) ?? DEFAULT_BACKGROUND
  const background = BACKGROUNDS.find(b => b.id === id)
  return background ? background[dark ? 'dark' : 'light'] : null
}

// Lays a background behind the view a card is in, and takes it away again.
// Home Assistant draws a view's background in an element of its own, from
// a variable a view's own background setting also goes through. The card
// sets that variable on the element, and puts back what was there before
// once it lets go. A card outside a view, such as the preview in the card
// dialog, has none to set.
export class ViewBackground {
  private target: HTMLElement | null = null
  private before: { value: string; fixed: boolean } | null = null

  private readonly card: HTMLElement

  constructor(card: HTMLElement) {
    this.card = card
  }

  apply(config: BackgroundConfig | undefined, hass: HomeAssistant | null) {
    if (!hass || !this.card.isConnected) return
    const container = closest(this.card, 'hui-view-container')
    const target = container?.querySelector<HTMLElement>(':scope > hui-view-background') ?? null
    if (target !== this.target) this.release()
    const value = backgroundOf(config, hass.themes?.darkMode !== false)
    if (!target || value === null) return this.release()
    if (!this.before) {
      this.before = {
        value: target.style.getPropertyValue('--view-background'),
        fixed: target.hasAttribute('fixed-background'),
      }
    }
    this.target = target
    target.style.setProperty('--view-background', value)
    // Fixed to the window, so the colors stay put while the page scrolls.
    target.toggleAttribute('fixed-background', true)
  }

  release() {
    const target = this.target
    const before = this.before
    this.target = null
    this.before = null
    if (!target || !before) return
    if (before.value) target.style.setProperty('--view-background', before.value)
    else target.style.removeProperty('--view-background')
    target.toggleAttribute('fixed-background', before.fixed)
  }
}
