import { surface, type SurfaceKind } from '#/materials/textures.ts'
import { useMemo } from 'react'
import { DoubleSide, Vector2 } from 'three'

type Props = {
  kind: SurfaceKind
  color: string
  // Texture tiles per unit of UV space.
  repeat?: number
  emissive?: [number, number, number]
  emissiveIntensity?: number
  doubleSide?: boolean
}

// Standard material with the procedural color and normal maps of a surface
// kind, tinted by a color.
export default function SurfaceMaterial({
  kind,
  color,
  repeat,
  emissive,
  emissiveIntensity = 0,
  doubleSide = false,
}: Props) {
  const s = surface(kind)
  const maps = useMemo(() => {
    const map = s.map.clone()
    const normalMap = s.normalMap.clone()
    const r = repeat ?? s.repeat
    map.repeat.set(r, r)
    normalMap.repeat.set(r, r)
    map.needsUpdate = true
    normalMap.needsUpdate = true
    return { map, normalMap }
  }, [s, repeat])
  return (
    <meshStandardMaterial
      color={color}
      map={maps.map}
      normalMap={maps.normalMap}
      normalScale={new Vector2(s.normalScale, s.normalScale)}
      roughness={s.roughness}
      side={doubleSide ? DoubleSide : undefined}
      emissive={emissive ?? [0, 0, 0]}
      emissiveIntensity={emissiveIntensity}
    />
  )
}
