import { DAYLIGHT_EASE_S, SUN_LIGHT_POSITION_M, SUN_SHADOW_MAP_PX } from '#/constants.ts'
import { daylight } from '#/scene/daylight.ts'
import { planBounds } from '#/scene/framing.ts'
import {
  DAY_AMBIENT_INTENSITY,
  DAY_GROUND_COLOR,
  DAY_HEMISPHERE_INTENSITY,
  DAY_SKY_COLOR,
  DAY_SUN_COLOR,
  DAY_SUN_INTENSITY,
  NIGHT_AMBIENT_INTENSITY,
  NIGHT_GROUND_COLOR,
  NIGHT_HEMISPHERE_INTENSITY,
  NIGHT_SKY_COLOR,
  NIGHT_SUN_COLOR,
  NIGHT_SUN_INTENSITY,
  SUN_SHADOW_BLUR,
} from '#/theme.ts'
import type { HomeAssistant, RoomConfig } from '#/types.ts'
import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { Color, Object3D, type AmbientLight, type DirectionalLight, type HemisphereLight } from 'three'

// What the room is lit as: whatever the sun at the home says, or one of the
// two, which is what the editor's day and night button picks.
export type SkyMode = 'auto' | 'day' | 'night'

// The light the room sits in, which follows the sun at the user's home. It
// is one soft warm wash: a sky above and a floor bounce below, with a gentle
// sun on top of them whose shadows are blurred wide rather than cut sharp.
// At night the wash drops to a dim warm glow and the lamps carry the room.
export default function Sky({
  hass,
  rooms = [],
  mode = 'auto',
}: {
  hass: HomeAssistant | null
  rooms?: RoomConfig[]
  mode?: SkyMode
}) {
  const target = mode === 'auto' ? daylight(hass) : mode === 'day' ? 1 : 0
  const level = useRef(target)
  const ambient = useRef<AmbientLight>(null)
  const hemi = useRef<HemisphereLight>(null)
  const sun = useRef<DirectionalLight>(null)

  // The sun stands over the middle of the flat and covers exactly it, so its
  // shadow map stays fine enough not to speckle a tabletop.
  const { center, reach } = useMemo(() => planBounds(rooms), [rooms])
  const aim = useMemo(() => new Object3D(), [])
  const extent = Math.max(reach * 1.2 + 1, 3)

  const colors = useMemo(
    () => ({
      sky: [new Color(NIGHT_SKY_COLOR), new Color(DAY_SKY_COLOR)],
      ground: [new Color(NIGHT_GROUND_COLOR), new Color(DAY_GROUND_COLOR)],
      sun: [new Color(NIGHT_SUN_COLOR), new Color(DAY_SUN_COLOR)],
      mix: new Color(),
    }),
    [],
  )

  // Eased, so sunset arrives as a fade and not as a switch.
  useFrame((_, delta) => {
    const k = 1 - Math.exp(-delta / DAYLIGHT_EASE_S)
    level.current += (target - level.current) * k
    const day = level.current
    const between = (night: number, light: number) => night + (light - night) * day
    if (ambient.current) {
      ambient.current.intensity = between(NIGHT_AMBIENT_INTENSITY, DAY_AMBIENT_INTENSITY)
      ambient.current.color.copy(colors.mix.lerpColors(colors.sky[0], colors.sky[1], day))
    }
    if (hemi.current) {
      hemi.current.intensity = between(NIGHT_HEMISPHERE_INTENSITY, DAY_HEMISPHERE_INTENSITY)
      hemi.current.color.copy(colors.mix.lerpColors(colors.sky[0], colors.sky[1], day))
      hemi.current.groundColor.copy(colors.mix.lerpColors(colors.ground[0], colors.ground[1], day))
    }
    if (sun.current) {
      sun.current.intensity = between(NIGHT_SUN_INTENSITY, DAY_SUN_INTENSITY)
      sun.current.color.copy(colors.mix.lerpColors(colors.sun[0], colors.sun[1], day))
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
        position={[center[0] + SUN_LIGHT_POSITION_M[0], SUN_LIGHT_POSITION_M[1], center[2] + SUN_LIGHT_POSITION_M[2]]}
        intensity={DAY_SUN_INTENSITY}
        color={DAY_SUN_COLOR}
        castShadow
        shadow-mapSize={[SUN_SHADOW_MAP_PX, SUN_SHADOW_MAP_PX]}
        // Blurred wide: daylight lands as a soft pool under a piece rather
        // than a hard outline of it.
        shadow-radius={SUN_SHADOW_BLUR}
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
