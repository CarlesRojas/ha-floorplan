import { DAYLIGHT_EASE_S, SUN_DIRECTION_DEG, SUN_ELEVATION_DEG, SUN_SHADOW_MAP_PX } from '#/constants.ts'
import { daylight, sunElevation } from '#/scene/daylight.ts'
import { planBounds } from '#/scene/framing.ts'
import {
  DAY_AMBIENT_INTENSITY,
  DAY_GROUND_COLOR,
  DAY_HEMISPHERE_INTENSITY,
  DAY_SKY_COLOR,
  DAY_SUN_COLOR,
  DAY_SUN_INTENSITY,
  HORIZON_GROUND_COLOR,
  HORIZON_SKY_COLOR,
  HORIZON_SUN_COLOR,
  NIGHT_AMBIENT_INTENSITY,
  NIGHT_GROUND_COLOR,
  NIGHT_HEMISPHERE_INTENSITY,
  NIGHT_SKY_COLOR,
  NIGHT_SUN_COLOR,
  NIGHT_SUN_INTENSITY,
} from '#/theme.ts'
import type { HomeAssistant, RoomConfig } from '#/types.ts'
import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { Color, MathUtils, Object3D, type AmbientLight, type DirectionalLight, type HemisphereLight } from 'three'

// What the room is lit as: whatever the sun at the home says, or an hour of
// a plain day, which is what the editor's time of day slider picks.
export type SkyMode = 'auto' | number

// The light the room sits in, which follows the sun at the user's home. It
// is one soft warm wash: a sky above and a floor bounce below, with a gentle
// sun on top of them whose shadows are blurred wide rather than cut sharp.
// At night the wash drops to a dim warm glow and the lamps carry the room.
export default function Sky({
  hass,
  rooms = [],
  mode = 'auto',
  direction = SUN_DIRECTION_DEG,
}: {
  hass: HomeAssistant | null
  rooms?: RoomConfig[]
  mode?: SkyMode
  // Compass bearing the sun comes from, clockwise from the top of the plan.
  direction?: number
}) {
  const target = daylight(sunElevation(hass, mode === 'auto' ? undefined : mode))
  const level = useRef(target.level)
  const height = useRef(target.height)
  const ambient = useRef<AmbientLight>(null)
  const hemi = useRef<HemisphereLight>(null)
  const sun = useRef<DirectionalLight>(null)

  // The sun stands over the middle of the flat and covers exactly it, so its
  // shadow map stays fine enough not to speckle a tabletop.
  const { center, reach } = useMemo(() => planBounds(rooms), [rooms])
  const aim = useMemo(() => new Object3D(), [])
  const extent = Math.max(reach * 1.2 + 1, 3)
  // The sun stands on its bearing, at the height it keeps all day, far
  // enough out that its shadow camera clears the flat.
  const where = useMemo(() => {
    const bearing = MathUtils.degToRad(direction)
    const climb = MathUtils.degToRad(SUN_ELEVATION_DEG)
    const away = Math.max(reach * 2 + 8, 14)
    const flat = Math.cos(climb) * away
    return [center[0] + Math.sin(bearing) * flat, Math.sin(climb) * away, center[2] - Math.cos(bearing) * flat] as [
      number,
      number,
      number,
    ]
  }, [center, reach, direction])

  // Night, the horizon and overhead. The light blends along the sun's climb
  // first, from golden to near white, and then fades from night into that.
  const colors = useMemo(
    () => ({
      sky: [new Color(NIGHT_SKY_COLOR), new Color(HORIZON_SKY_COLOR), new Color(DAY_SKY_COLOR)],
      ground: [new Color(NIGHT_GROUND_COLOR), new Color(HORIZON_GROUND_COLOR), new Color(DAY_GROUND_COLOR)],
      sun: [new Color(NIGHT_SUN_COLOR), new Color(HORIZON_SUN_COLOR), new Color(DAY_SUN_COLOR)],
      lit: new Color(),
      mix: new Color(),
    }),
    [],
  )

  // Eased, so sunset arrives as a fade and not as a switch.
  useFrame((_, delta) => {
    const k = 1 - Math.exp(-delta / DAYLIGHT_EASE_S)
    level.current += (target.level - level.current) * k
    height.current += (target.height - height.current) * k
    const day = level.current
    const up = height.current
    const between = (night: number, light: number) => night + (light - night) * day
    // Golden along the horizon, near white overhead, then faded toward the
    // night wash as the sun goes down.
    const tint = (set: Color[]) => colors.mix.lerpColors(set[0], colors.lit.lerpColors(set[1], set[2], up), day)
    if (ambient.current) {
      ambient.current.intensity = between(NIGHT_AMBIENT_INTENSITY, DAY_AMBIENT_INTENSITY)
      ambient.current.color.copy(tint(colors.sky))
    }
    if (hemi.current) {
      hemi.current.intensity = between(NIGHT_HEMISPHERE_INTENSITY, DAY_HEMISPHERE_INTENSITY)
      hemi.current.color.copy(tint(colors.sky))
      hemi.current.groundColor.copy(tint(colors.ground))
    }
    if (sun.current) {
      sun.current.intensity = between(NIGHT_SUN_INTENSITY, DAY_SUN_INTENSITY)
      sun.current.color.copy(tint(colors.sun))
      // The light is aimed at the middle of the flat rather than at the
      // scene's origin, which a flat drawn off to one side is not.
      aim.position.set(center[0], center[1], center[2])
      aim.updateMatrixWorld()
      sun.current.target = aim
    }
  })

  return (
    <>
      <ambientLight ref={ambient} intensity={DAY_AMBIENT_INTENSITY} color={DAY_SKY_COLOR} />
      <hemisphereLight
        ref={hemi}
        intensity={DAY_HEMISPHERE_INTENSITY}
        color={DAY_SKY_COLOR}
        groundColor={DAY_GROUND_COLOR}
      />
      <directionalLight
        ref={sun}
        position={where}
        intensity={DAY_SUN_INTENSITY}
        color={DAY_SUN_COLOR}
        castShadow
        // The map is fitted to the flat and kept coarse on purpose, which is
        // what softens daylight: a piece gets a soft pool under it rather
        // than a hard outline of itself.
        shadow-mapSize={[SUN_SHADOW_MAP_PX, SUN_SHADOW_MAP_PX]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
        shadow-camera-left={-extent}
        shadow-camera-right={extent}
        shadow-camera-top={extent}
        shadow-camera-bottom={-extent}
        shadow-camera-near={0.5}
        shadow-camera-far={extent * 2 + 24}
      />
    </>
  )
}
