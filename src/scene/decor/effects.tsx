import { useEased } from '#/scene/decor/ease.ts'
import { scatter } from '#/scene/decor/scatter.ts'
import { useFrame } from '@react-three/fiber'
import { useLayoutEffect, useMemo, useRef, type ReactNode } from 'react'
import {
  AdditiveBlending,
  Color,
  Object3D,
  type Group,
  type InstancedMesh,
  type Mesh,
  type MeshBasicMaterial,
} from 'three'

// The moving parts of the pieces that show their state with something
// alive: flames, bulbs, spray, bubbles and drops. Each eases in and out with
// the switch, and is left mounted and hidden while off, so nothing is built
// again when it turns on.

type Vec3 = [number, number, number]

/**
 * A row of flames along x, `width` wide and up to `height` tall, each a
 * tongue of orange with a yellow core that flickers on its own beat. They
 * add their light to what is behind them, so they glow against a dark
 * firebox, and they sink away when the fire is turned off.
 */
export function Flames({
  on,
  width,
  height,
  count,
  position = [0, 0, 0],
  outer = '#ff6a1a',
  inner = '#ffd36b',
}: {
  on: boolean
  width: number
  height: number
  count: number
  position?: Vec3
  outer?: string
  inner?: string
}) {
  const lit = useEased(on ? 1 : 0, 1.8)
  const tongues = useRef<(Mesh | null)[]>([])
  const step = width / count
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    tongues.current.forEach((m, j) => {
      if (!m) return
      const i = j >> 1
      const core = j % 2 === 1
      const beat = 0.72 + 0.2 * Math.sin(t * (6 + scatter(i) * 4) + i * 1.7) + 0.1 * Math.sin(t * 13.3 + i * 3.1)
      const tall = height * beat * lit * (0.65 + 0.35 * scatter(i, 1)) * (core ? 0.55 : 1)
      const r = step * (core ? 0.28 : 0.55)
      m.visible = lit > 0.01
      m.scale.set(r, Math.max(tall, 0.001), r * 0.6)
      m.position.set(-width / 2 + step * (i + 0.5) + Math.sin(t * 5 + i) * step * 0.08, tall / 2, core ? 0.004 : 0)
    })
  })
  return (
    <group position={position}>
      {Array.from({ length: count * 2 }, (_, j) => (
        <mesh
          key={j}
          visible={false}
          ref={el => {
            tongues.current[j] = el
          }}
        >
          <coneGeometry args={[1, 1, 10, 1, true]} />
          <meshBasicMaterial
            color={j % 2 === 1 ? inner : outer}
            transparent
            opacity={j % 2 === 1 ? 0.9 : 0.75}
            blending={AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  )
}

/**
 * A string of warm white fairy lights at `points` that runs through the
 * patterns a light string's controller does, a few seconds each: all on,
 * a random blink, bands climbing the string by height, and every other
 * bulb in turn. Off, the bulbs sit dim and grey.
 */
export function FairyLights({
  on,
  points,
  radius = 0.01,
  color = '#ffc978',
}: {
  on: boolean
  points: Vec3[]
  radius?: number
  color?: string
}) {
  const lit = useEased(on ? 1 : 0, 4)
  const mesh = useRef<InstancedMesh>(null)
  const level = useRef<number[]>([])
  const warm = useMemo(() => new Color(color), [color])
  const dim = useMemo(() => new Color('#4a4844'), [])
  const shade = useMemo(() => new Color(), [])
  useLayoutEffect(() => {
    const m = mesh.current
    if (!m) return
    const dummy = new Object3D()
    points.forEach((at, i) => {
      dummy.position.set(...at)
      dummy.updateMatrix()
      m.setMatrixAt(i, dummy.matrix)
    })
    m.instanceMatrix.needsUpdate = true
  }, [points])
  useFrame(({ clock }, delta) => {
    const m = mesh.current
    if (!m) return
    const t = clock.elapsedTime
    const pattern = Math.floor(t / 7) % 4
    points.forEach(([, y], i) => {
      let want = 1
      if (pattern === 1) want = scatter(i + Math.floor(t * 2.5 + scatter(i, 42)) * 997, 41) > 0.45 ? 1 : 0
      else if (pattern === 2) want = Math.sin(t * 3 - y * 7) > 0 ? 1 : 0
      else if (pattern === 3) want = (i + Math.floor(t * 1.6)) % 2
      const now = level.current[i] ?? 0
      level.current[i] = now + (want - now) * Math.min(1, delta * 14)
      m.setColorAt(i, shade.lerpColors(dim, warm, lit * level.current[i]))
    })
    if (m.instanceColor) m.instanceColor.needsUpdate = true
  })
  return (
    <instancedMesh key={points.length} ref={mesh} args={[undefined, undefined, points.length]} frustumCulled={false}>
      <sphereGeometry args={[radius, 8, 6]} />
      <meshBasicMaterial toneMapped={false} />
    </instancedMesh>
  )
}

/**
 * Water thrown from `lanes` along x, each jet arcing out toward +z to land
 * `reach` away after climbing `apex` above where it left. The droplets fan
 * out across by `spread` as they fly. Turn the group it sits in to aim it.
 */
export function Spray({
  on,
  reach,
  apex,
  lanes = [0],
  spread = 0.1,
  from = 0,
  count = 40,
  speed = 0.9,
  color = '#b9dcf2',
  size = 0.009,
  fan = 0,
}: {
  on: boolean
  reach: number
  apex: number
  lanes?: number[]
  // How much wider the lanes stand apart where the water lands than where
  // it leaves: 1 lands them twice as far apart.
  fan?: number
  spread?: number
  // How high above the ground the water leaves.
  from?: number
  count?: number
  speed?: number
  color?: string
  // The radius of a drop.
  size?: number
}) {
  const lit = useEased(on ? 1 : 0, 3)
  const mesh = useRef<InstancedMesh>(null)
  const total = count * lanes.length
  const dummy = useMemo(() => new Object3D(), [])
  useFrame(({ clock }) => {
    const m = mesh.current
    if (!m) return
    const t = clock.elapsedTime
    for (let i = 0; i < total; i++) {
      const f = (t * speed + scatter(i, 4)) % 1
      const far = reach * (0.75 + 0.25 * scatter(i, 5))
      dummy.position.set(
        lanes[i % lanes.length] * (1 + fan * f) + (scatter(i, 6) - 0.5) * spread * 2 * f,
        from * (1 - f) + 4 * apex * f * (1 - f),
        far * f,
      )
      dummy.updateMatrix()
      m.setMatrixAt(i, dummy.matrix)
    }
    m.instanceMatrix.needsUpdate = true
    m.visible = lit > 0.01
    ;(m.material as MeshBasicMaterial).opacity = 0.75 * lit
  })
  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, total]} visible={false} frustumCulled={false}>
      <sphereGeometry args={[size, 6, 4]} />
      <meshBasicMaterial color={color} transparent opacity={0} depthWrite={false} />
    </instancedMesh>
  )
}

