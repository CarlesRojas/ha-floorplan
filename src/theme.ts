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
// Glow of a light that is on, before level and color are applied.
export const LIGHT_GLOW_COLOR = '#ffd27a'
export const LIGHT_POINT_INTENSITY = 9
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
