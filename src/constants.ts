// Tunable values for the card. Lengths are in meters unless noted.

// Card

export const CARD_BORDER_RADIUS_PX = 24
export const DEFAULT_ASPECT_RATIO = '4 / 3'

// Rooms

export const DEFAULT_ROOM_RADIUS = 0.3
export const DEFAULT_ROOM_GAP = 0.12
export const SLAB_HEIGHT = 0.12
export const SLAB_BEVEL_THICKNESS = 0.05
export const SLAB_BEVEL_SIZE = 0.05
export const SLAB_BEVEL_SEGMENTS = 6
export const SLAB_CURVE_SEGMENTS = 12
export const ROOM_LABEL_LIFT = 0.05
export const ROOM_PALETTE = ['#7c9cbf', '#c9a27e', '#9bb38a', '#b58fb0', '#d6b56a', '#8fb6b3']

// Scene

export const CAMERA_FOV = 40
export const CAMERA_START_POSITION: [number, number, number] = [8, 10, 10]
export const CAMERA_FIT_MARGIN = 1.15
export const CAMERA_MIN_DISTANCE = 2
export const CAMERA_MAX_DISTANCE = 60
export const CAMERA_MIN_POLAR = 0.1
export const CAMERA_MAX_POLAR = Math.PI / 2.2
export const AMBIENT_LIGHT_INTENSITY = 0.6
export const SUN_LIGHT_INTENSITY = 1.4
export const SUN_LIGHT_POSITION: [number, number, number] = [6, 12, 8]
