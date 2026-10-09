import type { HomeAssistant } from '#/types.ts'

type CardConfig = { type: string; size?: string; grid_options?: { columns?: number | 'full'; rows?: number | 'auto' } }

export type SplitConfig = {
  type: string
  // The card on the left, two thirds of the width.
  main: CardConfig
  // The cards on the right, laid out like a section.
  side: CardConfig[]
  // Shown on the right while every side card is hidden.
  empty_text?: string
  // Below this width the side panel goes under the main card, which then
  // takes the whole width.
  breakpoint?: number
}

type HuiCard = HTMLElement & { config: CardConfig; hass: HomeAssistant; preview: boolean; load: () => void }

const ROW_PX = 56
const GAP_PX = 10

// How many of the 12 columns and how many rows a side card takes, read from
// its config so the layout is known before the card has loaded.
function span(config: CardConfig) {
  const own = config.grid_options
  const type = config.type.replace(/^custom:/, '')
  let columns: number | 'full' = 12
  let rows: number | 'auto' = 'auto'
  if (type === 'fp-title') rows = 1
  else if (type === 'fp-camera') columns = 12
  else if (type.startsWith('fp-')) {
    columns = config.size === 'wide' ? 6 : 3
    rows = 2
  }
  columns = own?.columns ?? columns
  rows = own?.rows ?? rows
  return { columns: columns === 'full' ? 12 : Math.min(12, columns), rows }
}

const CSS = `
:host {
  display: block;
  --_gap: var(--fp-tile-gap, ${GAP_PX}px);
}
.split {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 24px;
  box-sizing: border-box;
  height: calc(100vh - var(--header-height, 56px) - env(safe-area-inset-top, 0px));
  height: calc(100dvh - var(--header-height, 56px) - env(safe-area-inset-top, 0px));
  padding: 0 24px 0 8px;
}
.main {
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}
.side {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  overflow-y: auto;
  scrollbar-width: none;
}
.side::-webkit-scrollbar {
  display: none;
}
/* Centered while it fits, scrolling from the top once it does not. */
.cards {
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  gap: var(--_gap);
  margin-block: auto;
  padding-block: 24px;
}
.cards > [hidden],
.cards > [data-off] {
  display: none;
}
.empty {
  grid-column: 1 / -1;
  padding: 24px 4px;
  color: var(--primary-text-color, #fff);
  font-family: var(--fp-font-tile, 'Inter', system-ui, sans-serif);
  font-size: 15px;
  text-align: center;
  opacity: 0.6;
}
.split[data-stacked] {
  grid-template-columns: 1fr;
  gap: 8px;
  height: auto;
  padding: 0;
}
.split[data-stacked] .side {
  overflow: visible;
}
.split[data-stacked] .cards {
  padding: 8px 12px 24px;
}
`

// A layout card: the floorplan card on the left two thirds of the view and
// the tiles on the right third, centered. Every child goes in Home
// Assistant's own hui-card, which hides it when the tile hides itself.
export class SplitCard extends HTMLElement {
  private _config: SplitConfig | null = null
  private _hass: HomeAssistant | null = null
  private _preview = false
  private main: HuiCard | null = null
  private side: HuiCard[] = []
  private root: HTMLDivElement
  private mainSlot: HTMLDivElement
  private cardsSlot: HTMLDivElement
  private empty: HTMLDivElement
  private observer: ResizeObserver

  constructor() {
    super()
    const shadow = this.attachShadow({ mode: 'open' })
    const style = document.createElement('style')
    style.textContent = CSS
    shadow.appendChild(style)
    this.root = document.createElement('div')
    this.root.className = 'split'
    this.mainSlot = document.createElement('div')
    this.mainSlot.className = 'main'
    const side = document.createElement('div')
    side.className = 'side'
    this.cardsSlot = document.createElement('div')
    this.cardsSlot.className = 'cards'
    this.empty = document.createElement('div')
    this.empty.className = 'empty'
    side.appendChild(this.cardsSlot)
    this.root.append(this.mainSlot, side)
    shadow.appendChild(this.root)
    // Caught on the way down, before a hui-card can stop it.
    this.cardsSlot.addEventListener('card-visibility-changed', () => queueMicrotask(() => this.updateEmpty()), true)
    this.observer = new ResizeObserver(() => this.updateStacked())
  }

  setConfig(config: SplitConfig) {
    if (!config.main?.type) throw new Error('main must be a card')
    if (!Array.isArray(config.side)) throw new Error('side must be a list of cards')
    this._config = config
    this.empty.textContent = config.empty_text ?? 'Nothing to control here'
    void this.build()
  }

  set hass(hass: HomeAssistant) {
    this._hass = hass
    for (const card of this.cards()) card.hass = hass
  }

  get hass() {
    return this._hass as HomeAssistant
  }

  set preview(preview: boolean) {
    this._preview = preview
    for (const card of this.cards()) card.preview = preview
  }

  get preview() {
    return this._preview
  }

  getCardSize() {
    return 12
  }

  getGridOptions() {
    return { columns: 'full', rows: 'auto' }
  }

  connectedCallback() {
    this.observer.observe(this)
    this.updateStacked()
  }

  disconnectedCallback() {
    this.observer.disconnect()
  }

  private cards() {
    return this.main ? [this.main, ...this.side] : this.side
  }

  private async build() {
    const config = this._config!
    await customElements.whenDefined('hui-card')
    if (config !== this._config) return
    this.main = this.create(config.main)
    this.mainSlot.replaceChildren(this.main)
    this.side = config.side.map(child => {
      const card = this.create(child)
      const { columns, rows } = span(child)
      card.style.gridColumn = `span ${columns}`
      if (rows !== 'auto') card.style.height = `calc(${rows * ROW_PX}px + ${rows - 1} * var(--_gap))`
      return card
    })
    this.cardsSlot.replaceChildren(...this.side, this.empty)
    this.updateEmpty()
  }

  private create(config: CardConfig) {
    const card = document.createElement('hui-card') as HuiCard
    if (this._hass) card.hass = this._hass
    card.preview = this._preview
    card.config = config
    card.load()
    return card
  }

  // A card is off when its hui-card is hidden, or the card inside it is.
  private updateEmpty() {
    let any = false
    for (const card of this.side) {
      const off = card.hidden === true || (card.firstElementChild as HTMLElement | null)?.hidden === true
      card.toggleAttribute('data-off', off)
      any ||= !off
    }
    this.empty.hidden = any
  }

  private updateStacked() {
    const breakpoint = this._config?.breakpoint ?? 900
    this.root.toggleAttribute('data-stacked', this.clientWidth > 0 && this.clientWidth < breakpoint)
  }
}
