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
// `strength` scales how much of the color it shows at its middle.
const blob = (size: string, at: string, color: string, strength = 1) =>
  `radial-gradient(ellipse ${size} at ${at}, ${FALLOFF.map(
    ([amount, stop]) => `color-mix(in oklab, ${color} ${Math.round(amount * strength)}%, transparent) ${stop}%`,
  ).join(', ')})`

// The blobs of the colored backgrounds, held back a little so the color
// stays a hint over the plain gradient under it.
const TINT = 0.75
const tint = (size: string, at: string, color: string) => blob(size, at, color, TINT)

// Each one is a plain gradient with a few large blobs over it, laid out
// differently for every one. The dark versions are muted, close to the
// grey of graphite with only a hint of their color, and the light ones the
// same hues washed out almost to white.
export const BACKGROUNDS: Background[] = [
  {
    id: 'graphite',
    name: 'Graphite',
    dark: [
      blob('140% 90%', '15% 0%', '#343a4b'),
      blob('110% 70%', '95% 35%', '#252b3a'),
      blob('120% 70%', '35% 85%', 'rgba(110, 128, 168, 0.12)'),
      blob('130% 80%', '100% 100%', '#161a26'),
      'linear-gradient(160deg, #2a2e3a 0%, #1b1e27 45%, #0d0e13 100%)',
    ].join(', '),
    light: [
      blob('140% 90%', '15% 0%', '#fdfdfe'),
      blob('110% 70%', '95% 35%', '#e6eaf2'),
      blob('120% 70%', '35% 85%', 'rgba(214, 223, 240, 0.85)'),
      blob('130% 80%', '100% 100%', '#d6dbe5'),
      'linear-gradient(160deg, #f8f9fb 0%, #eceef2 45%, #dfe2e8 100%)',
    ].join(', '),
  },
  {
    id: 'dusk',
    name: 'Dusk',
    dark: [
      tint('150% 90%', '10% 0%', '#3d2a47'),
      tint('120% 80%', '95% 5%', '#452c43'),
      tint('110% 70%', '70% 62%', 'rgba(150, 122, 92, 0.28)'),
      tint('150% 90%', '20% 100%', '#22394a'),
      tint('120% 80%', '100% 90%', '#1f2945'),
      'linear-gradient(180deg, #1d1823 0%, #181a24 50%, #11141c 100%)',
    ].join(', '),
    light: [
      tint('150% 90%', '10% 0%', '#ecdcf2'),
      tint('120% 80%', '95% 5%', '#f3dcec'),
      tint('110% 70%', '70% 62%', 'rgba(255, 232, 196, 0.85)'),
      tint('150% 90%', '20% 100%', '#d8e8f1'),
      tint('120% 80%', '100% 90%', '#dce2f3'),
      'linear-gradient(180deg, #f6f0f8 0%, #f2f2f8 50%, #ecf1f7 100%)',
    ].join(', '),
  },
  {
    id: 'ocean',
    name: 'Ocean',
    dark: [
      tint('130% 90%', '85% 0%', '#1c4a4c'),
      tint('110% 90%', '0% 40%', '#243850'),
      tint('110% 65%', '30% 75%', 'rgba(64, 168, 158, 0.24)'),
      tint('90% 60%', '62% 42%', 'rgba(52, 140, 138, 0.2)'),
      tint('140% 90%', '100% 100%', '#1a2440'),
      'linear-gradient(200deg, #152126 0%, #131a24 50%, #0e121b 100%)',
    ].join(', '),
    light: [
      tint('130% 90%', '85% 0%', '#c9f0ea'),
      tint('110% 90%', '0% 40%', '#d8e5f5'),
      tint('110% 65%', '30% 75%', 'rgba(190, 240, 230, 0.9)'),
      tint('90% 60%', '62% 42%', 'rgba(196, 238, 234, 0.75)'),
      tint('140% 90%', '100% 100%', '#dadff2'),
      'linear-gradient(200deg, #eef7f7 0%, #eef3f9 50%, #eaeef7 100%)',
    ].join(', '),
  },
  {
    id: 'forest',
    name: 'Forest',
    dark: [
      tint('150% 100%', '0% 0%', '#283f34'),
      tint('100% 65%', '80% 22%', 'rgba(160, 146, 100, 0.22)'),
      tint('120% 80%', '10% 95%', '#333b28'),
      tint('120% 85%', '100% 85%', '#1e3434'),
      'linear-gradient(150deg, #161e1a 0%, #121916 50%, #0d1210 100%)',
    ].join(', '),
    light: [
      tint('150% 100%', '0% 0%', '#d9eedf'),
      tint('100% 65%', '80% 22%', 'rgba(255, 240, 200, 0.9)'),
      tint('120% 80%', '10% 95%', '#e6ecd0'),
      tint('120% 85%', '100% 85%', '#d4e9e7'),
      'linear-gradient(150deg, #f0f7f2 0%, #eef4f0 50%, #eaf2f0 100%)',
    ].join(', '),
  },
  {
    id: 'ember',
    name: 'Ember',
    dark: [
      tint('130% 85%', '100% 0%', '#45282f'),
      tint('120% 95%', '0% 30%', '#2e2337'),
      tint('130% 65%', '45% 95%', 'rgba(168, 118, 82, 0.26)'),
      tint('100% 70%', '90% 65%', '#422c26'),
      'linear-gradient(170deg, #1e1619 0%, #1a151c 50%, #120e15 100%)',
    ].join(', '),
    light: [
      tint('130% 85%', '100% 0%', '#f5dce3'),
      tint('120% 95%', '0% 30%', '#e9dcf1'),
      tint('130% 65%', '45% 95%', 'rgba(255, 228, 196, 0.9)'),
      tint('100% 70%', '90% 65%', '#f7e0d4'),
      'linear-gradient(170deg, #faf1f3 0%, #f8f2f3 50%, #f2eef6 100%)',
    ].join(', '),
  },
]

