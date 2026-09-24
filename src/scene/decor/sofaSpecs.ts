// The measurements of the sofa, in meters, after Pilma's Dresde. Pilma gives
// its seat height, its leg height and its overall sizes: 190 to 270 wide,
// and 298 by 170 with the chaise longue. The parts below are off the product
// photos, scaled by those. The sofa faces +z and is laid out again at the
// width and depth the sliders give it, so its parts keep their size and the
// seats share out the width. The models are in Sofas.tsx.

// Its real width and depth, straight and with the chaise, and how far the
// chaise reaches out from the back.
export const SOFA_WIDTH = 2.3
export const SOFA_CHAISE_WIDTH = 2.98
export const SOFA_DEPTH = 0.98
export const SOFA_REACH = 1.7

// Painted metal legs, 17 cm tall, tapering to the floor and leaning out a
// little at the foot. Radius at the top and the foot, and how far in from
// the corners of the base they stand.
export const SOFA_LEG_H = 0.17
export const SOFA_LEG_R: [number, number] = [0.016, 0.009]
export const SOFA_LEG_SPLAY = 0.12
export const SOFA_LEG_INSET = 0.08

// The base the seat cushions sit on, on top of the legs.
export const SOFA_BASE_H = 0.08

// The loose seat cushions, whose top is the 42 cm seat before anyone sits.
export const SOFA_SEAT_H = 0.17
// A seat is never narrower than this. Once the width holds one more at
// this width, it shares out among one seat more.
export const SOFA_SEAT_MIN = 0.8

// The thin padded arms, which run the whole depth: thickness, top and
// bottom.
export const SOFA_ARM_W = 0.12
export const SOFA_ARM_TOP = 0.64
export const SOFA_ARM_BOTTOM = 0.2

// The upholstered back frame the back cushions lean on: its thickness and
// its top.
export const SOFA_BACK_T = 0.12
export const SOFA_BACK_TOP = 0.66

// The loose back cushions, one over each seat, standing on the seat and
// leaning back onto the frame so their top is at 89 cm: height, thickness
// and lean.
export const SOFA_CUSHION: [number, number, number] = [0.5, 0.2, 0.14]

// The small lumbar cushion in front of each back cushion: width at most,
// height, thickness and lean.
export const SOFA_LUMBAR: [number, number, number, number] = [0.55, 0.3, 0.12, 0.16]
