import { colorValue, materialValue, paramValue, type DecorationKind } from '#/decoration/catalog.ts'
import { Led, Material, SEG, Slab, Spinner } from '#/scene/decor/parts.tsx'
import { alongPath, legLengths, roamKey, roamPath } from '#/scene/decor/roam.ts'
import type { ItemState } from '#/scene/decor/state.ts'
import type { DecorationConfig, RoomConfig } from '#/types.ts'
import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { MathUtils, type Group } from 'three'

type Props = {
  kind: DecorationKind
  item: DecorationConfig
  state: ItemState | null
  room?: RoomConfig
  all: DecorationConfig[]
  // How hard it is running, so the brushes wind down rather than stopping
  // dead when it is switched off.
  lit: number
}

// How fast the robot drives, in meters a second. Slow enough to read as a
// machine crossing a room rather than a toy.
const SPEED = 0.24
// How quickly it swings around to face the way it is going.
const TURN_RATE = 3.5

// A robot vacuum and the dock it charges on. The dock stays where the piece
// was placed, since that is the thing with a plug in the wall, and the robot
// itself leaves it to sweep the room and comes back when it is turned off.
export default function Vacuum({ kind, item, state, room, all, lit }: Props) {
  const p = (id: string) => paramValue(kind, item.params, id)
  const c = (slot: string) => colorValue(kind, item.colors, slot, item.variant)
  const m = (slot: string) => materialValue(kind, slot, item.variant)
  const M = (slot: string) => <Material color={c(slot)} material={m(slot)} />
  const on = state?.on ?? false
  const r = p('size') / 2
  const h = 0.085

  // The round it drives, in plan meters. Working it out means sampling the
  // whole floor, so it is kept until the shape of the room, the furniture
  // standing in it or the robot's own place actually changes. Every other
  // render, of which there are many, leaves it alone.
  const key = roamKey(room, all, item, r)
  const path = useMemo(
    () => (room ? roamPath(room, all, item, r) : [item.position]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key],
  )
  const legs = useMemo(() => legLengths(path), [path])
  const total = useMemo(() => legs.reduce((a, b) => a + b, 0), [legs])

  const rig = useRef<Group>(null)
  const travelled = useRef(0)
  const forward = useRef(true)
  const facing = useRef(0)
  const rotation = MathUtils.degToRad(item.rotation ?? 0)

  useFrame((_, delta) => {
    const g = rig.current
    if (!g) return
    const dt = Math.min(delta, 0.1)
    if (total <= 0) return
    if (on) {
      // Out to the far end of the round and back again, for as long as it
      // is running.
      travelled.current += (forward.current ? 1 : -1) * SPEED * dt
      if (travelled.current >= total) {
        travelled.current = total
        forward.current = false
      } else if (travelled.current <= 0) {
        travelled.current = 0
        forward.current = true
      }
    } else {
      // Off means home. It retraces the way it came rather than driving
      // through the sofa.
      travelled.current = Math.max(travelled.current - SPEED * dt, 0)
      forward.current = true
    }
    const { at, heading } = alongPath(path, legs, travelled.current)
    // The whole piece is already turned to the item's own rotation, so the
    // robot's place inside it is the plan offset turned back the other way.
    const dx = at[0] - item.position[0]
    const dz = -(at[1] - item.position[1])
    g.position.x = dx * Math.cos(rotation) - dz * Math.sin(rotation)
    g.position.z = dx * Math.sin(rotation) + dz * Math.cos(rotation)
    // Facing the way it drives, and turning into it rather than snapping.
    // Standing still it keeps the heading it had.
    const want = (on || travelled.current > 0 ? heading : 0) - rotation
    const turn = ((want - facing.current + Math.PI) % (Math.PI * 2)) - Math.PI
    facing.current += turn * Math.min(TURN_RATE * dt, 1)
    g.rotation.y = facing.current
  })

  return (
    <group>
      {/* The dock: a low ramp the robot backs onto, with a short back
          panel carrying the charging contacts. It never moves. */}
      <Slab size={[r * 1.5, 0.014, r * 1.25]} radius={0.02} bevel={0.005} position={[0, 0, -r * 0.5]}>
        {M('bumper')}
      </Slab>
      {/* The lip the robot climbs, thin at the front. */}
      <mesh position={[0, 0.007, r * 0.1]} rotation={[-0.16, 0, 0]}>
        <boxGeometry args={[r * 1.5, 0.004, r * 0.22]} />
        {M('bumper')}
      </mesh>
      <Slab size={[r * 1.15, 0.13, 0.035]} radius={0.016} bevel={0.006} position={[0, 0, -r * 1.06]}>
        {M('body')}
      </Slab>
      {/* Two contacts on the panel, where the robot meets it. */}
      {[-1, 1].map(side => (
        <mesh key={side} position={[side * r * 0.3, 0.028, -r * 1.06 + 0.019]}>
          <boxGeometry args={[r * 0.22, 0.014, 0.004]} />
          {M('brushes')}
        </mesh>
      ))}
      {/* The dock's own light, on while the robot is away charging rather
          than out on a round. */}
      <Led on={!on} position={[0, 0.105, -r * 1.06 + 0.02]} radius={0.007} />

      <group ref={rig}>
        {/* A low puck: a bumper wrapping the front half, a lidar turret set
            back on the top plate, and a side brush that spins while it runs. */}
        <mesh position={[0, h / 2, 0]} castShadow>
          <cylinderGeometry args={[r, r * 0.98, h, SEG]} />
          {M('body')}
        </mesh>
        {/* Bumper, the front half of the rim only. */}
        <mesh position={[0, h * 0.34, 0]} rotation={[0, Math.PI / 2, 0]}>
          <cylinderGeometry args={[r * 1.02, r * 1.02, h * 0.42, SEG, 1, true, 0, Math.PI]} />
          <Material color={c('bumper')} material={m('bumper')} doubleSide />
        </mesh>
        {/* Lidar turret, behind the middle. */}
        <mesh position={[0, h + 0.012, -r * 0.34]}>
          <cylinderGeometry args={[r * 0.3, r * 0.32, 0.024, SEG]} />
          {M('bumper')}
        </mesh>
        <mesh position={[0, h + 0.026, -r * 0.34]}>
          <cylinderGeometry args={[r * 0.26, r * 0.28, 0.006, SEG]} />
          {M('body')}
        </mesh>
        {/* A round button in front of the turret. */}
        <mesh position={[0, h + 0.002, r * 0.3]}>
          <cylinderGeometry args={[r * 0.16, r * 0.16, 0.006, SEG]} />
          {M('bumper')}
        </mesh>
        <Led on={on} position={[0, h + 0.008, r * 0.62]} radius={0.007} />
        <Spinner speed={9 * lit}>
          <mesh position={[r * 0.72, 0.01, 0]}>
            <boxGeometry args={[r * 0.55, 0.005, 0.016]} />
            {M('brushes')}
          </mesh>
          <mesh position={[-r * 0.72, 0.01, 0]}>
            <boxGeometry args={[r * 0.55, 0.005, 0.016]} />
            {M('brushes')}
          </mesh>
        </Spinner>
      </group>
    </group>
  )
}
