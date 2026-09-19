import Card from '#/Card.tsx'
import Editor from '#/editor/Editor.tsx'
import { ReactHost } from '#/host.tsx'
import type { CardConfig } from '#/types.ts'

const CARD_TYPE = 'floorplan-3d'
const EDITOR_TYPE = `${CARD_TYPE}-editor`

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
    if (!config.rooms?.some(r => r.id === device.room))
      throw new Error(`Device ${device.entity_id} points at an unknown room`)
    if (!Array.isArray(device.position) || device.position.length !== 2)
      throw new Error(`Device ${device.entity_id} needs a position`)
  }
  if (config.decorations !== undefined && !Array.isArray(config.decorations))
    throw new Error('decorations must be a list')
  for (const item of config.decorations ?? []) {
    if (!item.id) throw new Error('Every decoration needs an id')
    if (!item.kind) throw new Error(`Decoration ${item.id} needs a kind`)
    if (!config.rooms?.some(r => r.id === item.room)) throw new Error(`Decoration ${item.id} points at an unknown room`)
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
    this._config = config
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

class Floorplan3DEditor extends ReactHost<CardConfig> {
  setConfig(config: CardConfig) {
    this._config = config
    this.render()
  }

  private emit = (config: CardConfig) => {
    this._config = config
    this.render()
    this.dispatchEvent(new CustomEvent('config-changed', { detail: { config }, bubbles: true, composed: true }))
  }

  protected view() {
    return <Editor hass={this._hass} config={this._config!} onChange={this.emit} />
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
