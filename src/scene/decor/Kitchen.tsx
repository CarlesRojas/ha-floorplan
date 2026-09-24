import { Bar, Led, Material, Panel, Slab } from '#/scene/decor/parts.tsx'
import type { ReactNode } from 'react'

// What every kitchen fitting draws with: its slots as materials and colors,
// and how far it is switched on.
export type Fit = {
  M: (slot: string) => ReactNode
  c: (slot: string) => string
  m: (slot: string) => string
  on: boolean
  lit: number
  level: number
}

// A dark recess cut into a door, the pocket a handleless front is pulled
// by. It is a dark box pushed through the door's face, so it reads as a
// hollow from any side it shows on.
function Pocket({
  size,
  position,
  children,
}: {
  size: [number, number, number]
  position: [number, number, number]
  children: ReactNode
}) {
  return (
    <mesh position={position}>
      <boxGeometry args={size} />
      {children}
    </mesh>
  )
}

// A fridge freezer after the Samsung Bespoke RB38C7B6AS9, 59.5 by 65.8 by
// 203 cm: two flat doors, the fridge over the freezer about 1.3 m to 0.7 m,
// a pocket grip cut into the edge of each door where they meet, and a toe
// grille under the lower door. Below 1.2 m it is an under counter fridge
// with one door and its grip at the top.
export function Fridge({ w, d, h, fit }: { w: number; d: number; h: number; fit: Fit }) {
  const { M } = fit
  const door = 0.05
  const toe = Math.min(0.06, h * 0.04)
  const gap = 0.006
  const front = d / 2
  const body = d - door
  const tall = h >= 1.2
  // The freezer's share of the doors, from the Bespoke's 0.7 m in 2 m.
  const low = tall ? (h - toe) * 0.345 : 0
  const doors = tall
    ? [
        { y: toe, h: low - gap / 2, grip: 'top' as const },
        { y: toe + low + gap / 2, h: h - toe - low - gap / 2, grip: 'bottom' as const },
      ]
    : [{ y: toe, h: h - toe, grip: 'top' as const }]
  const grip = Math.min(0.32, h * 0.16)
  return (
    <group>
      <Slab size={[w, h, body]} radius={0.012} bevel={0.006} position={[0, 0, -door / 2]}>
        {M('body')}
      </Slab>
      {/* The toe grille, set back under the lower door. */}
      <mesh position={[0, toe / 2, front - door + 0.004]}>
        <boxGeometry args={[w - 0.03, toe - 0.008, 0.02]} />
        {M('handles')}
      </mesh>
      {doors.map((dr, i) => (
        <group key={i}>
          <Panel size={[w - 0.004, dr.h, door]} position={[0, dr.y, front - door / 2]} radius={0.01}>
            {M('doors')}
          </Panel>
          {/* The pocket grip, in the door's outer edge by the split. */}
          <Pocket
            size={[0.018, grip, door * 0.7]}
            position={[
              w / 2 - 0.008,
              dr.grip === 'top' ? dr.y + dr.h - grip / 2 - 0.01 : dr.y + grip / 2 + 0.01,
              front - door * 0.35 + 0.001,
            ]}
          >
            {M('handles')}
          </Pocket>
        </group>
      ))}
      <Led on={fit.on} radius={0.006} position={[-w / 2 + 0.05, h - 0.04, front + 0.001]} />
    </group>
  )
}

// A lit window in a door: dark glass that glows warm while it runs.
function Window({
  size,
  position,
  fit,
  glow = 0.6,
}: {
  size: [number, number]
  position: [number, number, number]
  fit: Fit
  glow?: number
}) {
  return (
    <mesh position={position}>
      <planeGeometry args={size} />
      <Material
        color={fit.c('glass')}
        material={fit.m('glass')}
        emissive={[1, 0.72, 0.35]}
        emissiveIntensity={glow * fit.lit}
      />
    </mesh>
  )
}

// A bar handle standing off a door on two posts.
function BarHandle({ length, y, z, fit }: { length: number; y: number; z: number; fit: Fit }) {
  const off = 0.04
  return (
    <group>
      <Bar length={length} radius={0.01} rotation={[0, 0, Math.PI / 2]} position={[0, y, z + off]}>
        {fit.M('handle')}
      </Bar>
      {[-1, 1].map(s => (
        <mesh key={s} position={[(s * length) / 2 - s * 0.03, y, z + off / 2]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.007, 0.007, off, 12]} />
          {fit.M('handle')}
        </mesh>
      ))}
    </group>
  )
}

// A built in oven after the Bosch Series 8 HBG7741B1, 59.4 by 54.8 by 59.5
// cm: a front all in black glass, a 10 cm control strip across the top with
// a display in the middle and touch keys either side, and a door with a
// long bar handle and a window that glows while it bakes.
export function Oven({ w, d, h, fit }: { w: number; d: number; h: number; fit: Fit }) {
  const { M } = fit
  const front = d / 2
  const strip = Math.min(0.1, h * 0.17)
  const doorH = h - strip - 0.004
  const face = 0.03
  return (
    <group>
      <Slab size={[w - 0.01, h - 0.01, d - face]} radius={0.01} bevel={0.004} position={[0, 0.005, -face / 2]}>
        {M('body')}
      </Slab>
      <Panel size={[w, strip, face]} position={[0, h - strip, front - face / 2]} radius={0.006}>
        {M('body')}
      </Panel>
      {/* The display, and a row of touch keys either side of it. */}
      <mesh position={[0, h - strip / 2, front + 0.0005]}>
        <planeGeometry args={[Math.min(0.11, w * 0.2), strip * 0.45]} />
        <Material
          color={fit.c('display')}
          material="ceramic"
          emissive={[1, 0.62, 0.3]}
          emissiveIntensity={0.9 * fit.lit}
        />
      </mesh>
      {[-1, 1].flatMap(s =>
        [0, 1, 2].map(i => (
          <mesh key={`${s}${i}`} position={[s * (w * 0.16 + i * w * 0.07), h - strip / 2, front + 0.0005]}>
            <circleGeometry args={[0.005, 16]} />
            <meshStandardMaterial color="#8a8f92" />
          </mesh>
        )),
      )}
      <Panel size={[w, doorH, face]} position={[0, 0, front - face / 2]} radius={0.006}>
        {M('body')}
      </Panel>
      <Window size={[w * 0.7, doorH * 0.52]} position={[0, doorH * 0.42, front + 0.0005]} fit={fit} />
      <BarHandle length={w * 0.8} y={doorH - 0.05} z={front} fit={fit} />
    </group>
  )
}
