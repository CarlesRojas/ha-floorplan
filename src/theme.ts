// Visual settings meant to be tweaked by hand. Units are in the names:
// _M meters, _PX pixels, _DEG degrees.

// Rooms

// Distance between neighbouring rooms.
export const ROOM_GAP_M = 0.12
// Rounding of the room corners, seen from above.
export const ROOM_CORNER_RADIUS_M = 0.3
// Thickness of the floor slab.
export const ROOM_SLAB_THICKNESS_M = 0.1
// Rounding of the slab edges between the top and side faces. Kept below half
// the slab thickness so the top and bottom rounding do not meet.
export const ROOM_SLAB_EDGE_RADIUS_M = 0.05
// Fill colors, assigned to rooms in order. A room can override with `color`.
export const ROOM_COLORS = ['#7c9cbf', '#c9a27e', '#9bb38a', '#b58fb0', '#d6b56a', '#8fb6b3']

// Card

export const CARD_CORNER_RADIUS_PX = 24

// Editor

// Accent color of each editor mode.
export const EDITOR_MODE_COLORS = {
  rooms: '#03a9f4',
  devices: '#f59e0b',
}
