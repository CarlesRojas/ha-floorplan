import { roundedShape } from '#/geometry/polygon.ts'
import { surfaceRoughness, type SurfaceKind } from '#/materials/textures.ts'
import { useEased } from '#/scene/decor/ease.ts'
import { useFrame } from '@react-three/fiber'
import { useMemo, useRef, type ReactNode } from 'react'
import {
  CatmullRomCurve3,
  DoubleSide,
  ExtrudeGeometry,
  Quaternion,
  Shape,
  TubeGeometry,
  Object3D,
  Vector3,
  type Group,
  type InstancedMesh,
  type Mesh,
  type MeshBasicMaterial,
  type MeshStandardMaterial,
} from 'three'

// Building blocks shared by every decoration model. The vocabulary is
// Scandinavian: softly rounded boxes, tapered legs, plump cushions and thin
// panels, in pale wood and warm off whites.

export const SEG = 32

type Vec3 = [number, number, number]

// A rounded rectangle cut through a slab: its middle at `x`, `z` in the
// slab's own frame, `w` along x and `d` along z before it turns `turn`
// radians the way a piece turns on the plan, and `r` its corner radius.
export type Hole = { x: number; z: number; w: number; d: number; r: number; turn?: number }

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

// A rectangle `W` and `D` out from its middle, the back corners (+y, which
// is -z once stood up) rounded by `back` and the front ones by `front`, as
// true arcs, counter clockwise.
function arcShape(W: number, D: number, back: number, front: number) {
  const f = Math.max(0.001, Math.min(front, W, D))
  const r = Math.max(0.001, Math.min(back, W, D))
  const s = new Shape()
  s.moveTo(-W, D - r)
  s.lineTo(-W, -D + f)
  s.absarc(-W + f, -D + f, f, Math.PI, Math.PI * 1.5, false)
  s.lineTo(W - f, -D)
  s.absarc(W - f, -D + f, f, Math.PI * 1.5, Math.PI * 2, false)
  s.lineTo(W, D - r)
  s.absarc(W - r, D - r, r, 0, Math.PI / 2, false)
  s.lineTo(-W + r, D)
  s.absarc(-W + r, D - r, r, Math.PI / 2, Math.PI, false)
  return s
}

