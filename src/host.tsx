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
  private root: Root | null = null
  private mount: HTMLDivElement
  protected _hass: HomeAssistant | null = null
  protected _config: Config | null = null

  constructor() {
    super()
    injectFonts()
    const shadow = this.attachShadow({ mode: 'open' })
    const style = document.createElement('style')
    style.textContent = styles
    shadow.appendChild(style)
    this.mount = document.createElement('div')
    this.mount.style.height = '100%'
    shadow.appendChild(this.mount)
  }

  connectedCallback() {
    this.render()
  }

  // HA moves elements (disconnect and reconnect in the same task) but also
  // discards them, for example the preview card on every config change. Wait
  // a tick to tell the two apart, and only tear the React tree down when the
  // element is really gone, so WebGL contexts and render loops do not leak.
  disconnectedCallback() {
    setTimeout(() => {
      if (this.isConnected || !this.root) return
      this.root.unmount()
      this.root = null
    }, 0)
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
    if (!this._config || !this.isConnected) return
    this.root ??= createRoot(this.mount)
    this.root.render(<StrictMode>{this.view()}</StrictMode>)
  }
}
