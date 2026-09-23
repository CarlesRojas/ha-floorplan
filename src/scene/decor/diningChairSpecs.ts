// The measurements of the dining chair styles, in meters. Pilma gives each
// chair's width, depth and height and nothing else, so the parts below are
// off the product photos, scaled by those. Each chair faces +z and is laid
// out again at the width, depth and height the sliders give it, so its
// parts keep their thickness. The models are in DiningChairs.tsx.

export type DiningChairSpec = {
  // The chair's real width, depth and height, which the sliders start at.
  width: number
  depth: number
  height: number
}

// Molded Shell: after the Eames DSW, 47 by 55 cm and 83 cm tall. One
// molded shell, its seat rolled over at the front and running up into a back
// that widens to the top, on four splayed wooden dowels braced by a steel
// wire base. The parts are off Herman Miller's product photos.
// The middle of the shell's seat face from its front lip to the top of its
// back, as depth and height pairs.
export const MOLDED_PROFILE: [number, number][] = [
  [0.262, 0.424],
  [0.258, 0.439],
  [0.238, 0.447],
  [0.15, 0.437],
  [0.06, 0.424],
  [-0.04, 0.42],
  [-0.12, 0.428],
  [-0.165, 0.45],
  [-0.19, 0.5],
  [-0.21, 0.58],
  [-0.235, 0.68],
  [-0.257, 0.77],
  [-0.272, 0.83],
]
// The shell's half width and how far its edges turn up toward the sitter,
// each at shares of the way along the profile.
export const MOLDED_HALF: [number, number][] = [
  [0, 0.212],
  [0.3, 0.226],
  [0.5, 0.196],
  [0.62, 0.2],
  [1, 0.233],
]
export const MOLDED_RISE: [number, number][] = [
  [0, 0.012],
  [0.15, 0.03],
  [0.5, 0.03],
  [0.7, 0.04],
  [1, 0.025],
]
// The shell's thickness and the radius of its front and top corners.
export const MOLDED_THICK = 0.009
export const MOLDED_CORNER: [number, number] = [0.035, 0.06]
// Where the legs stand at their tops and at the floor, the legs' radius at
// each, and the steel caps on their tops.
export const MOLDED_LEG_TOP: [number, number, number] = [0.155, 0.33, 0.145]
export const MOLDED_LEG_FOOT: [number, number] = [0.215, 0.215]
export const MOLDED_LEG: [number, number] = [0.014, 0.01]
export const MOLDED_CAP: [number, number] = [0.016, 0.03]
// The rubber mounts under the shell, the wires' radius, and how high the
// crossed wires meet the next leg.
export const MOLDED_MOUNT: [number, number] = [0.14, 0.12]
export const MOLDED_WIRE = 0.003
export const MOLDED_CROSS = 0.13

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
  molded: { width: 0.47, depth: 0.55, height: 0.83 },
  oia: { width: 0.48, depth: 0.51, height: 0.85 },
  sura: { width: 0.46, depth: 0.55, height: 0.8 },
  varma: { width: 0.48, depth: 0.51, height: 0.8 },
}
