import { closest, inPanelView } from '#/lib/panelView.ts'
import { onRoomFilter, roomFilter } from '#/lib/roomFilter.ts'
import { autoGroups } from '#/tiles/auto.ts'
import type { CardConfig as PlanConfig, HomeAssistant } from '#/types.ts'

type CardConfig = {
  type: string
  size?: string
  grid_options?: { columns?: number | 'full'; rows?: number | 'auto' }
  [key: string]: unknown
}

const PLAN_TYPE = 'custom:floorplan-3d'
export const SIDE_PANEL = 'fp-side-panel'

// Below this width the panel goes under the floorplan, which then takes the
// whole width.
const STACK_PX = 900

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
  else if (type === 'fp-weather') rows = 4
  else if (type.startsWith('fp-')) {
    columns = config.size === 'wide' ? 12 : 6
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
  height: calc(100vh - var(--_reserved, calc(var(--header-height, 56px) + env(safe-area-inset-top, 0px))));
  height: calc(100dvh - var(--_reserved, calc(var(--header-height, 56px) + env(safe-area-inset-top, 0px))));
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
/* The floorplan fills its column, which sets its shape. */
.main[data-fill] {
  justify-content: stretch;
}
.main[data-fill] > hui-card,
.main[data-fill] > hui-card > * {
  display: block;
  height: 100%;
}
.side {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  /* Room on both sides for a tile that grows in focus, which the scrolling
     would otherwise clip, while the tiles stay where they were. */
  margin-inline: -12px;
  padding-inline: 12px;
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
.cards > hui-card[data-sized] > * {
  display: block;
  height: 100%;
}
.cards > [hidden],
.cards > [data-off],
.cards > [data-away] {
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
/* Anywhere but a panel view the floorplan keeps its own shape and the
   panel beside it scrolls within the same height. */
.split:not([data-panel]) {
  height: auto;
  padding: 0;
}
.split:not([data-panel]):not([data-stacked]) .side {
  contain: size;
}
.split[data-stacked] {
  grid-template-columns: 1fr;
  gap: 8px;
  height: auto;
  padding: 0;
}
.split[data-stacked] .main[data-fill] {
  aspect-ratio: 1 / 1;
}
.split[data-stacked] .side {
  margin-inline: 0;
  padding-inline: 0;
  overflow: visible;
}
.split[data-stacked] .cards {
  padding: 8px 12px 24px;
}
`

// The floorplan card with its side panel on: the floorplan, drawn again
// without one, on the left two thirds and the tiles on the right third,
// centered. Every child goes in Home Assistant's own hui-card, which hides
// it when the tile hides itself.
export class SidePanel extends HTMLElement {
  private _config: PlanConfig | null = null
  private _hass: HomeAssistant | null = null
  private _preview = false
  private main: HuiCard | null = null
  private side: HuiCard[] = []
  private root: HTMLDivElement
  private mainSlot: HTMLDivElement
  private cardsSlot: HTMLDivElement
  private empty: HTMLDivElement
  private observer: ResizeObserver
  private unsubscribe: (() => void) | null = null
  private panel = false

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
    this.empty.textContent = 'Nothing to control here'
    side.appendChild(this.cardsSlot)
    this.root.append(this.mainSlot, side)
    shadow.appendChild(this.root)
    // Caught on the way down, before a hui-card can stop it.
    this.cardsSlot.addEventListener('card-visibility-changed', () => queueMicrotask(() => this.updateEmpty()), true)
    this.observer = new ResizeObserver(() => {
      this.updateStacked()
      this.updateReserved()
    })
  }

  setConfig(config: PlanConfig) {
    if (config === this._config) return
    this._config = config
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

  connectedCallback() {
    const panel = inPanelView(this)
    this.root.toggleAttribute('data-panel', panel)
    if (panel !== this.panel) {
      this.panel = panel
      if (this._config) void this.build()
    }
    this.observer.observe(this)
    this.updateStacked()
    this.updateReserved()
    window.addEventListener('resize', this.onResize)
    this.unsubscribe ??= onRoomFilter(() => this.updateRoom())
    this.updateRoom()
  }

  disconnectedCallback() {
    this.observer.disconnect()
    window.removeEventListener('resize', this.onResize)
    this.unsubscribe?.()
    this.unsubscribe = null
  }

  private cards() {
    return this.main ? [this.main, ...this.side] : this.side
  }

  private async build() {
    const config = this._config!
    await customElements.whenDefined('hui-card')
    if (config !== this._config) return
    // In a panel view the floorplan fills its column, at the full height of
    // the screen. Anywhere else it keeps the shape it is given.
    this.mainSlot.toggleAttribute('data-fill', this.panel)
    const main: CardConfig = { ...config, type: PLAN_TYPE, side_panel: false }
    if (this.panel) main.aspect_ratio = 'fill'
    this.main = this.create(main)
    this.mainSlot.replaceChildren(this.main)
    // Each card knows its room, so only the room in view shows.
    const children = autoGroups(config).flatMap(group => group.cards.map(card => ({ card, room: group.room })))
    this.side = children.map(({ card: child, room }) => {
      const card = this.create(child)
      const { columns, rows } = span(child)
      card.style.gridColumn = `span ${columns}`
      card.toggleAttribute('data-sized', rows !== 'auto')
      if (rows !== 'auto') card.style.height = `calc(${rows * ROW_PX}px + ${rows - 1} * var(--_gap))`
      if (room) card.dataset.room = room
      return card
    })
    this.cardsSlot.replaceChildren(...this.side, this.empty)
    this.updateRoom()
  }

  private create(config: CardConfig) {
    const card = document.createElement('hui-card') as HuiCard
    if (this._hass) card.hass = this._hass
    card.preview = this._preview
    card.config = config
    card.load()
    return card
  }

  // A card is away while another room is in view.
  private updateRoom() {
    const room = roomFilter()?.room_id
    for (const card of this.side) {
      card.toggleAttribute('data-away', !!room && !!card.dataset.room && card.dataset.room !== room)
    }
    this.updateEmpty()
  }

  // A card is off when its hui-card is hidden, or the card inside it is.
  private updateEmpty() {
    let any = false
    for (const card of this.side) {
      const off = card.hidden === true || (card.firstElementChild as HTMLElement | null)?.hidden === true
      card.toggleAttribute('data-off', off)
      any ||= !off && !card.hasAttribute('data-away')
    }
    this.empty.hidden = any
  }

  private onResize = () => this.updateReserved()

  // In a panel view the floorplan and the panel fill the screen below the
  // header. The space they leave is measured rather than assumed, since the
  // header grows a row of tabs while the dashboard is edited, and the bar
  // with the edit button sits under the card then.
  private updateReserved() {
    if (!this.panel) return this.root.style.removeProperty('--_reserved')
    const options = closest(this, 'hui-card-options')
    const card = options?.shadowRoot?.querySelector('.card')
    const below = card ? Math.max(0, options!.getBoundingClientRect().bottom - card.getBoundingClientRect().bottom) : 0
    const above = this.getBoundingClientRect().top + window.scrollY
    this.root.style.setProperty('--_reserved', `${Math.round(above + below)}px`)
  }

  private updateStacked() {
    this.root.toggleAttribute('data-stacked', this.clientWidth > 0 && this.clientWidth < STACK_PX)
  }
}

if (!customElements.get(SIDE_PANEL)) customElements.define(SIDE_PANEL, SidePanel)
