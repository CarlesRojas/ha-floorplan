import Card from '#/Card.tsx'
import Editor from '#/editor/Editor.tsx'
import { persistCard } from '#/editor/persist.ts'
import { ReactHost } from '#/host.tsx'
import type { CardConfig } from '#/types.ts'

const CARD_TYPE = 'floorplan-3d'
const EDITOR_TYPE = `${CARD_TYPE}-editor`

// Kinds that were renamed or folded into another one. A plan written
// before the change still names the old one, and without this the piece
// would quietly vanish from the plan: the catalog would not know it.
const RENAMED: Record<string, { kind: string; variant?: string; params?: Record<string, number> }> = {
  // The Globo Cesta was its own kind for a moment, then became a style of
  // the pendant, since swapped for the smaller Globo Cestita.
  light_globe: { kind: 'light_pendant', variant: 'globo_cestita' },
  // The office table became a style of the desk.
  office_table: { kind: 'desk', variant: 'office_table' },
  // The armchair became a narrow sofa, at the armchair's old size unless it
  // had one of its own.
  armchair: { kind: 'sofa', variant: 'dresde', params: { width: 0.78, depth: 0.8 } },
  // The island became a style of the counter.
  kitchen_island: { kind: 'kitchen_counter', variant: 'island' },
  // The crib was dropped, and a saved one becomes the narrowest bed.
  crib: { kind: 'bed_double', params: { width: 0.9, length: 1.8 } },
  // The nightstand became a style of the side table.
  nightstand: { kind: 'side_table', variant: 'nightstand' },
  // The standing fan and the tower fan became styles of the floor fan.
  fan_standing: { kind: 'fan_floor', variant: 'pedestal' },
  fan_tower: { kind: 'fan_floor', variant: 'tower' },
  // The roller shutter became a style of the blind, and the sliding glass
  // door a style of the sliding door.
  roller_shutter: { kind: 'blind', variant: 'shutter' },
  sliding_glass: { kind: 'sliding_door', variant: 'glass' },
}

// Kinds that were dropped with nothing to take their place. A saved one is
// left out.
const DROPPED = new Set(['picture', 'basket'])

// Parameters that were split in two, per kind. The side table was square,
// with one size for both sides, before it had a width and a depth.
const SPLIT: Record<string, Record<string, string[]>> = {
  side_table: { size: ['width', 'depth'] },
}

// Styles that were renamed, per kind. The pendant's first two were loose
// takes on the Nagoya and the Globo Cesta, then became those lamps, and the
// Globo Cesta gave way to the smaller Globo Cestita. The
// dining chair's first style was a Pilma chair, then a molded shell, then
// the Jin, and each of those is now the slab chair that took its place.
// The toilet's back to wall style gave way to a square close coupled one.
// The sofa's chaise was a style of its own before every style could have
// one, and a saved one keeps its chaise and its old width. The curtain's
// linen pleat was dropped for the sheer wave, and the station clock for a
// digital one. Both rubber plants gave way to the mango plant. A style can
// bring parameters that the item's own saved ones override.
type Restyle = string | { variant: string; params: Record<string, number> }
const RESTYLED: Record<string, Record<string, Restyle>> = {
  light_pendant: { slatted: 'nagoya', globe: 'globo_cestita', globo_cesta: 'globo_cestita' },
  dining_chair: { aix: 'oia', molded: 'oia', jin: 'oia' },
  toilet: { back_to_wall: 'square' },
  awning: { drop_arm: 'hood' },
  plant_wall: { staghorn: 'pothos', moss: 'pearls' },
  sofa: { dresde_chaise: { variant: 'dresde', params: { chaise: 1, width: 2.98 } } },
  curtain: { pleat: 'wave' },
  wall_clock: { station: 'digital' },
  sideboard: { usm: 'credenza' },
  bed_double: { platform: { variant: 'headboard', params: { headboard: 0 } } },
  plant_large: { rubber: 'mango', rubber_full: 'mango' },
}

