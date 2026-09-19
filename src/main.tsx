import Card from '#/Card.tsx'
import fontsCss from '#/fonts.css?inline'
import styles from '#/index.css?inline'
import type { CardConfig, HomeAssistant } from '#/types.ts'
import { StrictMode } from 'react'
import { createRoot, type Root } from 'react-dom/client'

const CARD_TYPE = 'floorplan-3d'
const FONTS_ID = `${CARD_TYPE}-fonts`

// Fonts must live in the document, not the shadow root, for @font-face to apply.
function injectFonts() {
  if (document.getElementById(FONTS_ID)) return
  const style = document.createElement('style')
  style.id = FONTS_ID
  style.textContent = fontsCss
  document.head.appendChild(style)
}

class Floorplan3DCard extends HTMLElement {
  private root: Root | null = null
  private mount: HTMLDivElement | null = null
  private _hass: HomeAssistant | null = null
  private _config: CardConfig | null = null

  connectedCallback() {
    if (this.root) return
    injectFonts()
    const shadow = this.attachShadow({ mode: 'open' })
    const style = document.createElement('style')
    style.textContent = styles
    shadow.appendChild(style)
    this.mount = document.createElement('div')
    this.mount.style.height = '100%'
    shadow.appendChild(this.mount)
    this.root = createRoot(this.mount)
    this.render()
  }

  disconnectedCallback() {
    this.root?.unmount()
    this.root = null
  }

  // Called by HA once with the YAML config for this card.
  setConfig(config: CardConfig) {
    if (config.rooms !== undefined && !Array.isArray(config.rooms)) throw new Error('rooms must be a list')
    for (const room of config.rooms ?? []) {
      if (!room.id) throw new Error('Every room needs an id')
      if (!Array.isArray(room.points) || room.points.length < 3)
        throw new Error(`Room ${room.id} needs at least 3 points`)
    }
    this._config = config
    this.render()
  }

  // Called by HA on every state change.
  set hass(hass: HomeAssistant) {
    this._hass = hass
    this.render()
  }

  get hass() {
    return this._hass as HomeAssistant
  }

  // Rough height in 50px rows for the masonry layout.
  getCardSize() {
    return 6
  }

  private render() {
    if (!this.root || !this._config) return
    this.root.render(
      <StrictMode>
        <Card hass={this._hass} config={this._config} />
      </StrictMode>,
    )
  }
}

if (!customElements.get(CARD_TYPE)) customElements.define(CARD_TYPE, Floorplan3DCard)

// Makes the card show up in the "add card" picker.
window.customCards = window.customCards ?? []
window.customCards.push({
  type: CARD_TYPE,
  name: 'Floorplan 3D',
  description: 'Interactive 3D model of the flat',
})
