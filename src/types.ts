export type EntityState = {
  entity_id: string
  state: string
  attributes: Record<string, unknown>
  last_changed: string
  last_updated: string
}

export type Area = {
  area_id: string
  name: string
  floor_id: string | null
  icon: string | null
}

// Minimal subset of the hass object HA passes to cards.
export type HomeAssistant = {
  states: Record<string, EntityState>
  areas: Record<string, Area>
  callService: (domain: string, service: string, data?: Record<string, unknown>) => Promise<unknown>
  themes: { darkMode: boolean }
}

// Plan coordinates in meters. x grows to the right, y grows upward on the plan.
export type Point = [number, number]

export type RoomConfig = {
  id: string
  name?: string
  area_id?: string
  points: Point[]
  radius?: number
  color?: string
}

export type CardConfig = {
  type: string
  rooms?: RoomConfig[]
  // Corner radius in meters applied to rooms without their own.
  radius?: number
  // Gap in meters between adjacent rooms.
  gap?: number
  // Card aspect ratio as "width:height".
  aspect_ratio?: string
}

declare global {
  interface Window {
    customCards?: { type: string; name: string; description?: string }[]
  }
}
