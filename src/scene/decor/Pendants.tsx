import { BaseMaterial, ShadeMaterial, type LightState } from '#/scene/decor/lightMaterials.tsx'
import { Material, SEG } from '#/scene/decor/parts.tsx'
import {
  CAPSULE_CANOPY,
  CAPSULE_FINS,
  CAPSULE_H,
  CAPSULE_R,
  CIRIO_H,
  CIRIO_R,
  CIRIO_WALL,
  GLOBO_A,
  GLOBO_CANOPY,
  GLOBO_CAP_H,
  GLOBO_CAP_R,
  GLOBO_GRIP_H,
  GLOBO_N,
  GLOBO_NECK_H,
  GLOBO_NECK_R,
  GLOBO_TOTAL_H,
  GLOBO_WIRE_X,
  HEADHAT_H,
  HEADHAT_R,
  HEADHAT_SHOULDER,
  HEADHAT_TOP_R,
  HEADHAT_WALL,
  LED_CABLE_R,
  NAGOYA_H,
  NAGOYA_R,
  NAGOYA_SLATS,
  NAGOYA_THREADS,
  STEEL_WIRE_R,
  TEXTILE_CORD_R,
} from '#/scene/decor/pendantSpecs.ts'
import { CEILING_HEIGHT_M } from '#/theme.ts'
import { useLayoutEffect, useMemo, useRef, type ReactNode } from 'react'
import { CatmullRomCurve3, InstancedMesh, Matrix4, Quaternion, Vector2, Vector3 } from 'three'

// The pendant styles, each one a Santa & Cole lamp drawn from its technical
// drawing. Every part is in real meters, measured down from the top of the
// lamp, so the numbers here can be checked against the drawings. The size
// slider scales the lamp itself; the canopy and the cord stay their real
// size, since a bigger shade does not come with a thicker cable.

type ModelProps = {
  // How much bigger than the real lamp this one is drawn.
  k: number
  // The height of the top of the lamp, where the cord ends.
  top: number
  c: (slot: string) => string
  m: (slot: string) => string
  state: LightState | null
}

// A straight rod between two points, for cords and wires.
function Rod({ from, to, r, children }: { from: Vector3; to: Vector3; r: number; children: ReactNode }) {
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

// The cord straight up from the lamp to the canopy.
function Cord({ from, to, r, c, m }: { from: number; to: number; r: number; c: string; m: string }) {
  const [a, b] = useMemo(() => [new Vector3(0, from, 0), new Vector3(0, to, 0)], [from, to])
  return (
    <Rod from={a} to={b} r={r}>
      <BaseMaterial color={c} material={m} />
    </Rod>
  )
}

// A round surface canopy on the ceiling, the black one all three capsule and
// glass lamps come with.
function Canopy({ diameter, height, c, m }: { diameter: number; height: number; c: string; m: string }) {
  return (
    <mesh position={[0, CEILING_HEIGHT_M - height / 2, 0]}>
      <cylinderGeometry args={[diameter / 2, diameter / 2, height, SEG * 2]} />
      <BaseMaterial color={c} material={m} />
    </mesh>
  )
}

// A lathe profile as three wants it.
function lathe(points: [number, number][]) {
  return points.map(([x, y]) => new Vector2(x, y))
}

// The HeadLed capsule both the HeadHat and the Cirio hang from: a black
// finned heat sink about a centimeter tall, the two drawings' total heights
// less their shades, with a translucent diffuser under it.
function Capsule({ c, m, state }: { c: string; m: string; state: LightState | null }) {
  const fin = (Math.PI * 2 * CAPSULE_R) / CAPSULE_FINS / 2
  return (
    <group>
      <mesh position={[0, -CAPSULE_H / 2, 0]}>
        <cylinderGeometry args={[CAPSULE_R * 0.8, CAPSULE_R * 0.8, CAPSULE_H, SEG * 2]} />
        <BaseMaterial color={c} material={m} />
      </mesh>
      {Array.from({ length: CAPSULE_FINS }, (_, i) => {
        const a = (i / CAPSULE_FINS) * Math.PI * 2
        const r = CAPSULE_R * 0.9
        return (
          <mesh key={i} position={[Math.cos(a) * r, -CAPSULE_H / 2, Math.sin(a) * r]} rotation={[0, -a, 0]}>
            <boxGeometry args={[CAPSULE_R * 0.2, CAPSULE_H, fin]} />
            <BaseMaterial color={c} material={m} />
          </mesh>
        )
      })}
      {/* The diffuser the LEDs shine through, just under the heat sink. */}
      <mesh position={[0, -CAPSULE_H - 0.003, 0]} userData={{ transmits: true }}>
        <cylinderGeometry args={[CAPSULE_R * 0.7, CAPSULE_R * 0.75, 0.006, SEG * 2]} />
        <ShadeMaterial color="#f4f2ee" material="matte" state={state} />
      </mesh>
    </group>
  )
}

// Nagoya: a drum of thin wooden slats, Ø42 by 25 cm, open top and bottom,
// held together by white thread at seven levels. A rod crosses the top with
// the lamp holder in the middle of it, and a white methacrylate diffuser
// hangs inside. It has no canopy: the cord goes up over a hook in the ceiling.

function Slats({ c, m, state }: { c: string; m: string; state: LightState | null }) {
  const mesh = useRef<InstancedMesh>(null)
  useLayoutEffect(() => {
    const slats = mesh.current
    if (!slats) return
    const place = new Matrix4()
    const turn = new Quaternion()
    const up = new Vector3(0, 1, 0)
    const one = new Vector3(1, 1, 1)
    for (let i = 0; i < NAGOYA_SLATS; i++) {
      const a = (i / NAGOYA_SLATS) * Math.PI * 2
      turn.setFromAxisAngle(up, -a)
      place.compose(new Vector3(Math.cos(a) * NAGOYA_R, -NAGOYA_H / 2, Math.sin(a) * NAGOYA_R), turn, one)
      slats.setMatrixAt(i, place)
    }
    slats.instanceMatrix.needsUpdate = true
    slats.computeBoundingSphere()
  }, [])
  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, NAGOYA_SLATS]} userData={{ transmits: true }}>
      {/* A slat is a strip of veneer: under a centimeter wide and paper thin,
          with a gap to the next one the light comes through. */}
      <boxGeometry args={[0.0015, NAGOYA_H, 0.0095]} />
      <ShadeMaterial color={c} material={m} state={state} />
    </instancedMesh>
  )
}

