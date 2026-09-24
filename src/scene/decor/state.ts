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

// Whether two states draw the same. Each render builds its states afresh, so
// they are compared by what they hold rather than by which object they are.
export function sameState(a: ItemState | null, b: ItemState | null) {
  if (a === b) return true
  if (!a || !b) return false
  if (a.on !== b.on || a.level !== b.level || a.value !== b.value || a.text !== b.text) return false
  if (a.glow[0] !== b.glow[0] || a.glow[1] !== b.glow[1] || a.glow[2] !== b.glow[2]) return false
  const keys = Object.keys(a.levels)
  if (keys.length !== Object.keys(b.levels).length) return false
  return keys.every(k => a.levels[k] === b.levels[k])
}
