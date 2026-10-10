// The colors a playing screen goes through, shared by the light it throws
// and a projector's beam so they match the picture.

// The hue of the screen at a time, the same as the shader's.
function hueAt(time: number) {
  const x = (time / 100) % 1
  const t = Math.min(1, Math.max(0, (x - 0.7) / 0.3))
  return 0.47 + 0.1 * Math.sin(time * 0.15) + t * t * (3 - 2 * t)
}

// The color of a hue at full strength, from 0 to 1 round the wheel.
function vivid(h: number, out: [number, number, number]) {
  for (let i = 0; i < 3; i++) {
    const k = (((h * 6 + [0, 4, 2][i]) % 6) + 6) % 6
    out[i] = Math.min(1, Math.max(0, Math.abs(k - 3) - 1))
  }
  return out
}

// The color a playing screen throws at a time: between its two colors,
// washed a touch towards white so the room still reads under it.
export function screenTint(time: number, out: [number, number, number]) {
  vivid(hueAt(time) + 0.04, out)
  for (let i = 0; i < 3; i++) out[i] = 0.1 + 0.9 * out[i]
  return out
}
