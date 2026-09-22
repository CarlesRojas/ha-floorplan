import type { HomeAssistant } from '#/types.ts'

const clamp = (v: number, min = 0, max = 1) => Math.min(Math.max(v, min), max)

// How much daylight the home is getting: 1 in broad daylight, 0 at night,
// sliding through dusk and dawn.
//
// Home Assistant knows where the sun is, so the card asks it. `sun.sun`
// carries the elevation in degrees, which turns the last hour before sunset
// into a fade rather than a switch. Without that entity the card falls back
// to the state, and without the sun integration at all to the clock on the
// device showing the card.
export function daylight(hass: HomeAssistant | null): number {
  const sun = hass?.states['sun.sun']
  const elevation = Number(sun?.attributes?.elevation)
  // Full daylight once the sun is a little up, dark once it is well down.
  if (Number.isFinite(elevation)) return clamp((elevation + 6) / 14)
  if (sun) return sun.state === 'above_horizon' ? 1 : 0
  const now = new Date()
  const hour = now.getHours() + now.getMinutes() / 60
  return clamp(Math.min(hour - 6.5, 20.5 - hour) / 1.5)
}
