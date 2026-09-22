// Visual settings meant to be tweaked by hand. Units are in the names:
// _M meters, _PX pixels, _DEG degrees.

// Rooms

// Distance between neighbouring rooms.
export const ROOM_GAP_M = 0.1
// Rounding of the room corners, seen from above.
export const ROOM_CORNER_RADIUS_M = 0.05
// Thickness of the floor slab.
export const ROOM_SLAB_THICKNESS_M = 0.05
// Rounding of the slab edges between the top and side faces. Kept below half
// the slab thickness so the top and bottom rounding do not meet.
export const ROOM_SLAB_EDGE_RADIUS_M = 0.05
// Fill colors, assigned to rooms in order. A room can override with `color`.
export const ROOM_COLORS = ['#7c9cbf', '#c9a27e', '#9bb38a', '#b58fb0', '#d6b56a', '#8fb6b3']

// Card

export const CARD_CORNER_RADIUS_PX = 24

// Editor

// What is selected on the canvas is drawn in this, whatever the mode.
export const EDITOR_SELECTED_COLOR = '#03a9f4'

// Accent color of each editor mode.
export const EDITOR_MODE_COLORS = {
  rooms: '#03a9f4',
  devices: '#f59e0b',
  decoration: '#34d399',
}

// Decoration

// Height of the ceiling that pendants and ceiling lights hang from.
export const CEILING_HEIGHT_M = 2.6
// Default colors of the material slots of the light family.
// The Scandinavian palette every model draws from: pale woods, chalky
// whites, muted greens and clays, soft greys.
export const SCANDI = {
  oak: '#dcc3a0',
  birch: '#ead9c0',
  walnut: '#a8845c',
  offWhite: '#f2efe9',
  linen: '#e6ded1',
  straw: '#d9c9a3',
  mist: '#cdd6d8',
  slate: '#9aa3a8',
  charcoal: '#4a4f52',
  sage: '#b6c3ae',
  leaf: '#7f9c6d',
  clay: '#cfa08a',
  // Near black, for screens and the devices built around them.
  ink: '#2b2e31',
}

// A screen that is off: almost black, with just enough life to catch the
// room light.
export const SCREEN_OFF_COLOR = '#16191b'

// Scandinavian defaults: warm white fabric shades, light oak, grey cords.
export const LIGHT_SHADE_COLOR = '#f4eee3'
export const LIGHT_BASE_COLOR = '#d8b98e'
export const LIGHT_CORD_COLOR = '#8f877b'
// Glow of a light that is on, before level and color are applied. A lamp
// with no color temperature to read sits around 3000 K: warm white, not the
// amber of a candle.
export const LIGHT_GLOW_COLOR = '#ffe3bd'
export const LIGHT_POINT_INTENSITY = 5.5
// How a lamp's light divides: the part that leaves the shade and casts
// shadows, and the part that comes through the shade itself and casts none.
export const LAMP_KEY_SHARE = 0.7
export const LAMP_THROUGH_SHARE = 0.4
export const LAMP_SHADOW_BLUR = 5
// What each kind of lamp puts into the room, as a share of the rest. A
// pendant hangs close over a table and sends its light down through a
// diffuser, so it gives less than a floor lamp standing in the open.
export const LAMP_OUTPUT: Record<string, number> = {
  light_pendant: 0.5,
  light_table: 0.75,
  light_wall: 0.8,
  light_ceiling: 0.9,
}
// Daylight and night. The room is warm at both ends of the day: sunlight
// comes in soft and golden, and once the sun is down the wash left behind is
// dim and warm so the lamps carry the room.
export const DAY_SKY_COLOR = '#fff1dc'
export const DAY_GROUND_COLOR = '#e8d9c4'
export const DAY_SUN_COLOR = '#ffe6bd'
export const NIGHT_SKY_COLOR = '#e9ddcd'
export const NIGHT_GROUND_COLOR = '#b9ad9e'
export const NIGHT_SUN_COLOR = '#e6dccd'
// Ambient and sky fill, day and night.
export const DAY_AMBIENT_INTENSITY = 0.12
export const DAY_HEMISPHERE_INTENSITY = 0.5
export const NIGHT_AMBIENT_INTENSITY = 0.04
export const NIGHT_HEMISPHERE_INTENSITY = 0.1
// The sun itself. It is kept gentle, and its shadows are blurred wide, so
// daylight models the room without cutting hard edges into it.
export const DAY_SUN_INTENSITY = 1
export const NIGHT_SUN_INTENSITY = 0.03
export const SUN_SHADOW_BLUR = 9

// How far from a press the card looks for something to act on, in pixels.
// A ray hits one point, so a press that lands on nothing is tried again in
// rings out to this radius.
export const PICK_RADIUS_PX = 42
// Radius of the sphere shown for a device with no decoration bound.
export const DEVICE_SPHERE_RADIUS_M = 0.12
export const DEVICE_SPHERE_COLOR = '#ffffff'

// Floor

// Floor materials a room can have. Color is the default tint, roughness the
// sheen of the surface.
export const FLOOR_MATERIALS: Record<string, { label: string; color: string; surface: string }> = {
  wood: { label: 'Wood', color: '#dcc3a0', surface: 'wood_floor' },
  tiles: { label: 'Tiles', color: '#d9d2c5', surface: 'tiles' },
  terracotta: { label: 'Terracotta', color: '#c4764f', surface: 'terracotta' },
  carpet: { label: 'Carpet', color: '#9fb3c8', surface: 'carpet' },
  concrete: { label: 'Concrete', color: '#b3b3b0', surface: 'concrete' },
}
