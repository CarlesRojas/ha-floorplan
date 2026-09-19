import { ROOM_LABEL_LIFT_M, SLAB_BEVEL_SEGMENTS, SLAB_CURVE_SEGMENTS } from '#/constants.ts'
import { ROOM_COLORS, ROOM_SLAB_EDGE_RADIUS_M, ROOM_SLAB_THICKNESS_M } from '#/theme.ts'
import { centroid, ensureCounterClockwise, inset, roundedShape } from '#/geometry/polygon.ts'
import type { RoomConfig } from '#/types.ts'
import { Html } from '@react-three/drei'
import { useMemo } from 'react'
import { ExtrudeGeometry } from 'three'

type Props = {
  room: RoomConfig
  index: number
  radius: number
  gap: number
}

export default function Room({ room, index, radius, gap }: Props) {
  // The bevel grows outward from the outline, so inset by it as well to keep
  // the visible edge where the gap says it should be.
  const points = useMemo(
    () => inset(ensureCounterClockwise(room.points), gap / 2 + ROOM_SLAB_EDGE_RADIUS_M),
    [room.points, gap],
  )
  const label = useMemo(() => centroid(points), [points])

  const geometry = useMemo(() => {
    const shape = roundedShape(points, room.radius ?? radius)
    const geo = new ExtrudeGeometry(shape, {
      depth: ROOM_SLAB_THICKNESS_M,
      bevelEnabled: true,
      bevelThickness: ROOM_SLAB_EDGE_RADIUS_M,
      bevelSize: ROOM_SLAB_EDGE_RADIUS_M,
      bevelSegments: SLAB_BEVEL_SEGMENTS,
      curveSegments: SLAB_CURVE_SEGMENTS,
    })
    // Shape is drawn on the XY plane. Lay it flat so Y is up and plan y maps to -z.
    geo.rotateX(-Math.PI / 2)
    return geo
  }, [points, room.radius, radius])

  const color = room.color ?? ROOM_COLORS[index % ROOM_COLORS.length]

  return (
    <group>
      <mesh geometry={geometry} castShadow receiveShadow>
        <meshStandardMaterial color={color} roughness={0.85} />
      </mesh>
      <Html position={[label[0], ROOM_SLAB_THICKNESS_M + ROOM_LABEL_LIFT_M, -label[1]]} center zIndexRange={[10, 0]}>
        <span className="font-montserrat pointer-events-none text-xs font-semibold whitespace-nowrap text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">
          {room.name ?? room.id}
        </span>
      </Html>
    </group>
  )
}
