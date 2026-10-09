import { entityArea } from '#/devices/catalog.ts'
import { ReactHost } from '#/host.tsx'
import { onRoomFilter, roomFilter } from '#/lib/roomFilter.ts'
import type { ActionConfig } from '#/tiles/actions.ts'
import tilesCss from '#/tiles/tiles.css?inline'
import type { HomeAssistant } from '#/types.ts'

// What every tile's config can hold, on top of its own options.
export type TileConfig = {
  type: string
  entity?: string
  name?: string
  icon?: string
  // The color the icon takes while the tile is on, any CSS color.
  color?: string
  // Replaces the line under the name.
  state_text?: string
  size?: 'small' | 'wide'
  // The area the tile belongs to for the room filter, when its entity's
  // own is not the right one.
  area?: string
  // How the tile follows the room in view. hide and show are what a tile
  // with no area does while a room is in view. room shows the tile only
  // while its own room is in view, home only while the whole home is.
  room_filter?: 'hide' | 'show' | 'room' | 'home'
  tap_action?: ActionConfig
  hold_action?: ActionConfig
  haptic?: boolean
  grid_options?: GridOptions
}

export type GridOptions = { columns?: number | 'full'; rows?: number | 'auto' }

const FONTS_ID = 'fp-tiles-fonts'
const FONTS_URL =
  'https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,400..700&family=Inter+Tight:wght@500..800&display=swap'

// Like the card's own fonts, these must be in the document to apply.
function injectFonts() {
  if (document.getElementById(FONTS_ID)) return
  const link = document.createElement('link')
  link.id = FONTS_ID
  link.rel = 'stylesheet'
  link.href = FONTS_URL
  document.head.appendChild(link)
}

// Tiles with no area are told of once, in one list, the first time a room
// filter would have needed it.
const missing = new Set<string>()
let missingTimer: ReturnType<typeof setTimeout> | undefined
let missingNew: string[] = []
function noteMissingArea(label: string) {
  if (missing.has(label)) return
  missing.add(label)
  missingNew.push(label)
  clearTimeout(missingTimer)
  missingTimer = setTimeout(() => {
    console.warn(
      `Floorplan tiles: no area found for ${missingNew.join(', ')}. Set area on these cards, or room_filter: show to keep them in every room.`,
    )
    missingNew = []
  }, 500)
}

// Accepts an area's id or its name.
export function resolveArea(hass: HomeAssistant, area: string | undefined, entityId: string | undefined) {
  if (area) {
    if (hass.areas[area]) return area
    const named = Object.values(hass.areas).find(a => a.name.toLowerCase() === area.toLowerCase())
    return named?.area_id ?? area
  }
  return entityId ? entityArea(hass, entityId) : null
}

export function stubEntity(hass: HomeAssistant | undefined, domains: string[]) {
  return Object.keys(hass?.states ?? {}).find(id => domains.includes(id.split('.')[0]))
}

// The base of every tile. It follows the floorplan card's room filter:
// a tile whose area is not the room in view hides itself and tells Home
// Assistant, which takes it out of the grid and folds a section left with
// nothing showing. It stays connected while hidden, so it hears when to
// come back.
export abstract class TileHost<C extends TileConfig> extends ReactHost<C> {
  // Read by Home Assistant's hui-card.
  connectedWhileHidden = true
  // Which entity domains this tile takes, 'any' for an entity of any
  // domain, or null for no entity at all.
  protected abstract readonly domains: string[] | 'any' | null
  private _preview = false
  private unsubscribe: (() => void) | null = null

  constructor() {
    super()
    injectFonts()
    const style = document.createElement('style')
    style.textContent = tilesCss
    this.shadowRoot!.appendChild(style)
  }

  setConfig(config: C) {
    if (this.domains) {
      if (!config.entity) throw new Error('entity is required')
      const domain = config.entity.split('.')[0]
      if (this.domains !== 'any' && !this.domains.includes(domain))
        throw new Error(`${config.entity} is not one of ${this.domains.map(d => `${d}.*`).join(', ')}`)
    }
    if (config.size && config.size !== 'small' && config.size !== 'wide') throw new Error('size must be small or wide')
    if (config.room_filter && !['hide', 'show', 'room', 'home'].includes(config.room_filter))
      throw new Error('room_filter must be hide, show, room or home')
    this._config = config
    this.applyFilter()
    this.render()
  }

  getCardSize() {
    return 2
  }

  getGridOptions(): GridOptions {
    return this._config?.size === 'wide' ? { columns: 12, rows: 2 } : { columns: 6, rows: 2 }
  }

  // Set by Home Assistant while the dashboard is edited, when every card
  // shows whatever the filter says.
  set preview(preview: boolean) {
    this._preview = preview
    this.applyFilter()
  }

  get preview() {
    return this._preview
  }

  set hass(hass: HomeAssistant) {
    this._hass = hass
    this.toggleAttribute('data-light', hass.themes?.darkMode === false)
    this.applyFilter()
    this.render()
  }

  get hass() {
    return this._hass as HomeAssistant
  }

  connectedCallback() {
    super.connectedCallback()
    this.unsubscribe ??= onRoomFilter(() => this.applyFilter())
    this.applyFilter()
  }

  disconnectedCallback() {
    this.unsubscribe?.()
    this.unsubscribe = null
    super.disconnectedCallback()
  }

  protected area() {
    if (!this._hass || !this._config) return null
    return resolveArea(this._hass, this._config.area, this._config.entity)
  }

  private visible() {
    if (!this._config || !this._hass || this._preview) return true
    const filter = roomFilter()
    const mode = this._config.room_filter
    if (mode === 'home') return !filter
    if (mode === 'show') return true
    if (!filter) return mode !== 'room'
    // A room with no area matches no tile.
    if (!filter.area_id) return mode !== 'room'
    const area = this.area()
    if (area) return area === filter.area_id
    if (mode === 'room') return false
    const { type, entity, name, title } = this._config as C & { title?: string }
    noteMissingArea(entity ?? `${type} ${name ?? title ?? ''}`.trim())
    return false
  }

  private applyFilter() {
    const visible = this.visible()
    if (this.hidden === !visible) return
    this.hidden = !visible
    this.dispatchEvent(
      new CustomEvent('card-visibility-changed', { detail: { value: visible }, bubbles: true, composed: true }),
    )
  }
}