function Nagoya({ k, top, c, m, state }: ModelProps) {
  const hook = 0.03
  return (
    <>
      <group position={[0, top, 0]} scale={k}>
        <Slats c={c('slats')} m={m('slats')} state={state} />
        {Array.from({ length: NAGOYA_THREADS }, (_, i) => (
          <mesh
            key={i}
            position={[0, -0.002 - (i * (NAGOYA_H - 0.004)) / (NAGOYA_THREADS - 1), 0]}
            rotation={[Math.PI / 2, 0, 0]}
          >
            <torusGeometry args={[NAGOYA_R + 0.0009, 0.0012, 6, SEG * 4]} />
            <BaseMaterial color={c('threads')} material={m('threads')} />
          </mesh>
        ))}
        {/* The rod across the top and the ring in the middle of it. */}
        <mesh position={[0, -0.004, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.002, 0.002, NAGOYA_R * 2, 12]} />
          <BaseMaterial color={c('cord')} material="metal" />
        </mesh>
        <mesh position={[0, -0.004, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.022, 0.002, 8, SEG]} />
          <BaseMaterial color={c('cord')} material="metal" />
        </mesh>
        {/* The E27 holder, and the diffuser round the bulb under it. */}
        <mesh position={[0, -0.02, 0]}>
          <cylinderGeometry args={[0.02, 0.02, 0.032, SEG]} />
          <BaseMaterial color={c('cord')} material={m('cord')} />
        </mesh>
        <mesh position={[0, -0.036 - 0.06, 0]} userData={{ transmits: true }}>
          <cylinderGeometry args={[0.035, 0.035, 0.12, SEG * 2]} />
          <ShadeMaterial color={c('diffuser')} material={m('diffuser')} state={state} />
        </mesh>
      </group>
      <Cord from={top - 0.004 * k} to={CEILING_HEIGHT_M - hook} r={TEXTILE_CORD_R} c={c('cord')} m={m('cord')} />
      {/* The hook the cord hangs from, a plain ceiling fitting. */}
      <mesh position={[0, CEILING_HEIGHT_M - hook + 0.006, 0]} rotation={[0, 0, 0]}>
        <torusGeometry args={[0.008, 0.0015, 8, SEG, Math.PI]} />
        <BaseMaterial color={c('cord')} material="metal" />
      </mesh>
      <mesh position={[0, CEILING_HEIGHT_M - hook / 2 + 0.004, 0]}>
        <cylinderGeometry args={[0.0015, 0.0015, hook - 0.008, 8]} />
        <BaseMaterial color={c('cord')} material="metal" />
      </mesh>
    </>
  )
}

