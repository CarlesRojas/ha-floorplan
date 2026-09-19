// What a decoration model shows about its bound device. Null when the device
// cannot express anything the model draws, so the model stays neutral.
export type ItemState = {
  on: boolean
  // 0 to 1
  level: number
  // 0 to 1 each, the light tint
  glow: [number, number, number]
  // Raw numeric reading, for models with a display.
  value?: number
  // Raw state string, for enum devices.
  text?: string
}
