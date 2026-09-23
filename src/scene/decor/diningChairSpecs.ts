// The measurements of the dining chair styles, in meters. Pilma gives each
// chair's width, depth and height and nothing else, so the parts below are
// off the product photos, scaled by those. Each chair is drawn at its real
// size, facing +z, and the width, depth and height sliders scale that. The
// models are in DiningChairs.tsx.

export type DiningChairSpec = {
  // The chair's real width, depth and height, which the sliders start at.
  width: number
  depth: number
  height: number
}

// New Aix: one upholstered shell, a seat that curves up at its sides and a
// back that wraps round, on four splayed oak dowels.
export const AIX_SEAT: [number, number] = [0.4, 0.46]
// The seat's width, depth and thickness, and the radius it curves across.
export const AIX_SHELL: [number, number, number, number] = [0.5, 0.46, 0.06, 0.7]
// The back's width, thickness, radius and how far it leans back.
export const AIX_BACK: [number, number, number, number] = [0.52, 0.05, 0.38, 0.12]
// Each dowel's radius at the seat and at the floor, where it stands under
// the seat and where its foot lands.
export const AIX_LEG: [number, number] = [0.016, 0.011]
export const AIX_LEG_TOP: [number, number] = [0.16, 0.15]
export const AIX_LEG_FOOT: [number, number] = [0.235, 0.22]

// Oia: covered all over in recycled leather. Slim square legs, a seat slab
// 5 cm thick and a back panel 3 cm thick that the rear legs run up into.
export const OIA_SEAT: [number, number] = [0.47, 0.05]
export const OIA_BACK_T = 0.03
export const OIA_LEAN = 0.08
// The legs' sides at the seat and at the floor.
export const OIA_LEG: [number, number] = [0.025, 0.015]

// Sura: a teak frame after Møller's, a woven paper cord seat, round tapered
// front legs, and rear legs that splay back at the foot and lean back above
// the seat into posts holding a curved board.
// The seat's top and bottom, and how deep it is.
export const SURA_SEAT: [number, number, number] = [0.495, 0.395, 0.42]
export const SURA_FRONT_LEG: [number, number] = [0.0175, 0.011]
export const SURA_REAR_LEG: [number, number, number] = [0.017, 0.012, 0.013]
// The board's width, height, thickness and the radius it curves round.
export const SURA_BOARD: [number, number, number, number] = [0.42, 0.13, 0.02, 0.5]

// Varma: an ash frame stained walnut, a leather pad 5 cm thick on board
// rails, side stretchers low down, and posts carrying a curved backrest.
export const VARMA_SEAT: [number, number] = [0.5, 0.05]
// The rails' height and thickness.
export const VARMA_RAIL: [number, number] = [0.06, 0.02]
export const VARMA_LEG: [number, number] = [0.018, 0.011]
export const VARMA_STRETCHER: [number, number] = [0.27, 0.018]
// The backrest's width, height, thickness and the radius it curves round.
export const VARMA_BACK: [number, number, number, number] = [0.36, 0.175, 0.015, 0.45]

export const DINING_CHAIRS: Record<string, DiningChairSpec> = {
  aix: { width: 0.53, depth: 0.5, height: 0.84 },
  oia: { width: 0.48, depth: 0.51, height: 0.85 },
  sura: { width: 0.46, depth: 0.55, height: 0.8 },
  varma: { width: 0.48, depth: 0.51, height: 0.8 },
}