// Globo Cesta: a pillow shaped opal glass, Ø27 by 34 cm, under a small black
// cap. The glass narrows at the bottom into an open neck. It hangs from two
// steel wires, with the cord waving loose between them, under a Ø11 by 3 cm
// canopy.

function globoProfile(): [number, number][] {
  // The body runs from the cap down to where the neck starts.
  const yTop = -GLOBO_CAP_H
  const yBottom = -(GLOBO_TOTAL_H - GLOBO_NECK_H)
  const yc = (yTop + yBottom) / 2
  const e = 2 / GLOBO_N
  // A superellipse whose ends are cut off by the cap and the neck, so its
  // half height reaches a little past them.
  const cut = (r: number) => Math.pow(1 - Math.pow(r / GLOBO_A, GLOBO_N), 1 / GLOBO_N)
  const b = (yTop - yBottom) / (cut(GLOBO_CAP_R) + cut(GLOBO_NECK_R))
  const points: [number, number][] = [
    [GLOBO_NECK_R, -GLOBO_TOTAL_H],
    [GLOBO_NECK_R, yBottom],
  ]
  const steps = SEG * 2
  for (let i = 0; i <= steps; i++) {
    const t = -Math.PI / 2 + (i / steps) * Math.PI
    const x = GLOBO_A * Math.pow(Math.cos(t), e)
    const y = yc + b * Math.sign(Math.sin(t)) * Math.pow(Math.abs(Math.sin(t)), e)
    if (y <= yBottom || y >= yTop) continue
    if (y < yc && x < GLOBO_NECK_R) continue
    if (y > yc && x < GLOBO_CAP_R) continue
    points.push([x, y])
  }
  points.push([GLOBO_CAP_R, yTop])
  return points
}

const GLOBO_PROFILE = lathe(globoProfile())

function GloboCesta({ k, top, c, m, state }: ModelProps) {
  const canopyBottom = CEILING_HEIGHT_M - GLOBO_CANOPY[1]
  const gripTop = top + GLOBO_GRIP_H * k
  // The cord hangs slack between the wires, in a gentle wave.
  const cord = useMemo(() => {
    const length = canopyBottom - gripTop
    const sway = Math.min(0.03, length * 0.05)
    const points = [0, 0.2, 0.45, 0.7, 0.9, 1].map((t, i) => {
      const x = i === 0 || i === 5 ? 0 : sway * Math.sin(t * Math.PI * 2.2)
      return new Vector3(x, gripTop + length * t, 0)
    })
    return new CatmullRomCurve3(points)
  }, [canopyBottom, gripTop])
  const wires = useMemo(
    () =>
      [-1, 1].map(s => [
        new Vector3(s * GLOBO_WIRE_X * k, top, 0),
        new Vector3(s * GLOBO_WIRE_X * 1.6, canopyBottom, 0),
      ]),
    [k, top, canopyBottom],
  )
  return (
    <>
      <group position={[0, top, 0]} scale={k}>
        <mesh userData={{ transmits: true }}>
          <latheGeometry args={[GLOBO_PROFILE, SEG * 2]} />
          <ShadeMaterial color={c('globe')} material={m('globe')} state={state} />
        </mesh>
        <mesh position={[0, -GLOBO_CAP_H / 2, 0]}>
          <cylinderGeometry args={[GLOBO_CAP_R, GLOBO_CAP_R, GLOBO_CAP_H, SEG * 2]} />
          <BaseMaterial color={c('cap')} material={m('cap')} />
        </mesh>
        <mesh position={[0, GLOBO_GRIP_H / 2, 0]}>
          <cylinderGeometry args={[0.0045, 0.0045, GLOBO_GRIP_H, SEG]} />
          <BaseMaterial color={c('cap')} material={m('cap')} />
        </mesh>
      </group>
      {wires.map(([a, b], i) => (
        <Rod key={i} from={a} to={b} r={STEEL_WIRE_R}>
          <BaseMaterial color={c('wires')} material={m('wires')} />
        </Rod>
      ))}
      <mesh>
        <tubeGeometry args={[cord, SEG * 2, TEXTILE_CORD_R, 8, false]} />
        <BaseMaterial color={c('cord')} material={m('cord')} />
      </mesh>
      <Canopy diameter={GLOBO_CANOPY[0]} height={GLOBO_CANOPY[1]} c={c('canopy')} m={m('canopy')} />
    </>
  )
}

// HeadHat Bowl L: a white ceramic bowl Ø20 cm, 12 cm tall with the capsule
// on top, glossy outside and matte inside. The shoulder rounds from a flat
// top into a straight side, and the bottom is open. Ø11 by 6 cm canopy.

