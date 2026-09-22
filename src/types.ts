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

export type EntityRegistryEntry = {
  entity_id: string
  device_id?: string | null
  area_id?: string | null
  name?: string | null
  hidden?: boolean
  entity_category?: string | null
}

export type DeviceRegistryEntry = {
  id: string
  area_id?: string | null
  name?: string | null
  name_by_user?: string | null
}

// Minimal subset of the hass object HA passes to cards.
export type HomeAssistant = {
  states: Record<string, EntityState>
  areas: Record<string, Area>
  entities?: Record<string, EntityRegistryEntry>
  devices?: Record<string, DeviceRegistryEntry>
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
  // Floor material from the theme's list, with an optional color tint.
  floor?: { material: string; color?: string; scale?: number; rotation?: number; intensity?: number }
}

// A Home Assistant entity placed in a room.
// An entity a decoration item stands in for. A device is never placed on
// its own: the room and position follow the item that stands behind it.
export type DeviceConfig = {
  entity_id: string
  room: string
  position: Point
  // Which of the device's percentages feeds each percentage of the items it
  // stands behind, for example its tilt driving a blind's slats.
  levels?: Record<string, string>
  // Decoration items that stand in for this device in 3D.
  decorations?: string[]
}

// A decoration item placed in a room: furniture, lamps, plants and the like.
export type DecorationConfig = {
  id: string
  // One of the kinds in the decoration catalog.
  kind: string
  room: string
  position: Point
  // Degrees, counter clockwise on the plan.
  rotation?: number
  // Id of the item this one stands on, for example the table under a lamp.
  // Its height follows that item's top, and it moves when that item moves.
  on?: string
  // Kind specific numbers, for example size or cord length, in meters.
  params?: Record<string, number>
  // Colors per material slot, as hex strings.
  colors?: Record<string, string>
}

export type CardConfig = {
  type: string
  rooms?: RoomConfig[]
  devices?: DeviceConfig[]
  decorations?: DecorationConfig[]
  // Corner radius in meters applied to rooms without their own.
  radius?: number
  // Gap in meters between adjacent rooms.
  gap?: number
  // Card aspect ratio as "width:height".
  aspect_ratio?: string
  // Where the sun comes from, in degrees clockwise from the top of the plan.
  // 0 puts it beyond the top edge, 90 to the right of it.
  sun_direction?: number
}

declare global {
  interface Window {
    customCards?: { type: string; name: string; description?: string }[]
  }
}
