import { roundedShape } from '#/geometry/polygon.ts'
import { surfaceRoughness, type SurfaceKind } from '#/materials/textures.ts'
import { useEased } from '#/scene/decor/ease.ts'
import { useFrame } from '@react-three/fiber'
import { useMemo, useRef, type ReactNode } from 'react'
import { DoubleSide, ExtrudeGeometry, type Group } from 'three'

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
  opacity = 1,
}: {
  color: string
  material?: string
  emissive?: [number, number, number]
  emissiveIntensity?: number
  doubleSide?: boolean
  // Under one for a lamp shade, which light comes through.
  opacity?: number
}) {
  // Plain paint. Decorations carry no pattern: the surface only decides how
  // matte or how polished the part is, and the color does the rest. Floors
  // are the only thing in the room with a texture on it.
  return (
    <meshStandardMaterial
      color={color}
      roughness={surfaceRoughness(material as SurfaceKind)}
      side={doubleSide ? DoubleSide : undefined}
      transparent={opacity < 1}
      opacity={opacity}
      emissive={emissive ?? [0, 0, 0]}
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
  lean,
  children,
}: {
  height: number
  top?: number
  bottom?: number
  position?: Vec3
  tilt?: number
  // Tilt about x and z separately, for a leg that splays out at the foot.
  lean?: [number, number]
  children: ReactNode
}) {
  const [rx, rz] = lean ?? [tilt, tilt]
  return (
    <mesh position={[position[0], position[1] + height / 2, position[2]]} rotation={[rx, 0, rz]} castShadow>
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
  // A long piece grows a middle pair rather than sagging between two.
  columns = 2,
  // How far the foot swings out from under the frame, in radians.
  splay = 0,
  children,
}: {
  width: number
  depth: number
  height: number
  inset?: number
  top?: number
  bottom?: number
  columns?: number
  splay?: number
  children: ReactNode
}) {
  const x = width / 2 - inset
  const z = depth / 2 - inset
  const cols = Math.max(2, Math.round(columns))
  const at = Array.from({ length: cols }, (_, i) => -x + ((2 * x) / (cols - 1)) * i)
  return (
    <>
      {at.flatMap(px =>
        [-z, z].map(pz => (
          <Leg
            key={`${px}:${pz}`}
            height={height}
            top={top}
            bottom={bottom}
            position={[px, 0, pz]}
            lean={[-Math.sign(pz) * splay, Math.sign(px) * splay]}
          >
            {children}
          </Leg>
        )),
      )}
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

// Clear glass, for windows and glazed doors. Never tinted by a surface
// texture: glass is glass.
export function Glass({ color, opacity = 0.22 }: { color: string; opacity?: number }) {
  return (
    <meshPhysicalMaterial
      color={color}
      transparent
      opacity={opacity}
      roughness={0.05}
      metalness={0}
      side={DoubleSide}
    />
  )
}

// Blades that spin while the device runs, faster at a higher level.
export function Spinner({ speed, children }: { speed: number; children: ReactNode }) {
  const ref = useRef<Group>(null)
  useFrame((_, delta) => {
    if (ref.current && speed > 0) ref.current.rotation.y += delta * speed
  })
  return <group ref={ref}>{children}</group>
}

// The small status light a device shows while it is running.
export function Led({
  on,
  position,
  color = '#8fd6a0',
  radius = 0.012,
}: {
  on: boolean
  position: [number, number, number]
  color?: string
  radius?: number
}) {
  const lit = useEased(on ? 1 : 0, 11)
  return (
    <mesh position={position}>
      <sphereGeometry args={[radius, 8, 6]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2 * lit} />
    </mesh>
  )
}
