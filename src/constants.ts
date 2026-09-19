// Internal values. Visual tweaks live in theme.ts.

// Card

export const DEFAULT_ASPECT_RATIO = '4 / 3'

// Rooms

export const SLAB_BEVEL_SEGMENTS = 32
export const SLAB_CURVE_SEGMENTS = 32

// Camera

export const CAMERA_FOV_DEG = 40
// Direction from the flat's center to the camera. Only the ratio matters.
export const CAMERA_DIRECTION: [number, number, number] = [0.6, 0.9, 0.8]
// Extra room around the flat when fitting it to the viewport, as a factor.
export const CAMERA_FIT_MARGIN = 1.1
export const CAMERA_MIN_DISTANCE_M = 2
export const CAMERA_MAX_DISTANCE_M = 60
export const CAMERA_MIN_POLAR_DEG = 6
export const CAMERA_MAX_POLAR_DEG = 82
export const CAMERA_NEAR_M = 0.1
export const CAMERA_FAR_M = 200

// Lights

export const AMBIENT_LIGHT_INTENSITY = 0.6
export const SUN_LIGHT_INTENSITY = 1.4
export const SUN_LIGHT_POSITION_M: [number, number, number] = [6, 12, 8]

// Editor

// Grid step for snapping.
export const EDITOR_GRID_M = 0.5
// How close, on screen, a point must be to snap to another vertex.
export const EDITOR_SNAP_PX = 10
// How close, on screen, a click must be to hit a vertex handle.
export const EDITOR_HANDLE_PX = 7
export const EDITOR_CANVAS_HEIGHT_PX = 440
export const EDITOR_SIDEBAR_WIDTH_PX = 340
// How long typing must pause before a text edit is sent to Home Assistant.
export const EDITOR_TEXT_COMMIT_DELAY_MS = 500