// A box with rounded vertical corners and a softened top and bottom edge.
// Width runs along x, depth along z, height along y.
export function Slab({
  size,
  radius = 0.04,
  bevel = 0.012,
  position = [0, 0, 0],
  rotation,
  holes,
  front,
  taper,
  children,
}: {
  size: Vec3
  radius?: number
  bevel?: number
  position?: Vec3
  rotation?: Vec3
  // How much smaller the bottom face is than the top, as a scale, the sides
  // leaning in toward it. It shrinks toward the middle across and toward
  // the back, so a piece against the wall stays against it.
  taper?: number
  // The radius of the two front corners, at +z, drawn as true arcs, when
  // they are rounder than the back ones. Half the width makes the front a
  // semicircle.
  front?: number
  // Openings cut all the way through, for a sink in a worktop.
  holes?: Hole[]
  children: ReactNode
}) {
  const [w, h, d] = size
  // The holes are made again every render, so their numbers are the key.
  const cut = holes?.map(o => [o.x, o.z, o.w, o.d, o.r, o.turn ?? 0].join(',')).join(';') ?? ''
  const geometry = useMemo(() => {
    const r = Math.min(radius, w / 2 - 0.001, d / 2 - 0.001)
    const b = Math.min(bevel, h / 2 - 0.001, r / 2)
    const shape =
      front === undefined
        ? roundedShape(
            [
              [-w / 2 + b, -d / 2 + b],
              [w / 2 - b, -d / 2 + b],
              [w / 2 - b, d / 2 - b],
              [-w / 2 + b, d / 2 - b],
            ],
            Math.max(r - b, 0.001),
          )
        : arcShape(w / 2 - b, d / 2 - b, Math.max(r - b, 0.001), front - b)
    // The bevel grows the solid into each hole too, so a hole is drawn that
    // much wider to come out its own size.
    for (const part of cut ? cut.split(';') : []) {
      const [x, z, hw, hd, hr, turn] = part.split(',').map(Number)
      const [cos, sin] = [Math.cos(turn), Math.sin(turn)]
      const at = (px: number, pz: number): [number, number] => [x + px * cos + pz * sin, -(z - px * sin + pz * cos)]
      const [ax, az] = [hw / 2 + b, hd / 2 + b]
      shape.holes.push(roundedShape([at(-ax, -az), at(-ax, az), at(ax, az), at(ax, -az)], Math.max(hr + b, 0.001)))
    }
    const geo = new ExtrudeGeometry(shape, {
      depth: Math.max(h - b * 2, 0.001),
      bevelEnabled: b > 0.002,
      bevelThickness: b,
      bevelSize: b,
      bevelSegments: 8,
      curveSegments: 24,
    })
    // The shape is drawn on XY and extruded along +z. Rotating -90 about x
    // turns that into +y spanning [-b, h - b], so lift it by b to sit on the
    // floor.
    geo.rotateX(-Math.PI / 2)
    geo.translate(0, b, 0)
    if (taper !== undefined && taper !== 1) {
      const p = geo.attributes.position
      const n = geo.attributes.normal
      const lean = (1 - taper) / h
      for (let i = 0; i < p.count; i++) {
        const [x, y, z] = [p.getX(i), p.getY(i), p.getZ(i)]
        const k = taper + (1 - taper) * Math.min(Math.max(y / h, 0), 1)
        p.setXYZ(i, x * k, y, -d / 2 + (z + d / 2) * k)
        // The sides lean in, so their normals tip down by how fast the side
        // moves out going up.
        const [nx, ny, nz] = [n.getX(i), n.getY(i), n.getZ(i)]
        const flat = Math.hypot(nx, nz)
        if (flat < 0.01) continue
        const out = lean * (x * nx + (z + d / 2) * nz)
        const v = new Vector3(nx, ny - out * flat, nz).normalize()
        n.setXYZ(i, v.x, v.y, v.z)
      }
    }
    return geo
  }, [w, h, d, radius, bevel, cut, front, taper])
  return (
    <mesh geometry={geometry} position={position} rotation={rotation} castShadow receiveShadow>
      {children}
    </mesh>
  )
}

// An open topped box with rounded corners: walls `wall` thick round a
// hollow, on a floor `floor` thick. A sink, a basin or a bath.
export function Hollow({
  size,
  wall,
  radius = 0.02,
  floor = wall,
  position = [0, 0, 0],
  taper,
  children,
}: {
  size: Vec3
  wall: number
  // The radius of the hollow's corners. The outside is `wall` rounder.
  radius?: number
  floor?: number
  position?: Vec3
  // How much smaller the bottom is than the top, as for a Slab.
  taper?: number
  children: ReactNode
}) {
  const [w, , d] = size
  const k = taper ?? 1
  return (
    <group position={position}>
      <Slab
        size={size}
        radius={radius + wall}
        bevel={Math.min(0.004, wall / 3)}
        holes={[{ x: 0, z: 0, w: w - wall * 2, d: d - wall * 2, r: radius }]}
        taper={taper}
      >
        {children}
      </Slab>
      <Slab
        size={[(w - wall) * k, floor, (d - wall) * k]}
        radius={(radius + wall / 2) * k}
        bevel={Math.min(0.003, floor / 3)}
        position={[0, 0, (-d / 2) * (1 - k)]}
      >
        {children}
      </Slab>
    </group>
  )
}

