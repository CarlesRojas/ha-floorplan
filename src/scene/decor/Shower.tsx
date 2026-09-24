import { Glass, SEG, Slab } from '#/scene/decor/parts.tsx'
import type { Vec3 } from '#/scene/decor/points.ts'
import { Dowel } from '#/scene/decor/woodwork.tsx'
import { useEffect, useMemo, type ReactNode } from 'react'
import { CatmullRomCurve3, TubeGeometry, Vector3 } from 'three'

// A walk in shower after a Hansgrohe Raindance showerpipe over a low stone
// tray: 8 mm glass in slim channels, and a thermostat bar with a riser, a
// round rain head on an arm and a hand shower on a hose. The front, +z, is
// the way in, and the back is the wall.

type ShowerSide = 'back' | 'left' | 'right' | 'front'

const TRAY = 0.03
const PANE = 0.008
const CHANNEL = 0.02
// The glass stands this far in from the tray's edge.
const INSET = 0.02

// The sides that are glass. One is a walk in screen along a side, two adds
// the front with its door, and three closes the other side too. Flip puts
// the first screen on the right instead of the left.
function showerGlass(count: number, flip: boolean): ShowerSide[] {
  const near: ShowerSide = flip ? 'right' : 'left'
  const far: ShowerSide = flip ? 'left' : 'right'
  return ([near, 'front', far] as ShowerSide[]).slice(0, Math.max(0, Math.min(3, Math.round(count))))
}

// The wall the fittings hang on: the shortest side without glass. The front
// is the way in, so it never counts, and the back wins a tie.
function showerWall(w: number, d: number, glass: ShowerSide[]): Exclude<ShowerSide, 'front'> {
  const free = (['back', 'left', 'right'] as const).filter(s => !glass.includes(s))
  const span = (s: ShowerSide) => (s === 'back' ? w : d)
  return free.reduce((best, s) => (span(s) < span(best) - 1e-6 ? s : best), free[0] ?? 'back')
}

// A frame on one side of the tray: its x runs along the side, +z points
// into the shower, and it sits `inset` in from the edge. On the left side
// +x runs toward the back, on the right toward the front, and on the front
// toward the left.
function frame(side: ShowerSide, w: number, d: number, inset: number) {
  switch (side) {
    case 'back':
      return { position: [0, 0, -d / 2 + inset] as Vec3, rotation: 0, span: w }
    case 'front':
      return { position: [0, 0, d / 2 - inset] as Vec3, rotation: Math.PI, span: w }
    case 'left':
      return { position: [-w / 2 + inset, 0, 0] as Vec3, rotation: Math.PI / 2, span: d }
    case 'right':
      return { position: [w / 2 - inset, 0, 0] as Vec3, rotation: -Math.PI / 2, span: d }
  }
}

// A pane of glass from `from` to `to` along a frame's x, standing on the
// tray, `z` off the frame's line.
function Pane({ from, to, h, z = 0, color }: { from: number; to: number; h: number; z?: number; color: string }) {
  return (
    <mesh position={[(from + to) / 2, TRAY + h / 2, z]}>
      <boxGeometry args={[Math.abs(to - from), h, PANE]} />
      <Glass color={color} opacity={0.18} />
    </mesh>
  )
}

// The U channel a pane stands in where it meets a wall.
function Channel({ x, h, children }: { x: number; h: number; children: ReactNode }) {
  return (
    <mesh position={[x, TRAY + h / 2, 0]}>
      <boxGeometry args={[CHANNEL, h, CHANNEL]} />
      {children}
    </mesh>
  )
}

// A hose hanging in a loop through the points given.
function Hose({ points, children }: { points: Vec3[]; children: ReactNode }) {
  // The points are made again every render, so their numbers are the key.
  const key = points.flat().join(',')
  const geometry = useMemo(() => {
    const at = key.split(',').map(Number)
    const curve = new CatmullRomCurve3(
      Array.from({ length: at.length / 3 }, (_, i) => new Vector3(at[i * 3], at[i * 3 + 1], at[i * 3 + 2])),
    )
    return new TubeGeometry(curve, 64, 0.007, 10, false)
  }, [key])
  useEffect(() => () => geometry.dispose(), [geometry])
  return (
    <mesh geometry={geometry} castShadow>
      {children}
    </mesh>
  )
}