function headhatProfile(inset: number): [number, number][] {
  // A flat top, a quarter ellipse shoulder and a straight side down to the
  // rim.
  const [rx, ry] = HEADHAT_SHOULDER
  const shoulderY = -CAPSULE_H - ry
  const points: [number, number][] = [[HEADHAT_R - inset, -HEADHAT_H]]
  for (let i = 0; i <= SEG; i++) {
    const t = (i / SEG) * (Math.PI / 2)
    points.push([HEADHAT_TOP_R + (rx - inset) * Math.cos(t), shoulderY + (ry - inset) * Math.sin(t)])
  }
  points.push([CAPSULE_R * 0.85, -CAPSULE_H - inset])
  return points
}

const HEADHAT_OUTSIDE = lathe(headhatProfile(0))
const HEADHAT_INSIDE = lathe(headhatProfile(HEADHAT_WALL))

function HeadhatBowl({ k, top, c, m, state }: ModelProps) {
  return (
    <>
      <group position={[0, top, 0]} scale={k}>
        <Capsule c={c('capsule')} m={m('capsule')} state={state} />
        {/* Ceramic is opaque: the outside stays white and the inside is lit. */}
        <mesh>
          <latheGeometry args={[HEADHAT_OUTSIDE, SEG * 2]} />
          <Material color={c('shade')} material={m('shade')} doubleSide />
        </mesh>
        <mesh userData={{ transmits: true }}>
          <latheGeometry args={[HEADHAT_INSIDE, SEG * 2]} />
          <ShadeMaterial color={c('inside')} material={m('inside')} state={state} />
        </mesh>
        <mesh position={[0, -HEADHAT_H, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[HEADHAT_R - HEADHAT_WALL, HEADHAT_R, SEG * 2]} />
          <BaseMaterial color={c('shade')} material={m('shade')} />
        </mesh>
      </group>
      <Cord from={top} to={CEILING_HEIGHT_M - CAPSULE_CANOPY[1]} r={LED_CABLE_R} c={c('cord')} m={m('cord')} />
      <Canopy diameter={CAPSULE_CANOPY[0]} height={CAPSULE_CANOPY[1]} c={c('canopy')} m={m('canopy')} />
    </>
  )
}

// Cirio Simple: a white porcelain tube Ø10 by 21 cm, open at the bottom,
// hanging from the capsule, 22 cm with it. Porcelain lets the light through,
// so the whole tube glows. Ø11 by 6 cm canopy.

function CirioSimple({ k, top, c, m, state }: ModelProps) {
  const tubeY = -CAPSULE_H - CIRIO_H / 2
  return (
    <>
      <group position={[0, top, 0]} scale={k}>
        <Capsule c={c('capsule')} m={m('capsule')} state={state} />
        <mesh position={[0, tubeY, 0]} userData={{ transmits: true }}>
          <cylinderGeometry args={[CIRIO_R, CIRIO_R, CIRIO_H, SEG * 2, 1, true]} />
          <ShadeMaterial color={c('shade')} material={m('shade')} state={state} />
        </mesh>
        <mesh position={[0, tubeY, 0]} userData={{ transmits: true }}>
          <cylinderGeometry args={[CIRIO_R - CIRIO_WALL, CIRIO_R - CIRIO_WALL, CIRIO_H, SEG * 2, 1, true]} />
          <ShadeMaterial color={c('shade')} material={m('shade')} state={state} />
        </mesh>
        {/* The top the capsule sits in, and the rim at the bottom. */}
        <mesh position={[0, -CAPSULE_H, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[CAPSULE_R * 0.8, CIRIO_R, SEG * 2]} />
          <BaseMaterial color={c('shade')} material={m('shade')} />
        </mesh>
        <mesh position={[0, -CAPSULE_H - CIRIO_H, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[CIRIO_R - CIRIO_WALL, CIRIO_R, SEG * 2]} />
          <BaseMaterial color={c('shade')} material={m('shade')} />
        </mesh>
      </group>
      <Cord from={top} to={CEILING_HEIGHT_M - CAPSULE_CANOPY[1]} r={LED_CABLE_R} c={c('cord')} m={m('cord')} />
      <Canopy diameter={CAPSULE_CANOPY[0]} height={CAPSULE_CANOPY[1]} c={c('canopy')} m={m('canopy')} />
    </>
  )
}

const MODELS: Record<string, (props: ModelProps) => ReactNode> = {
  nagoya: Nagoya,
  globo_cesta: GloboCesta,
  headhat_bowl: HeadhatBowl,
  cirio_simple: CirioSimple,
}

export default function Pendant({ style, ...props }: ModelProps & { style: string }) {
  const Model = MODELS[style] ?? Nagoya
  return <Model {...props} />
}