// A round tube along a smooth curve through the points given: a spout, a
// hose, a handle.
export function Tube({
  points,
  radius,
  segments = 48,
  children,
}: {
  points: Vec3[]
  radius: number
  segments?: number
  children: ReactNode
}) {
  // The points are made again every render, so their numbers are the key.
  const key = points.flat().join(',')
  const geometry = useMemo(() => {
    const at = key.split(',').map(Number)
    const curve = new CatmullRomCurve3(
      Array.from({ length: at.length / 3 }, (_, i) => new Vector3(at[i * 3], at[i * 3 + 1], at[i * 3 + 2])),
    )
    return new TubeGeometry(curve, segments, radius, 12, false)
  }, [key, radius, segments])
  return (
    <mesh geometry={geometry} castShadow>
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
      <cylinderGeometry args={[top, bottom, height, 16]} />
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
      <capsuleGeometry args={[radius, Math.max(length - radius * 2, 0.001), 8, 20]} />
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
      <cylinderGeometry args={[radius, radius * 0.8, radius * 1.2, 20]} />
      {children}
    </mesh>
  )
}

// A straight rod between two points, for cords and wires.
export function Rod({ from, to, r, children }: { from: Vector3; to: Vector3; r: number; children: ReactNode }) {
  const { mid, length, turn } = useMemo(() => {
    const dir = to.clone().sub(from)
    return {
      mid: from.clone().add(to).multiplyScalar(0.5),
      length: dir.length(),
      turn: new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), dir.normalize()),
    }
  }, [from, to])
  if (length < 0.001) return null
  return (
    <mesh position={mid} quaternion={turn}>
      <cylinderGeometry args={[r, r, length, 12]} />
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
      <sphereGeometry args={[radius, 16, 12]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2 * lit} />
    </mesh>
  )
}

/**
 * A faint pool of light round a small device's indicator, so its state
 * reads from across the room. It reaches a few tens of centimeters and
 * no further. It stays mounted at zero when off, since adding and
 * removing lights recompiles every material in the scene.
 */
export function Halo({
  on,
  position,
  color = '#8fd6a0',
  intensity = 0.05,
  distance = 0.45,
}: {
  on: boolean
  position: [number, number, number]
  color?: string
  intensity?: number
  distance?: number
}) {
  const lit = useEased(on ? 1 : 0, 9)
  return <pointLight position={position} color={color} intensity={intensity * lit} distance={distance} decay={1} />
}

/**
 * Puffs of steam or mist rising from a point while a thing runs: soft
 * spheres that swell, drift and fade as they climb, each on its own turn of
 * a shared loop. A negative `rise` sinks them, and `drift` carries them
 * sideways, for a draft of air out of a vent. They ease out when it stops, so the last puffs thin away
 * instead of vanishing.
 */
export function Steam({
  on,
  position,
  radius = 0.03,
  rise = 0.25,
  count = 5,
  strength = 0.3,
  speed = 0.45,
  drift = [0, 0],
  color = '#eef3f5',
}: {
  on: boolean
  position: [number, number, number]
  radius?: number
  rise?: number
  count?: number
  strength?: number
  speed?: number
  drift?: [number, number]
  color?: string
}) {
  const lit = useEased(on ? 1 : 0, 3)
  const puffs = useRef<(Mesh | null)[]>([])
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    puffs.current.forEach((puff, i) => {
      if (!puff) return
      const f = (t * speed + i / count) % 1
      const sway = radius * 0.7 * f
      puff.position.set(
        Math.sin(t * 1.3 + i * 2.1) * sway + drift[0] * f,
        f * rise,
        Math.cos(t * 1.1 + i * 1.7) * sway * 0.6 + drift[1] * f,
      )
      puff.scale.set(radius * (0.5 + f * 1.8), radius * (0.8 + f * 2.4), radius * (0.5 + f * 1.8))
      puff.visible = lit > 0.01
      ;(puff.material as MeshStandardMaterial).opacity = strength * lit * Math.sin(Math.PI * f) ** 1.5
    })
  })
  return (
    <group position={position}>
      {Array.from({ length: count }, (_, i) => (
        <mesh
          key={i}
          scale={radius * 0.5}
          visible={false}
          ref={el => {
            puffs.current[i] = el
          }}
        >
          <sphereGeometry args={[1, 14, 10]} />
          <meshStandardMaterial
            color={color}
            transparent
            opacity={0}
            depthWrite={false}
            roughness={1}
            emissive={color}
            emissiveIntensity={0.25}
          />
        </mesh>
      ))}
    </group>
  )
}

