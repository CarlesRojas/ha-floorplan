export type EntityState = {
  entity_id: string
  state: string
  attributes: Record<string, unknown>
  last_changed: string
  last_updated: string
}

// Minimal subset of the hass object HA passes to cards.
export type HomeAssistant = {
  states: Record<string, EntityState>
  callService: (domain: string, service: string, data?: Record<string, unknown>) => Promise<unknown>
  themes: { darkMode: boolean }
}

export type CardConfig = {
  type: string
  model?: string
}

declare global {
  interface Window {
    customCards?: { type: string; name: string; description?: string }[]
  }
}
