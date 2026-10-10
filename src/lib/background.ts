import { closest } from '#/lib/panelView.ts'
import type { BackgroundConfig, HomeAssistant } from '#/types.ts'

// The backgrounds the card can lay behind the view it is in, each in a dark
// version for a dark dashboard and a pale one of the same hues for a light
// one. Most are soft blobs of color over a plain gradient, as if seen out of
// focus.
export type Background = { id: string; name: string; dark: string; light: string }

// A soft blob of `color` centered at `at`, fading out to nothing.
const blob = (size: string, at: string, color: string) =>
  `radial-gradient(ellipse ${size} at ${at}, ${color} 0%, transparent 70%)`

export const BACKGROUNDS: Background[] = [
  {
    id: 'graphite',
    name: 'Graphite',
    dark: 'linear-gradient(160deg, #3a3f4f 0%, #1d2029 45%, #0d0e13 100%)',
    light: 'linear-gradient(160deg, #f7f8fa 0%, #eceef2 45%, #e1e4ea 100%)',
  },
  {
    id: 'dusk',
    name: 'Dusk',
    dark: [
      blob('90% 50%', '15% 0%', '#6a2c7d'),
      blob('70% 45%', '90% 8%', '#8c3a83'),
      blob('60% 32%', '68% 62%', 'rgba(222, 176, 112, 0.5)'),
      blob('100% 55%', '25% 100%', '#1f5d80'),
      blob('80% 50%', '95% 85%', '#1a2f6b'),
      'linear-gradient(180deg, #2b1839 0%, #1f2142 50%, #0d1830 100%)',
    ].join(', '),
    light: [
      blob('90% 50%', '15% 0%', '#ead3f2'),
      blob('70% 45%', '90% 8%', '#f4d5ec'),
      blob('60% 32%', '68% 62%', 'rgba(255, 228, 184, 0.8)'),
      blob('100% 55%', '25% 100%', '#cfe5f1'),
      blob('80% 50%', '95% 85%', '#d6def4'),
      'linear-gradient(180deg, #f7eff9 0%, #f2f1f9 50%, #eaf0f8 100%)',
    ].join(', '),
  },
  {
    id: 'ocean',
    name: 'Ocean',
    dark: [
      blob('80% 50%', '85% 0%', '#1c6f7a'),
      blob('60% 55%', '0% 40%', '#245c96'),
      blob('55% 30%', '30% 72%', 'rgba(120, 214, 200, 0.38)'),
      blob('90% 50%', '100% 100%', '#122e6b'),
      'linear-gradient(200deg, #0f2b36 0%, #0c1f38 50%, #081329 100%)',
    ].join(', '),
    light: [
      blob('80% 50%', '85% 0%', '#cdeeee'),
      blob('60% 55%', '0% 40%', '#d3e3f6'),
      blob('55% 30%', '30% 72%', 'rgba(204, 244, 232, 0.85)'),
      blob('90% 50%', '100% 100%', '#d5dcf3'),
      'linear-gradient(200deg, #eef8f8 0%, #edf3fa 50%, #e9eef8 100%)',
    ].join(', '),
  },
  {
    id: 'forest',
    name: 'Forest',
    dark: [
      blob('100% 60%', '0% 0%', '#2a6648'),
      blob('50% 35%', '78% 24%', 'rgba(232, 204, 122, 0.4)'),
      blob('70% 50%', '10% 92%', '#56682c'),
      blob('70% 55%', '95% 85%', '#164a4a'),
      'linear-gradient(150deg, #172c22 0%, #10211c 50%, #0a1513 100%)',
    ].join(', '),
    light: [
      blob('100% 60%', '0% 0%', '#d5eedd'),
      blob('50% 35%', '78% 24%', 'rgba(255, 238, 190, 0.85)'),
      blob('70% 50%', '10% 92%', '#e5ecc9'),
      blob('70% 55%', '95% 85%', '#cfe8e6'),
      'linear-gradient(150deg, #f0f8f2 0%, #eef5f0 50%, #e9f3f1 100%)',
    ].join(', '),
  },
  {
    id: 'ember',
    name: 'Ember',
    dark: [
      blob('70% 45%', '100% 0%', '#7d2a45'),
      blob('60% 50%', '0% 30%', '#3d1c4f'),
      blob('80% 35%', '45% 92%', 'rgba(255, 168, 92, 0.45)'),
      blob('50% 40%', '90% 65%', '#9a4630'),
      'linear-gradient(170deg, #2c1320 0%, #221425 50%, #150c1c 100%)',
    ].join(', '),
    light: [
      blob('70% 45%', '100% 0%', '#f6d6e0'),
      blob('60% 50%', '0% 30%', '#e6d7f0'),
      blob('80% 35%', '45% 92%', 'rgba(255, 224, 188, 0.9)'),
      blob('50% 40%', '90% 65%', '#f8dccf'),
      'linear-gradient(170deg, #fbf0f3 0%, #f9f1f3 50%, #f2edf7 100%)',
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