/**
 * Rings of sound spreading out from a speaker while it plays: thin bands
 * that grow from `from` to `from + reach` and fade as they go, each on its
 * own turn of a shared loop. They lie in the group's XY plane, so turn the
 * group to lay them flat round a body or stand them in front of a baffle,
 * and `stretch` pulls them into an oval for a long bar.
 */
export function Waves({
  on,
  position,
  rotation = [0, 0, 0],
  from,
  reach,
  count = 3,
  stretch = [1, 1],
  strength = 0.75,
  speed = 0.7,
  color = '#6aaeff',
}: {
  on: boolean
  position: [number, number, number]
  rotation?: [number, number, number]
  from: number
  reach: number
  count?: number
  stretch?: [number, number]
  strength?: number
  speed?: number
  color?: string
}) {
  const lit = useEased(on ? 1 : 0, 4)
  const rings = useRef<(Mesh | null)[]>([])
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    rings.current.forEach((ring, i) => {
      if (!ring) return
      const f = (t * speed + i / count) % 1
      const r = from + reach * f
      ring.scale.set(r * stretch[0], r * stretch[1], 1)
      ring.visible = lit > 0.01
      ;(ring.material as MeshBasicMaterial).opacity = strength * lit * (1 - f) * Math.min(1, f * 6)
    })
  })
  return (
    <group position={position} rotation={rotation}>
      {Array.from({ length: count }, (_, i) => (
        <mesh
          key={i}
          scale={from}
          visible={false}
          ref={el => {
            rings.current[i] = el
          }}
        >
          <ringGeometry args={[0.95, 1, 64]} />
          <meshBasicMaterial color={color} transparent opacity={0} depthWrite={false} side={DoubleSide} />
        </mesh>
      ))}
    </group>
  )
}

const LAID: [number, number, number] = [-Math.PI / 2, 0, 0]

/**
 * Water running from a tap: a thin clear column from the spout at
 * `position` down `length` to where it lands, trembling a little the way a
 * real stream does, with rings spreading from the spot it hits. It pours
 * down from the spout when it opens and draws back up into it when it
 * shuts, rather than blinking in and out.
 */
export function Stream({
  on,
  position,
  length,
  radius = 0.0065,
  color = '#a9d2ee',
}: {
  on: boolean
  position: [number, number, number]
  length: number
  radius?: number
  color?: string
}) {
  const lit = useEased(on ? 1 : 0, 6)
  const body = useRef<Mesh>(null)
  useFrame(({ clock }) => {
    const m = body.current
    if (!m) return
    const t = clock.elapsedTime
    const k = 1 + 0.16 * Math.sin(t * 41) + 0.08 * Math.sin(t * 67)
    m.scale.x = k
    m.scale.z = k
  })
  const run = Math.max(length * lit, 0.0001)
  return (
    <group position={position}>
      <mesh ref={body} position={[0, -run / 2, 0]} scale={[1, run, 1]} visible={lit > 0.01}>
        <cylinderGeometry args={[radius, radius * 0.8, 1, 12, 1, true]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.3}
          transparent
          opacity={0.75}
          roughness={0.05}
          metalness={0.1}
          depthWrite={false}
        />
      </mesh>
      <Waves
        on={on && lit > 0.9}
        position={[0, -length + 0.002, 0]}
        rotation={LAID}
        from={radius * 1.5}
        reach={radius * 9}
        strength={0.55}
        speed={1.3}
        color="#eef7fc"
      />
    </group>
  )
}