// The showerpipe on a wall `span` wide: a thermostat bar at hand height, a
// riser to a rain head on an arm reaching `reach` into the shower, and the
// hand shower in a holder on the riser with its hose looping down.
function Fittings({ span, reach, h, metal }: { span: number; reach: number; h: number; metal: ReactNode }) {
  // A Raindance head is 24 cm across and its arm 40 cm, both less in a
  // small shower so the head stays over the tray.
  const head = Math.min(0.24, span * 0.3)
  const arm = Math.min(0.4, reach * 0.55)
  const top = Math.min(TRAY + h + 0.05, 2.2)
  const bar = Math.min(0.32, span * 0.4)
  const barY = TRAY + 1.05
  const off = 0.05
  const holder = barY + 0.5
  return (
    <group>
      {/* The thermostat bar and its two dials. */}
      <mesh position={[0, barY, off]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.028, 0.028, bar, SEG]} />
        {metal}
      </mesh>
      {[-1, 1].map(s => (
        <mesh key={s} position={[(s * (bar + 0.03)) / 2, barY, off]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.032, 0.032, 0.03, SEG]} />
          {metal}
        </mesh>
      ))}
      {/* Wall elbows the bar is held off the wall by. */}
      {[-1, 1].map(s => (
        <mesh key={s} position={[(s * bar) / 3, barY, off / 2]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.012, 0.012, off, 16]} />
          {metal}
        </mesh>
      ))}
      {/* The riser, held to the wall by a bracket near its top. */}
      <Dowel from={[0, barY, off]} to={[0, top, off]} r={[0.011, 0.011]}>
        {metal}
      </Dowel>
      <mesh position={[0, top - 0.25, off / 2]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.01, 0.01, off, 16]} />
        {metal}
      </mesh>
      {/* The arm out to the rain head, and the head itself. */}
      <Dowel from={[0, top, off]} to={[0, top, off + arm]} r={[0.01, 0.01]}>
        {metal}
      </Dowel>
      <mesh position={[0, top - 0.012, off + arm]} castShadow>
        <cylinderGeometry args={[head / 2, head / 2, 0.012, SEG * 2]} />
        {metal}
      </mesh>
      {/* The holder on the riser, and the hand shower sitting in it: a
          slim handle and a round head facing into the shower. */}
      <mesh position={[0, holder, off + 0.015]}>
        <boxGeometry args={[0.035, 0.05, 0.03]} />
        {metal}
      </mesh>
      <group position={[0, holder, off + 0.04]} rotation={[-0.35, 0, 0]}>
        <Dowel from={[0, -0.12, 0]} to={[0, 0.06, 0]} r={[0.013, 0.016]}>
          {metal}
        </Dowel>
        <mesh position={[0, 0.1, 0.012]} rotation={[Math.PI / 2 - 0.3, 0, 0]} castShadow>
          <cylinderGeometry args={[0.05, 0.05, 0.022, SEG]} />
          {metal}
        </mesh>
      </group>
      <Hose
        points={[
          [bar / 2 - 0.02, barY - 0.03, off],
          [bar / 2 + 0.02, barY - 0.35, off + 0.03],
          [0.08, barY - 0.55, off + 0.05],
          [0.01, barY - 0.2, off + 0.07],
          [0, holder - 0.17, off + 0.08],
        ]}
      >
        {metal}
      </Hose>
    </group>
  )
}

type Props = {
  w: number
  d: number
  h: number
  glass: number
  flip: boolean
  colors: { glass: string }
  M: (slot: string) => ReactNode
}

export default function Shower({ w, d, h, glass: count, flip, colors, M }: Props) {
  const glass = showerGlass(count, flip)
  const wall = showerWall(w, d, glass)
  const on = frame(wall, w, d, 0)
  const has = (s: ShowerSide) => glass.includes(s)
  const metal = M('tap')
  return (
    <group>
      <Slab size={[w, TRAY, d]} radius={0.01} bevel={0.004}>
        {M('tray')}
      </Slab>
      {/* A square grate over the waste, in the middle of the tray. */}
      <mesh position={[0, TRAY + 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.12, 0.12]} />
        {metal}
      </mesh>
      {glass.map(side => {
        const f = frame(side, w, d, INSET)
        const half = f.span / 2 - INSET
        if (side === 'front') {
          // A fixed pane from the corner of the first screen, and a door
          // hung off it that closes against the far side, standing just
          // proud of the fixed pane.
          const near = flip ? -1 : 1
          const edge = near * half
          const fixed = Math.min(0.5, f.span * 0.4)
          const split = edge - near * fixed
          const far = -edge
          return (
            <group key={side} position={f.position} rotation={[0, f.rotation, 0]}>
              <Pane from={edge} to={split} h={h} color={colors.glass} />
              <Pane from={split} to={far} h={h} z={-PANE * 1.8} color={colors.glass} />
              {/* The hinges on the fixed pane's edge. */}
              {[0.25, h - 0.25].map(y => (
                <mesh key={y} position={[split, TRAY + y, -PANE]}>
                  <boxGeometry args={[0.05, 0.07, 0.03]} />
                  {M('frame')}
                </mesh>
              ))}
              {/* A pull on both faces near the door's free edge. */}
              <Dowel
                from={[far + near * 0.08, TRAY + 0.85, -PANE * 1.8 - 0.035]}
                to={[far + near * 0.08, TRAY + 1.15, -PANE * 1.8 - 0.035]}
                r={[0.009, 0.009]}
              >
                {M('frame')}
              </Dowel>
              {!has(flip ? 'left' : 'right') && (
                <Channel x={far} h={h}>
                  {M('frame')}
                </Channel>
              )}
            </group>
          )
        }
        // A side screen stands in a channel on the back wall. With no
        // front glass to meet, it is held by a bar across to the back wall.
        const back = side === 'left' ? 1 : -1
        return (
          <group key={side} position={f.position} rotation={[0, f.rotation, 0]}>
            <Pane from={-half} to={half} h={h} color={colors.glass} />
            <Channel x={back * half} h={h}>
              {M('frame')}
            </Channel>
            {!has('front') && (
              <Dowel
                from={[back * (half - Math.min(0.5, f.span * 0.45)), TRAY + h - 0.03, 0]}
                to={[back * (half + INSET), TRAY + h - 0.03, Math.min(0.5, f.span * 0.45)]}
                r={[0.009, 0.009]}
              >
                {M('frame')}
              </Dowel>
            )}
          </group>
        )
      })}
      <group position={on.position} rotation={[0, on.rotation, 0]}>
        <Fittings span={on.span} reach={wall === 'back' ? d : w} h={h} metal={metal} />
      </group>
    </group>
  )
}
