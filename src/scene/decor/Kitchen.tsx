import { Led, Panel, Slab } from '#/scene/decor/parts.tsx'
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
