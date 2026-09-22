import type { HomeAssistant } from '#/types.ts'

const clamp = (v: number, min = 0, max = 1) => Math.min(Math.max(v, min), max)

// How much daylight the home is getting: 1 in broad daylight, 0 at night,
// sliding through dusk and dawn over about an hour either side.
//
// Home Assistant knows where the sun is, so the card asks it. `sun.sun`
// carries the elevation in degrees, and the sun climbs roughly ten degrees
// in the hour after it rises and drops the same in the hour before it sets,
// so that elevation is the fade: the room starts dimming about an hour
// before sundown and is at night by sundown, and takes the hour after
// sunrise to come up to full daylight.
//
// Without that attribute the card falls back to the entity's state, and
// without the sun integration at all to the clock on the device showing the
// card, with the same hour long fades.
const FADE_DEG = 10
const DAWN_H = 7
const DUSK_H = 21
const FADE_H = 1

export function daylight(hass: HomeAssistant | null): number {
  const sun = hass?.states['sun.sun']
  const elevation = Number(sun?.attributes?.elevation)
  if (Number.isFinite(elevation)) return clamp(elevation / FADE_DEG)
  if (sun) return sun.state === 'above_horizon' ? 1 : 0
  const now = new Date()
  const hour = now.getHours() + now.getMinutes() / 60
  return clamp(Math.min(hour - DAWN_H, DUSK_H - hour) / FADE_H)
}
