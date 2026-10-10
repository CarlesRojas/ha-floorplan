import { SLAB_BEVEL_SEGMENTS, SLAB_CURVE_SEGMENTS } from '#/constants.ts'
import { ensureCounterClockwise, roundedShape } from '#/geometry/polygon.ts'
import { PASSAGE_ARROW, PASSAGE_GAP_M, passagesOf, type Passage } from '#/geometry/passages.ts'
import { slabGeometry } from '#/geometry/slab.ts'
import { useEased } from '#/scene/decor/ease.ts'
import { usePressActions } from '#/scene/decor/press.ts'
import { HIDDEN_LAYER, PASSAGE } from '#/scene/focus.ts'
import { PASSAGE_COLOR, PASSAGE_GLOW, ROOM_SLAB_EDGE_RADIUS_M, ROOM_SLAB_THICKNESS_M } from '#/theme.ts'
import type { DecorationConfig, Point, RoomConfig } from '#/types.ts'
import { useMemo, useState } from 'react'
import type { BufferGeometry, Mesh } from 'three'

// The signs on the floor that lead from a focused room into the room open
// beside it. Each is as thick as a floor and rounded the same, lying just
// past the stretch the two share, and only shows around the room it leads
// out of. A press on one goes to the room it points at, as a press on a door
// between them would.

type Props = {
  rooms: RoomConfig[]
  decorations: DecorationConfig[]
  onRoom: (room: string, through: string[]) => void
}

export default function Passages({ rooms, decorations, onRoom }: Props) {
  const passages = useMemo(() => rooms.flatMap(room => passagesOf(room, rooms, decorations)), [rooms, decorations])
  // One shape for every sign, built the way a floor is.
  const geometry = useMemo(() => {
    const outline = roundedShape(ensureCounterClockwise(PASSAGE_ARROW), ROOM_SLAB_EDGE_RADIUS_M)
      .getPoints(SLAB_CURVE_SEGMENTS)
      .map((p): Point => [p.x, p.y])
    return slabGeometry(outline, [], ROOM_SLAB_EDGE_RADIUS_M, ROOM_SLAB_THICKNESS_M, SLAB_BEVEL_SEGMENTS)
  }, [])
  return passages.map(passage => (
    <Sign key={`${passage.from}>${passage.to}`} passage={passage} geometry={geometry} onRoom={onRoom} />
  ))
}

// Hidden from the start: the focus brings a sign out around its own room.
const hide = (mesh: Mesh | null) => mesh?.layers.set(HIDDEN_LAYER)

function Sign({ passage, geometry, onRoom }: { passage: Passage; geometry: BufferGeometry; onRoom: Props['onRoom'] }) {
  const go = () => onRoom(passage.to, [passage.from, passage.to])
  const press = usePressActions(go)
  // Under the pointer the sign leans a little further on its way.
  const [over, setOver] = useState(false)
  const lean = useEased(over ? 1 : 0, 10)
  const [ox, oy] = passage.out
  const reach = PASSAGE_GAP_M + lean * 0.06
  return (
    <group
      position={[passage.at[0] + ox * reach, 0, -(passage.at[1] + oy * reach)]}
      // The shape points along plan +x, which is scene +x, turned to `out`.
      rotation={[0, Math.atan2(oy, ox), 0]}
    >
      <mesh
        ref={hide}
        name={`${PASSAGE}${passage.from}`}
        geometry={geometry}
        receiveShadow
        userData={{ pick: { click: go, open: go } }}
        {...press}
        onPointerOver={() => {
          document.body.style.cursor = 'pointer'
          setOver(true)
        }}
        onPointerOut={() => {
          document.body.style.cursor = ''
          setOver(false)
        }}
      >
        <meshStandardMaterial
          color={PASSAGE_COLOR}
          emissive={PASSAGE_COLOR}
          emissiveIntensity={PASSAGE_GLOW + lean * 0.15}
          roughness={0.6}
        />
      </mesh>
    </group>
  )
}
