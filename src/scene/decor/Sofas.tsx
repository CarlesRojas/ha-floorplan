import { Leg, SEG } from '#/scene/decor/parts.tsx'
import {
  SOFA_ARM_BOTTOM,
  SOFA_ARM_TOP,
  SOFA_ARM_W,
  SOFA_BACK_T,
  SOFA_BACK_TOP,
  SOFA_BASE_H,
  SOFA_CUSHION,
  SOFA_LEG_H,
  SOFA_LEG_INSET,
  SOFA_LEG_R,
  SOFA_LEG_SPLAY,
  SOFA_LUMBAR,
  SOFA_SEAT_H,
  SOFA_SEAT_MIN,
} from '#/scene/decor/sofaSpecs.ts'
import { useMemo, type ReactNode } from 'react'
import { SphereGeometry } from 'three'
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

// The sofa, after Pilma's Dresde, and the pouf made from its base. Both are
// upholstered all over, so every part is a soft block: a box with its edges
// rounded off and its faces a little full, the way a filled cover sits.

type Vec3 = [number, number, number]
type Slot = (slot: string) => ReactNode

// A box `size` across whose edges round off by `round` along each axis,
// and whose faces swell out by `puff` along each axis in their middle. It is
// a sphere pushed out to the box, so every rounded edge comes in as many
// steps as a quarter of the sphere has.
function softBox([w, h, d]: Vec3, [rx, ry, rz]: Vec3, [px, py, pz]: Vec3) {
  const sphere = new SphereGeometry(1, SEG * 4, SEG * 2)
  sphere.deleteAttribute('uv')
  sphere.deleteAttribute('normal')
  const geometry = mergeVertices(sphere)
  sphere.dispose()
  const pos = geometry.attributes.position
  const [hx, hy, hz] = [w / 2, h / 2, d / 2]
  const [cx, cy, cz] = [Math.max(hx - rx, 0), Math.max(hy - ry, 0), Math.max(hz - rz, 0)]
  // Which side of the middle a point is on. The sphere's own seams fall on
  // the middle, and those stay there, in the middle of a flat face.
  const side = (v: number) => (Math.abs(v) < 1e-6 ? 0 : Math.sign(v))
  for (let i = 0; i < pos.count; i++) {
    const [nx, ny, nz] = [pos.getX(i), pos.getY(i), pos.getZ(i)]
    let x = side(nx) * cx + rx * nx
    let y = side(ny) * cy + ry * ny
    let z = side(nz) * cz + rz * nz
    const [u, v, t] = [x / hx, y / hy, z / hz]
    x += nx * px * (1 - v * v) * (1 - t * t)
    y += ny * py * (1 - u * u) * (1 - t * t)
    z += nz * pz * (1 - u * u) * (1 - v * v)
    pos.setXYZ(i, x, y, z)
  }
  geometry.computeVertexNormals()
  return geometry
}

function Soft({
  size,
  round,
  puff = [0, 0, 0],
  position,
  children,
}: {
  size: Vec3
  round: Vec3
  puff?: Vec3
  position: Vec3
  children: ReactNode
}) {
  const key = [...size, ...round, ...puff].join()
  // oxlint-disable-next-line react-hooks/exhaustive-deps -- the key is the sizes
  const geometry = useMemo(() => softBox(size, round, puff), [key])
  return (
    <mesh geometry={geometry} position={position} castShadow receiveShadow>
      {children}
    </mesh>
  )
}

type LegAt = { x: number; z: number; out: [number, number] }

function SofaLegs({ legs, height, M }: { legs: LegAt[]; height: number; M: Slot }) {
  return (
    <>
      {legs.map(({ x, z, out }) => (
        <Leg
          key={`${x}:${z}`}
          height={height}
          top={SOFA_LEG_R[0]}
          bottom={SOFA_LEG_R[1]}
          position={[x, 0, z]}
          lean={[-out[1] * SOFA_LEG_SPLAY, out[0] * SOFA_LEG_SPLAY]}
        >
          {M('legs')}
        </Leg>
      ))}
    </>
  )
}

// How many seats a sofa of this width between its arms has: as many as fit
// at their narrowest, so each one stretches until the next one fits.
function sofaSeats(inner: number, fewest = 1) {
  return Math.max(fewest, Math.floor(inner / SOFA_SEAT_MIN + 1e-6))
}

