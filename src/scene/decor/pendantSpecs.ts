// The measurements of the pendant styles, in meters, off Santa & Cole's
// technical drawings unless a note says otherwise. The models are drawn from
// these in Pendants.tsx.

export type PendantSpec = {
  // The shade's real diameter, which the size slider starts from.
  diameter: number
  // How far below the top of the lamp the light comes from.
  glow: number
}

// Cables are not in the drawings. These are the usual thicknesses: the flat
// LED cable of the capsule lamps, a textile covered mains cord and the thin
// steel wires the Globo Cesta hangs from.
export const LED_CABLE_R = 0.002
export const TEXTILE_CORD_R = 0.003
export const STEEL_WIRE_R = 0.0008
// The HeadLed capsule: the HeadHat and the Cirio drawings are each a
// centimeter taller than their shade, which is its heat sink.
export const CAPSULE_H = 0.01
// Not in the drawings: measured off the product photos against the shade.
export const CAPSULE_R = 0.034
export const CAPSULE_FINS = 24

// Nagoya: a slatted drum Ø42 by 25 cm. The slat count and the seven thread
// bands are counted off the photos.
export const NAGOYA_R = 0.21
export const NAGOYA_H = 0.25
export const NAGOYA_SLATS = 110
export const NAGOYA_THREADS = 7

// Globo Cesta: Ø27 by 34 cm under a Ø11 by 3 cm canopy. The cap, the grip,
// the bottom neck and where the wires sit are measured off the photos.
export const GLOBO_A = 0.135
export const GLOBO_CAP_R = 0.0375
export const GLOBO_CAP_H = 0.012
export const GLOBO_TOTAL_H = 0.34
// The glass is squarer than an ellipse and rounder than a box.
export const GLOBO_NECK_R = 0.0445
// The glass is squarer than an ellipse and rounder than a box.
export const GLOBO_NECK_H = 0.015
export const GLOBO_GRIP_H = 0.02
// The glass is squarer than an ellipse and rounder than a box.
export const GLOBO_N = 2.8
export const GLOBO_CANOPY: [number, number] = [0.11, 0.03]
export const GLOBO_WIRE_X = 0.0155

// HeadHat Bowl L: Ø20 by 12 cm with the capsule. The drawing gives the
// outline only, so the flat top, the shoulder (across by down) and the wall
// are measured off the product photo against its 20 cm.
export const HEADHAT_R = 0.1
export const HEADHAT_H = 0.12
export const HEADHAT_TOP_R = 0.044
export const HEADHAT_SHOULDER: [number, number] = [0.056, 0.045]
export const HEADHAT_WALL = 0.006
// The Ø11 by 6 cm canopy of both capsule lamps.
export const CAPSULE_CANOPY: [number, number] = [0.11, 0.06]

// Cirio Simple: Ø10 by 21 cm, 22 cm with the capsule.
export const CIRIO_R = 0.05
export const CIRIO_H = 0.21
export const CIRIO_WALL = 0.003

export const PENDANTS: Record<string, PendantSpec> = {
  nagoya: { diameter: NAGOYA_R * 2, glow: 0.09 },
  globo_cesta: { diameter: GLOBO_A * 2, glow: GLOBO_TOTAL_H / 2 },
  // Low in the bowl, far enough from the ceramic that its shadow holds.
  headhat_bowl: { diameter: HEADHAT_R * 2, glow: 0.065 },
  cirio_simple: { diameter: CIRIO_R * 2, glow: CAPSULE_H + CIRIO_H / 2 },
}