function migrate(config: CardConfig): CardConfig {
  const rooms = Array.isArray(config.rooms) ? config.rooms : []
  const known = new Set(rooms.map(r => r.id))
  const next = { ...config }
  if (Array.isArray(config.decorations)) {
    next.decorations = config.decorations
      // A piece whose room is gone has nowhere to be drawn. It is left out
      // rather than taken as a reason to refuse the whole card.
      .filter(d => known.has(d.room) && !DROPPED.has(d.kind))
      .map(d => {
        const now = RENAMED[d.kind]
        if (!now) return d
        const params = now.params ? { ...now.params, ...d.params } : d.params
        return { ...d, kind: now.kind, variant: d.variant ?? now.variant, params }
      })
      .map(d => {
        const style = d.variant ? RESTYLED[d.kind]?.[d.variant] : undefined
        if (!style) return d
        if (typeof style === 'string') return { ...d, variant: style }
        return { ...d, variant: style.variant, params: { ...style.params, ...d.params } }
      })
      .map(d => {
        const split = SPLIT[d.kind]
        if (!split || !d.params) return d
        const params = { ...d.params }
        for (const [old, now] of Object.entries(split)) {
          if (params[old] === undefined) continue
          for (const id of now) params[id] ??= params[old]
          delete params[old]
        }
        return { ...d, params }
      })
  }
  if (Array.isArray(config.devices)) next.devices = config.devices.filter(d => known.has(d.room))
  return next
}

function validate(config: CardConfig) {
  if (config.rooms !== undefined && !Array.isArray(config.rooms)) throw new Error('rooms must be a list')
  for (const room of config.rooms ?? []) {
    if (!room.id) throw new Error('Every room needs an id')
    if (!Array.isArray(room.points) || room.points.length < 3)
      throw new Error(`Room ${room.id} needs at least 3 points`)
  }
  if (config.devices !== undefined && !Array.isArray(config.devices)) throw new Error('devices must be a list')
  for (const device of config.devices ?? []) {
    if (!device.entity_id) throw new Error('Every device needs an entity_id')
    if (!Array.isArray(device.position) || device.position.length !== 2)
      throw new Error(`Device ${device.entity_id} needs a position`)
  }
  if (config.decorations !== undefined && !Array.isArray(config.decorations))
    throw new Error('decorations must be a list')
  for (const item of config.decorations ?? []) {
    if (!item.id) throw new Error('Every decoration needs an id')
    if (!item.kind) throw new Error(`Decoration ${item.id} needs a kind`)
    if (!Array.isArray(item.position) || item.position.length !== 2)
      throw new Error(`Decoration ${item.id} needs a position`)
  }
}

class Floorplan3DCard extends ReactHost<CardConfig> {
  static getConfigElement() {
    return document.createElement(EDITOR_TYPE)
  }

  static getStubConfig(): Omit<CardConfig, 'type'> {
    return { rooms: [] }
  }

  // Called by HA once with the YAML config for this card.
  setConfig(config: CardConfig) {
    validate(config)
    this._config = migrate(config)
    this.render()
  }

  // Rough height in 50px rows for the masonry layout.
  getCardSize() {
    return 6
  }

  protected view() {
    return <Card hass={this._hass} config={this._config!} />
  }
}

// How long the editor waits for a slider or a color to settle before telling
// Home Assistant. Every change it is told of rebuilds the dialog's own copy
// of the card, a second 3D view, so a drag that told it on every step drew
// the flat twice over on every step.
const SETTLE_MS = 250

class Floorplan3DEditor extends ReactHost<CardConfig> {
  private pending: CardConfig | null = null
  private timer: ReturnType<typeof setTimeout> | undefined

  setConfig(config: CardConfig) {
    this._config = migrate(config)
    this.render()
  }

  // The editor itself follows every change at once. Home Assistant hears of
  // the last one once they settle, when the press or the key is let go, and
  // before anything saves.
  private emit = (config: CardConfig) => {
    this._config = config
    this.render()
    this.pending = config
    clearTimeout(this.timer)
    this.timer = setTimeout(this.flush, SETTLE_MS)
  }

  private flush = () => {
    clearTimeout(this.timer)
    const config = this.pending
    if (!config) return
    this.pending = null
    this.dispatchEvent(new CustomEvent('config-changed', { detail: { config }, bubbles: true, composed: true }))
  }

  connectedCallback() {
    super.connectedCallback()
    window.addEventListener('pointerup', this.flush, true)
    window.addEventListener('keyup', this.flush, true)
  }

  disconnectedCallback() {
    window.removeEventListener('pointerup', this.flush, true)
    window.removeEventListener('keyup', this.flush, true)
    super.disconnectedCallback()
  }

  protected view() {
    return (
      <Editor
        hass={this._hass}
        config={this._config!}
        onChange={this.emit}
        onSave={() => {
          this.flush()
          return persistCard(this)
        }}
      />
    )
  }
}

if (!customElements.get(CARD_TYPE)) customElements.define(CARD_TYPE, Floorplan3DCard)
if (!customElements.get(EDITOR_TYPE)) customElements.define(EDITOR_TYPE, Floorplan3DEditor)

// Makes the card show up in the "add card" picker.
window.customCards = window.customCards ?? []
window.customCards.push({
  type: CARD_TYPE,
  name: 'Floorplan 3D',
  description: 'Interactive 3D model of the flat',
})
