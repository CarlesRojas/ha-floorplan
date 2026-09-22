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

export const SUN_LIGHT_POSITION_M: [number, number, number] = [6, 12, 8]
export const SUN_SHADOW_MAP_PX = 2048
// A lamp lights the room around it and casts shadows from what it stands
// among. Each one costs six shadow renders, so only the first few get them.
export const LAMP_SHADOW_MAP_PX = 512
export const MAX_SHADOW_LAMPS = 4
// How long the daylight takes to catch up when the sun moves, in seconds.
export const DAYLIGHT_EASE_S = 1.2

// Editor

// Grid step for snapping.
export const EDITOR_GRID_M = 0.2
// How close, on screen, a point must be to snap to another vertex.
export const EDITOR_SNAP_PX = 10
// How close, on screen, a click must be to hit a vertex handle.
export const EDITOR_HANDLE_PX = 7
export const EDITOR_CANVAS_HEIGHT_PX = 440
export const EDITOR_SIDEBAR_WIDTH_PX = 340
// The sidebar never goes below this, nor past half the window.
export const EDITOR_SIDEBAR_MIN_PX = 260
// How long typing must pause before a text edit is sent to Home Assistant.
export const EDITOR_TEXT_COMMIT_DELAY_MS = 500
// Distance from the canvas border where dragging starts to pan the view.
export const EDITOR_AUTOPAN_MARGIN_PX = 48
// Pan speed when the pointer is right at the border.
export const EDITOR_AUTOPAN_SPEED_PX_S = 500
// Grid step for placing devices.
export const EDITOR_DEVICE_GRID_M = 0.05
// Radius of a device marker on the canvas.
export const EDITOR_DEVICE_RADIUS_PX = 14
// The 3D preview is docked under the plan. This is the share of their
// column it takes when it opens, and neither of them goes below this height.
export const EDITOR_PREVIEW_FRACTION = 0.5
export const EDITOR_PREVIEW_MIN_PX = 140
// Narrower than this and the mode switch drops the names, keeping the
// icons, so it still fits the sidebar.
export const EDITOR_MODE_LABELS_PX = 330
// How long the Save button says Saved after it is pressed.
export const EDITOR_SAVED_FLASH_MS = 1600
// Height of the 3D preview at the top of the sidebar, before it is dragged.
export const EDITOR_SIDEBAR_PREVIEW_PX = 224
