// The measurements of the office chair styles, in meters. Pilma gives each
// chair's width, depth and height and nothing else, so the parts below and
// the seat heights are off the product photos, scaled by those. Each chair
// is drawn at its real size, facing +z, with its seat at the height in the
// photos. The width and depth sliders scale it, and the seat height slider
// works as the gas lift does: the seat and everything on it ride up or down
// on the column while the base stays on the floor. The models are in
// OfficeChairs.tsx.

export type OfficeChairSpec = {
  // The chair's real width, depth and height, and its seat's height in the
  // photos, which the sliders start at.
  width: number
  depth: number
  height: number
  seat: number
}

// A five star base: how far out each castor stands from the column, the
// castors' wheel radius, the height of the hub the legs leave and of their
// tips.
export type Star = { reach: number; wheel: number; hub: number; tip: number }

// Teck: a task chair with a black mesh back in a tapered frame, a padded
// seat on a black mechanism, T arms on a polished aluminum loop that runs
// round behind the seat and holds the back, on a flat five star base.
export const TECK_STAR: Star = { reach: 0.3, wheel: 0.028, hub: 0.13, tip: 0.085 }
// The seat cushion's width, thickness and depth.
export const TECK_SEAT: [number, number, number] = [0.5, 0.085, 0.48]
// The back's foot and head widths, where its foot stands, how far it leans,
// the frame's depth and the width of its bars.
export const TECK_BACK = { foot: 0.4, head: 0.46, y: 0.515, z: -0.25, lean: 0.12, thick: 0.03, bar: 0.022 }
// The arm pads' height, how far out they stand, and their size.
export const TECK_ARM = { y: 0.63, x: 0.265, pad: [0.08, 0.025, 0.25] as [number, number, number] }

// Lola: one molded shell covered in black polyurethane, stitched in
// channels across the seat and the back, on five spindly legs of black
// lacquered aluminum rising steeply to a hub high under the seat.
export const LOLA_STAR: Star = { reach: 0.235, wheel: 0.024, hub: 0.28, tip: 0.075 }
// The shell's width, how deep the seat is and where it ends at the back,
// and the channels on the seat and the back.
export const LOLA_SHELL = { width: 0.46, seat: 0.44, rear: -0.2, thick: 0.035, lean: 0.2, seatChannels: 5, backChannels: 6 }

// Air high back: an upholstered shell with a tall back that narrows toward
// its rounded head and flares into wings at the arms, a loose seat cushion
// and a pad for the head, on a slim polished aluminum star.
export const AIR_STAR: Star = { reach: 0.29, wheel: 0.025, hub: 0.26, tip: 0.07 }
// The back's foot and head widths, where its foot stands and its lean.
export const AIR_BACK = { foot: 0.44, head: 0.3, y: 0.52, z: -0.3, lean: 0.09, thick: 0.06 }
// The wings: half their span, their thickness, where their rear and tips
// are, their top and bottom at the back.
export const AIR_WINGS = { half: 0.3, thick: 0.045, rear: -0.31, tip: 0.13, top: 0.67, bottom: 0.44 }

export const OFFICE_CHAIRS: Record<string, OfficeChairSpec> = {
  teck: { width: 0.66, depth: 0.66, height: 0.99, seat: 0.49 },
  lola: { width: 0.51, depth: 0.47, height: 0.85, seat: 0.47 },
  air: { width: 0.64, depth: 0.72, height: 1.27, seat: 0.49 },
}
