import { roundedShape } from '#/geometry/polygon.ts'
import type { SurfaceKind } from '#/materials/textures.ts'
import SurfaceMaterial from '#/scene/SurfaceMaterial.tsx'
import { useMemo, type ReactNode } from 'react'
import { ExtrudeGeometry } from 'three'

// Building blocks shared by every decoration model. The vocabulary is
// Scandinavian: softly rounded boxes, tapered legs, plump cushions and thin
// panels, in pale wood and warm off whites.

export const SEG = 16

type Vec3 = [number, number, number]

export function Material({
  color,
  material = 'matte',
  emissive,
  emissiveIntensity = 0,
  doubleSide = false,
  repeat,
  span,
}: {
  color: string
  material?: string
  emissive?: [number, number, number]
  emissiveIntensity?: number
  doubleSide?: boolean
  repeat?: number
  span?: number
}) {
  return (
    <SurfaceMaterial
      kind={material as SurfaceKind}
      color={color}
      repeat={repeat}
      span={span}
      doubleSide={doubleSide}
      emissive={emissive}
      emissiveIntensity={emissiveIntensity}
    />
  )
}

// A box with rounded vertical corners and a softened top and bottom edge.
// Width runs along x, depth along z, height along y.
export function Slab({
  size,
  radius = 0.04,
  bevel = 0.012,
  position = [0, 0, 0],
  rotation,
  children,
}: {
  size: Vec3
  radius?: number
  bevel?: number
  position?: Vec3
  rotation?: Vec3
  children: ReactNode
}) {
  const [w, h, d] = size
  const geometry = useMemo(() => {
    const r = Math.min(radius, w / 2 - 0.001, d / 2 - 0.001)
    const b = Math.min(bevel, h / 2 - 0.001, r / 2)
    const shape = roundedShape(
      [
        [-w / 2 + b, -d / 2 + b],
        [w / 2 - b, -d / 2 + b],
        [w / 2 - b, d / 2 - b],
        [-w / 2 + b, d / 2 - b],
      ],
      Math.max(r - b, 0.001),
    )
    const geo = new ExtrudeGeometry(shape, {
      depth: Math.max(h - b * 2, 0.001),
      bevelEnabled: b > 0.002,
      bevelThickness: b,
      bevelSize: b,
      bevelSegments: 2,
      curveSegments: 6,
    })
    // The shape is drawn on XY and extruded along +z. Rotating -90 about x
    // turns that into +y spanning [-b, h - b], so lift it by b to sit on the
    // floor.
    geo.rotateX(-Math.PI / 2)
    geo.translate(0, b, 0)
    return geo
  }, [w, h, d, radius, bevel])
  return (
    <mesh geometry={geometry} position={position} rotation={rotation} castShadow receiveShadow>
      {children}
    </mesh>
  )
}

// A leg that tapers toward the floor, the signature of the style.
export function Leg({
  height,
  top = 0.03,
  bottom = 0.02,
  position = [0, 0, 0],
  tilt = 0,
  children,
}: {
  height: number
  top?: number
  bottom?: number
  position?: Vec3
  tilt?: number
  children: ReactNode
}) {
  return (
    <mesh position={[position[0], position[1] + height / 2, position[2]]} rotation={[tilt, 0, tilt]} castShadow>
      <cylinderGeometry args={[top, bottom, height, 8]} />
      {children}
    </mesh>
  )
}

// Four tapered legs inset from the corners of a footprint.
export function Legs({
  width,
  depth,
  height,
  inset = 0.08,
  top = 0.03,
  bottom = 0.02,
  children,
}: {
  width: number
  depth: number
  height: number
  inset?: number
  top?: number
  bottom?: number
  children: ReactNode
}) {
  const x = width / 2 - inset
  const z = depth / 2 - inset
  return (
    <>
      {[
        [-x, 0, -z],
        [x, 0, -z],
        [-x, 0, z],
        [x, 0, z],
      ].map((p, i) => (
        <Leg key={i} height={height} top={top} bottom={bottom} position={p as Vec3}>
          {children}
        </Leg>
      ))}
    </>
  )
}

// A plump cushion: a box with generous corner and edge rounding, which
// reads as upholstery where a sphere reads as a pebble.
export function Cushion({
  size,
  position = [0, 0, 0],
  rotation,
  children,
}: {
  size: Vec3
  position?: Vec3
  rotation?: Vec3
  children: ReactNode
}) {
  const [w, h, d] = size
  return (
    <Slab
      size={size}
      radius={Math.min(w, d) * 0.16}
      bevel={Math.min(h * 0.3, Math.min(w, d) * 0.07)}
      position={position}
      rotation={rotation}
    >
      {children}
    </Slab>
  )
}

// A squashed sphere, the soft volume used for shades, pots and pebbles.
export function Blob({
  radius,
  squash = 1,
  position = [0, 0, 0],
  children,
}: {
  radius: number
  squash?: number
  position?: Vec3
  children: ReactNode
}) {
  return (
    <mesh position={position} scale={[1, squash, 1]} castShadow>
      <sphereGeometry args={[radius, SEG, SEG]} />
      {children}
    </mesh>
  )
}

// The top of a sphere, open underneath: a dome shade or a bowl.
export function Dome({
  radius,
  position = [0, 0, 0],
  rotation,
  sweep = 0.55,
  children,
}: {
  radius: number
  position?: Vec3
  rotation?: Vec3
  sweep?: number
  children: ReactNode
}) {
  return (
    <mesh position={position} rotation={rotation} castShadow>
      <sphereGeometry args={[radius, SEG, SEG, 0, Math.PI * 2, 0, Math.PI * sweep]} />
      {children}
    </mesh>
  )
}

// A rounded bar, used for rails, handles and stems.
export function Bar({
  length,
  radius,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  children,
}: {
  length: number
  radius: number
  position?: Vec3
  rotation?: Vec3
  children: ReactNode
}) {
  return (
    <mesh position={position} rotation={rotation} castShadow>
      <capsuleGeometry args={[radius, Math.max(length - radius * 2, 0.001), 4, 10]} />
      {children}
    </mesh>
  )
}

// A thin flat panel: a door front, a shelf board, a picture.
export function Panel({
  size,
  position = [0, 0, 0],
  rotation,
  radius = 0.02,
  children,
}: {
  size: Vec3
  position?: Vec3
  rotation?: Vec3
  radius?: number
  children: ReactNode
}) {
  return (
    <Slab size={size} radius={radius} bevel={0.006} position={position} rotation={rotation}>
      {children}
    </Slab>
  )
}

// A round knob or pull, the small brass or oak detail on fronts.
export function Knob({
  radius = 0.02,
  position = [0, 0, 0],
  children,
}: {
  radius?: number
  position?: Vec3
  children: ReactNode
}) {
  return (
    <mesh position={position} rotation={[Math.PI / 2, 0, 0]}>
      <cylinderGeometry args={[radius, radius * 0.8, radius * 1.2, 10]} />
      {children}
    </mesh>
  )
}
