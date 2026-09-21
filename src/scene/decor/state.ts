// What a decoration model shows about its bound device. Null when the device
// cannot express anything the model draws, so the model stays neutral.
export type ItemState = {
  on: boolean
  // 0 to 1, or missing when the device has no percentage at all. A device
  // that only switches must not read as a full one, or a door bound to it
  // would sit open and never move.
  level?: number
  // The percentage feeding each of the item's own channels, 0 to 1. A window
  // that opens and tilts reads both.
  levels: Record<string, number>
  // 0 to 1 each, the light tint
  glow: [number, number, number]
  // Raw numeric reading, for models with a display.
  value?: number
  // Raw state string, for enum devices.
  text?: string
}