// The sofa, `w` wide and `d` deep. With a chaise, the seat at the right end,
// or the left when flipped, runs forward to `reach` from the back, and the
// sofa's middle is the middle of that whole footprint.
export function Sofa({
  w,
  d,
  reach,
  chaise,
  flip,
  M,
}: {
  w: number
  d: number
  reach: number
  chaise: boolean
  flip: boolean
  M: Slot
}) {
  const total = chaise ? Math.max(reach, d + 0.3) : d
  const back = -total / 2
  const front = back + d
  const inner = w - SOFA_ARM_W * 2
  const seats = sofaSeats(inner, chaise ? 2 : 1)
  const seatW = inner / seats
  const seatX = (i: number) => -inner / 2 + seatW * (i + 0.5)
  const long = chaise ? (flip ? 0 : seats - 1) : -1
  const side = flip ? -1 : 1
  const seatY = SOFA_LEG_H + SOFA_BASE_H
  const seatBack = back + SOFA_BACK_T
  const [cushionH, cushionT, cushionLean] = SOFA_CUSHION
  const [lumbarW, lumbarH, lumbarT, lumbarLean] = SOFA_LUMBAR
  const settle = 0.03

  // The legs: at the ends of the back and front, under the chaise's front
  // and where it leaves the sofa, and down the middle of a long one.
  const edge = w / 2 - SOFA_LEG_INSET
  const legs: LegAt[] = [-1, 1].map(s => ({ x: s * edge, z: back + SOFA_LEG_INSET, out: [s, -1] }))
  if (chaise) {
    const joint = side * (inner / 2 - seatW)
    legs.push(
      { x: -side * edge, z: front - SOFA_LEG_INSET, out: [-side, 1] },
      { x: joint, z: front - SOFA_LEG_INSET, out: [0, 1] },
      { x: joint, z: back + total - SOFA_LEG_INSET, out: [0, 1] },
      { x: side * edge, z: back + total - SOFA_LEG_INSET, out: [side, 1] },
    )
  } else {
    legs.push(...[-1, 1].map(s => ({ x: s * edge, z: front - SOFA_LEG_INSET, out: [s, 1] as [number, number] })))
  }
  if (w > 2.4) legs.push({ x: 0, z: back + SOFA_LEG_INSET, out: [0, -1] })
  if (w > 2.4 && !chaise) legs.push({ x: 0, z: front - SOFA_LEG_INSET, out: [0, 1] })

  return (
    <group>
      <SofaLegs legs={legs} height={SOFA_LEG_H} M={M} />
      {/* The base the cushions sit on, and its run out under the chaise. */}
      <Soft
        size={[inner + 0.02, SOFA_BASE_H, d - 0.02]}
        round={[0.02, 0.03, 0.03]}
        position={[0, SOFA_LEG_H + SOFA_BASE_H / 2, back + d / 2]}
      >
        {M('upholstery')}
      </Soft>
      {chaise && (
        <Soft
          size={[seatW, SOFA_BASE_H, total - d + 0.04]}
          round={[0.02, 0.03, 0.03]}
          position={[seatX(long), SOFA_LEG_H + SOFA_BASE_H / 2, (front + back + total) / 2 - 0.02]}
        >
          {M('upholstery')}
        </Soft>
      )}
      {/* The back frame, from the base up behind the back cushions. */}
      <Soft
        size={[inner + 0.02, SOFA_BACK_TOP - SOFA_LEG_H, SOFA_BACK_T]}
        round={[0.03, 0.04, 0.05]}
        puff={[0, 0, 0.01]}
        position={[0, (SOFA_BACK_TOP + SOFA_LEG_H) / 2, back + SOFA_BACK_T / 2]}
      >
        {M('upholstery')}
      </Soft>
      {/* The arms, thin padded panels the whole depth of the sofa. */}
      {[-1, 1].map(s => (
        <Soft
          key={s}
          size={[SOFA_ARM_W, SOFA_ARM_TOP - SOFA_ARM_BOTTOM, d]}
          round={[0.055, 0.1, 0.14]}
          puff={[0.018, 0.01, 0]}
          position={[(s * (w - SOFA_ARM_W)) / 2, (SOFA_ARM_TOP + SOFA_ARM_BOTTOM) / 2, back + d / 2]}
        >
          {M('upholstery')}
        </Soft>
      ))}
      {Array.from({ length: seats }, (_, i) => {
        const to = i === long ? back + total : front
        return (
          <group key={i}>
            <Soft
              size={[seatW - 0.012, SOFA_SEAT_H, to - seatBack]}
              round={[0.06, 0.07, 0.06]}
              puff={[0, 0.012, 0]}
              position={[seatX(i), seatY + SOFA_SEAT_H / 2, (seatBack + to) / 2]}
            >
              {M('cushions')}
            </Soft>
            {/* The back cushion stands on the back of the seat and leans on
                the frame, and the lumbar cushion leans on it. */}
            <group
              position={[seatX(i), seatY + SOFA_SEAT_H - settle, seatBack + cushionT]}
              rotation={[-cushionLean, 0, 0]}
            >
              <Soft
                size={[seatW - 0.02, cushionH, cushionT]}
                round={[0.07, 0.07, 0.07]}
                puff={[0, 0, 0.02]}
                position={[0, cushionH / 2, -cushionT / 2]}
              >
                {M('cushions')}
              </Soft>
            </group>
            <group
              position={[seatX(i), seatY + SOFA_SEAT_H - settle, seatBack + cushionT + lumbarT]}
              rotation={[-lumbarLean, 0, 0]}
            >
              <Soft
                size={[Math.min(lumbarW, seatW * 0.62), lumbarH, lumbarT]}
                round={[0.05, 0.06, 0.05]}
                puff={[0, 0, 0.03]}
                position={[0, lumbarH / 2, -lumbarT / 2]}
              >
                {M('cushions')}
              </Soft>
            </group>
          </group>
        )
      })}
    </group>
  )
}

// The pouf: the sofa's base alone, square, with no arms, back or loose
// cushions, as one upholstered block on the sofa's legs.
export function Pouf({ size, h, M }: { size: number; h: number; M: Slot }) {
  const legH = Math.min(SOFA_LEG_H, h * 0.45)
  const edge = size / 2 - SOFA_LEG_INSET * 0.8
  const legs: LegAt[] = [-1, 1].flatMap(sx =>
    [-1, 1].map(sz => ({ x: sx * edge, z: sz * edge, out: [sx, sz] as [number, number] })),
  )
  const blockH = h - legH
  return (
    <group>
      <SofaLegs legs={legs} height={legH} M={M} />
      <Soft
        size={[size, blockH, size]}
        round={[0.05, Math.min(0.06, blockH / 3), 0.05]}
        puff={[0.006, 0.01, 0.006]}
        position={[0, legH + blockH / 2, 0]}
      >
        {M('cover')}
      </Soft>
    </group>
  )
}