/**
 * Bubbles rising through a box `w` by `d` from its floor to `h`, wobbling as
 * they go, from anywhere in it or, with `at`, from a few spots on its floor.
 */
export function Bubbles({
  on,
  w,
  d,
  h,
  count = 30,
  radius = 0.006,
  speed = 0.5,
  at,
  position = [0, 0, 0],
  color = '#f2fbff',
}: {
  on: boolean
  w: number
  d: number
  h: number
  count?: number
  radius?: number
  speed?: number
  at?: [number, number][]
  position?: Vec3
  color?: string
}) {
  const lit = useEased(on ? 1 : 0, 3)
  const mesh = useRef<InstancedMesh>(null)
  const dummy = useMemo(() => new Object3D(), [])
  useFrame(({ clock }) => {
    const m = mesh.current
    if (!m) return
    const t = clock.elapsedTime
    for (let i = 0; i < count; i++) {
      const f = (t * speed * (0.7 + scatter(i, 7) * 0.6) + scatter(i, 8)) % 1
      const spot = at?.[i % at.length]
      const x = spot ? spot[0] : (scatter(i, 9) - 0.5) * w
      const z = spot ? spot[1] : (scatter(i, 10) - 0.5) * d
      const wobble = Math.sin(t * 6 + i) * radius
      dummy.position.set(x + wobble, f * h, z + wobble * 0.6)
      dummy.scale.setScalar(0.6 + f * 0.8)
      dummy.updateMatrix()
      m.setMatrixAt(i, dummy.matrix)
    }
    m.instanceMatrix.needsUpdate = true
    m.visible = lit > 0.01
    ;(m.material as MeshBasicMaterial).opacity = 0.7 * lit
  })
  return (
    <group position={position}>
      <instancedMesh ref={mesh} args={[undefined, undefined, count]} visible={false} frustumCulled={false}>
        <sphereGeometry args={[radius, 8, 6]} />
        <meshBasicMaterial color={color} transparent opacity={0} depthWrite={false} />
      </instancedMesh>
    </group>
  )
}

/**
 * Small things falling from each of `points` down `fall`, a few on their
 * way at once: drips from an irrigation line, kibble from a feeder's chute.
 */
export function Falling({
  on,
  points,
  fall,
  size = [0.006, 0.014, 0.006],
  per = 3,
  speed = 0.8,
  color = '#a9d2ee',
  opacity = 0.85,
}: {
  on: boolean
  points: Vec3[]
  fall: number
  size?: Vec3
  per?: number
  speed?: number
  color?: string
  opacity?: number
}) {
  const lit = useEased(on ? 1 : 0, 4)
  const mesh = useRef<InstancedMesh>(null)
  const total = points.length * per
  const dummy = useMemo(() => new Object3D(), [])
  useFrame(({ clock }) => {
    const m = mesh.current
    if (!m) return
    const t = clock.elapsedTime
    for (let i = 0; i < total; i++) {
      const p = points[i % points.length]
      const f = (t * speed + scatter(i, 11) + Math.floor(i / points.length) / per) % 1
      // Falling faster as it goes, the way a drop does.
      dummy.position.set(p[0], p[1] - f * f * fall, p[2])
      dummy.rotation.set(scatter(i, 12) * 3, scatter(i, 13) * 3, 0)
      dummy.updateMatrix()
      m.setMatrixAt(i, dummy.matrix)
    }
    m.instanceMatrix.needsUpdate = true
    m.visible = lit > 0.01
    ;(m.material as MeshBasicMaterial).opacity = opacity * lit
  })
  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, total]} visible={false} frustumCulled={false}>
      <boxGeometry args={size} />
      <meshBasicMaterial color={color} transparent opacity={0} depthWrite={false} />
    </instancedMesh>
  )
}

/**
 * Turns what it holds about `axis` while `on`: all the way round, or with
 * `arc` back and forth through that many radians in all.
 */
export function Sweep({
  on,
  arc,
  speed = 0.6,
  axis = 'y',
  children,
}: {
  on: boolean
  arc?: number
  speed?: number
  axis?: 'x' | 'y'
  children: ReactNode
}) {
  const ref = useRef<Group>(null)
  const clock = useRef(0)
  useFrame((_, delta) => {
    const g = ref.current
    if (!g || !on) return
    clock.current += Math.min(delta, 0.1) * speed
    const angle = arc === undefined ? clock.current : Math.sin(clock.current) * (arc / 2)
    g.rotation[axis] = angle
  })
  return <group ref={ref}>{children}</group>
}