/**
 * A shower's rain: fine streaks falling from a round head of `radius` at
 * `position`, down `fall` to the tray, each on its own turn of a shared
 * loop so the fall looks steady rather than in waves. They thin out when
 * it is turned off, the last drops still on their way down.
 */
export function Rain({
  on,
  position,
  radius,
  fall,
  count = 70,
  color = '#8fc2e8',
}: {
  on: boolean
  position: [number, number, number]
  radius: number
  fall: number
  count?: number
  color?: string
}) {
  const lit = useEased(on ? 1 : 0, 4)
  const mesh = useRef<InstancedMesh>(null)
  // Where each drop falls from, spread evenly over the head's face on a
  // sunflower spiral, and where on the loop it starts.
  const drops = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const a = i * 2.39996
        const r = radius * 0.9 * Math.sqrt((i + 0.5) / count)
        // The phase is scattered by a hash, since one that followed the
        // spiral lined the drops up into a corkscrew.
        const phase = (((Math.sin(i * 12.9898) * 43758.5453) % 1) + 1) % 1
        return { x: Math.cos(a) * r, z: Math.sin(a) * r, phase }
      }),
    [count, radius],
  )
  const dummy = useMemo(() => new Object3D(), [])
  // Each drop hangs below its point, so none pokes up through the head.
  const len = Math.min(0.16, fall * 0.09)
  useFrame(({ clock }) => {
    const m = mesh.current
    if (!m) return
    const t = clock.elapsedTime
    drops.forEach((d, i) => {
      const f = (t * 1.6 + d.phase) % 1
      // They spread a touch as they fall, the way a rain head's jets do.
      const spread = 1 + f * 0.25
      dummy.position.set(d.x * spread, -len / 2 - f * (fall - len), d.z * spread)
      dummy.updateMatrix()
      m.setMatrixAt(i, dummy.matrix)
    })
    m.instanceMatrix.needsUpdate = true
    m.visible = lit > 0.01
    ;(m.material as MeshBasicMaterial).opacity = 0.8 * lit
  })
  return (
    <group position={position}>
      {/* Drawn before the other see through things, so shower glass in
          front of it, which writes depth, does not hide it. */}
      <instancedMesh
        ref={mesh}
        args={[undefined, undefined, count]}
        visible={false}
        frustumCulled={false}
        renderOrder={-1}
      >
        <boxGeometry args={[0.003, len, 0.003]} />
        <meshBasicMaterial color={color} transparent opacity={0} depthWrite={false} />
      </instancedMesh>
      <Waves
        on={on}
        position={[0, -fall + 0.002, 0]}
        rotation={LAID}
        from={radius * 0.3}
        reach={radius * 0.9}
        count={4}
        strength={0.35}
        speed={0.9}
        color="#eef7fc"
      />
    </group>
  )
}

// The water in a bath or a bowl, rising while the tap runs until it is
// `share` of the way from `floor` to `top`, and draining away once it is
// shut. `w`, `l` and `r` are the inside of the vessel.
export function Fill({
  on,
  floor,
  top,
  w,
  l,
  r,
  share,
  rate,
}: {
  on: boolean
  floor: number
  top: number
  w: number
  l: number
  r: number
  share: number
  rate: number
}) {
  const fill = useEased(on ? 1 : 0, rate)
  const depth = (top - floor) * share * fill
  if (depth < 0.003) return null
  return (
    <group position={[0, floor, 0]} scale={[1, depth, 1]}>
      <Slab size={[w - 0.004, 1, l - 0.004]} radius={Math.max(r - 0.002, 0.005)} bevel={0.001}>
        <meshStandardMaterial color="#8fc3dc" transparent opacity={0.45} roughness={0.05} depthWrite={false} />
      </Slab>
    </group>
  )
}
