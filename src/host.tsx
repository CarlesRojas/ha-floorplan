import fontsCss from '#/fonts.css?inline'
import styles from '#/index.css?inline'
import type { HomeAssistant } from '#/types.ts'
import { StrictMode, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'

const FONTS_ID = 'floorplan-3d-fonts'

// Fonts must live in the document, not the shadow root, for @font-face to apply.
function injectFonts() {
  if (document.getElementById(FONTS_ID)) return
  const style = document.createElement('style')
  style.id = FONTS_ID
  style.textContent = fontsCss
  document.head.appendChild(style)
}

// Custom element that hosts a React tree in a shadow root with the card styles.
// HA detaches and re-attaches elements when a view re-renders, so everything
// that must happen exactly once lives in the constructor.
export abstract class ReactHost<Config> extends HTMLElement {
  private root: Root
  protected _hass: HomeAssistant | null = null
  protected _config: Config | null = null

  constructor() {
    super()
    injectFonts()
    const shadow = this.attachShadow({ mode: 'open' })
    const style = document.createElement('style')
    style.textContent = styles
    shadow.appendChild(style)
    const mount = document.createElement('div')
    mount.style.height = '100%'
    shadow.appendChild(mount)
    this.root = createRoot(mount)
  }

  connectedCallback() {
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

  protected abstract view(): ReactNode

  protected render() {
    if (!this._config) return
    this.root.render(<StrictMode>{this.view()}</StrictMode>)
  }
}