// The one laid behind the view when the config names none.
export const DEFAULT_BACKGROUND = 'graphite'
// Leaves the dashboard's own background as its theme has it. The editor
// calls it Plain and shows it as the flat color of the default themes.
export const THEME_BACKGROUND = 'theme'
export const PLAIN_SWATCH = { light: '#fafafa', dark: '#111111' }

// The background chosen for a light or a dark dashboard, as CSS, or null to
// leave the theme's.
export function backgroundOf(config: BackgroundConfig | undefined, dark: boolean): string | null {
  const id = (dark ? config?.dark : config?.light) ?? DEFAULT_BACKGROUND
  const background = BACKGROUNDS.find(b => b.id === id)
  return background ? background[dark ? 'dark' : 'light'] : null
}

// Whether two configs differ in nothing but their background.
export const sameButBackground = (a: object, b: object) =>
  JSON.stringify({ ...a, background: null }) === JSON.stringify({ ...b, background: null })

// Where a card's background goes: the element and the style property it is
// set through, and whether that element can be fixed to the window.
type Spot = { element: HTMLElement; property: string; fixable: boolean }

// Lays a background behind the view a card is in, and takes it away again.
// Home Assistant draws a view's background in an element of its own, from
// a variable a view's own background setting also goes through. The card
// sets that variable on the element, and puts back what was there before
// once it lets go. In the card dialog it goes behind the preview instead,
// so the choice shows there as it is made.
// What an element had before any card laid a background on it, and the
// cards laying one now. The preview in the card dialog puts in a new card
// before the old one lets go, so the element goes back to what it had only
// once the last of them does.
const held = new WeakMap<HTMLElement, { value: string; fixed: boolean; by: Set<ViewBackground> }>()

export class ViewBackground {
  private spot: Spot | null = null

  private readonly card: HTMLElement

  constructor(card: HTMLElement) {
    this.card = card
  }

  private find(): Spot | null {
    const container = closest(this.card, 'hui-view-container')
    const view = container?.querySelector<HTMLElement>(':scope > hui-view-background')
    if (view) return { element: view, property: '--view-background', fixable: true }
    const dialog = closest(this.card, 'hui-dialog-edit-card')
    const preview = dialog?.shadowRoot?.querySelector<HTMLElement>('.element-preview')
    if (preview) return { element: preview, property: 'background', fixable: false }
    return null
  }

  apply(config: BackgroundConfig | undefined, hass: HomeAssistant | null) {
    if (!hass || !this.card.isConnected) return
    const spot = this.find()
    if (spot?.element !== this.spot?.element) this.release()
    const value = backgroundOf(config, hass.themes?.darkMode !== false)
    if (!spot || value === null) return this.release()
    const { element, property, fixable } = spot
    let before = held.get(element)
    if (!before) {
      before = {
        value: element.style.getPropertyValue(property),
        fixed: element.hasAttribute('fixed-background'),
        by: new Set(),
      }
      held.set(element, before)
    }
    before.by.add(this)
    this.spot = spot
    element.style.setProperty(property, value)
    // Fixed to the window, so the colors stay put while the page scrolls.
    if (fixable) element.toggleAttribute('fixed-background', true)
  }

  release() {
    const spot = this.spot
    this.spot = null
    if (!spot) return
    const { element, property, fixable } = spot
    const before = held.get(element)
    if (!before) return
    before.by.delete(this)
    if (before.by.size) return
    held.delete(element)
    if (before.value) element.style.setProperty(property, before.value)
    else element.style.removeProperty(property)
    if (fixable) element.toggleAttribute('fixed-background', before.fixed)
  }
}
