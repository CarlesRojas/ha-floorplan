import { colorValue, materialValue, paramValue, type DecorationKind } from '#/decoration/catalog.ts'
import { Material } from '#/scene/decor/parts.tsx'
import { LAMP_SHADOW_MAP_PX } from '#/constants.ts'
import {
  CEILING_HEIGHT_M,
  LAMP_KEY_SHARE,
  LAMP_SHADOW_BLUR,
  LAMP_THROUGH_SHARE,
  LIGHT_POINT_INTENSITY,
} from '#/theme.ts'
import type { DecorationConfig } from '#/types.ts'

import { useEased } from '#/scene/decor/ease.ts'
import type { ItemState } from '#/scene/decor/state.ts'
import { useEffect, useMemo } from 'react'
import { Color } from 'three'
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js'

export type LightState = ItemState

type Props = {
  kind: DecorationKind
  item: DecorationConfig
  state: ItemState | null
}

// Smooth, chunky shapes: squashed spheres, capsules and domes, matte
// surfaces. Segment counts stay low so the silhouettes read as simple.
const SEG = 16

// Materials of the light family. The shade glows when on: an emissive tint
// scaled by level, plus a point light so the room picks it up.
function ShadeMaterial({
  color,
  material = 'matte',
  state,
}: {
  color: string
  material?: string
  state: LightState | null
}) {
  const glow = state?.glow ?? [1, 1, 1]
  // Eased, so a lamp fades up and down and follows a dimmer smoothly
  // instead of stepping with each update.
  const lit = useEased(state?.on ? (state.level ?? 1) : 0, 9)
  // A colored light on a chalky shade was barely a tint, since the shade's
  // own color carried the surface. The shade takes the light's color as it
  // comes up, so a green lamp reads green from across the room.
  const [gr, gg, gb] = glow
  const tint = useMemo(
    () => new Color(color).lerp(new Color(gr, gg, gb), 0.85 * lit).getStyle(),
    [color, gr, gg, gb, lit],
  )
  return (
    <Material
      material={material}
      color={tint}
      doubleSide
      // Parchment and opal glass are not walls. A lit shade turns slightly
      // translucent, so the bulb shows through it, and it still stops enough
      // of the light to throw a shadow.
      opacity={1 - 0.22 * lit}
      emissive={[glow[0], glow[1], glow[2]]}
      // Kept under one: past that the tone mapping rolls a bright color off
      // toward white, which is what made a colored lamp read as pale.
      emissiveIntensity={lit * (0.25 + lit * 0.7)}
    />
  )
}

function BaseMaterial({ color, material = 'matte' }: { color: string; material?: string }) {
  return <Material material={material} color={color} />
}

function Glow({ state, y, spread = 0 }: { state: LightState | null; y: number; spread?: number }) {
  const lit = useEased(state?.on ? (state.level ?? 1) : 0, 9)
  const [r, g, b] = state?.glow ?? [1, 1, 1]
  // Rect area lights need their uniform tables built once, and they only
  // light standard materials, which is what every model here uses.
  useEffect(() => {
    RectAreaLightUniformsLib.init()
  }, [])
  if (lit < 0.01) return null
  // Close to linear with the level: a lamp at a third still lights the
  // room around it, and still casts, instead of fading away first.
  const total = LIGHT_POINT_INTENSITY * (0.25 + 0.75 * lit) * lit
  // A strip is a line of light, not a point. A rect area light is one
  // continuous source, so the wash along a long strip is even instead of
  // beading wherever a point happens to sit.
  if (spread > 0.4) {
    return (
      <rectAreaLight
        position={[0, y - 0.02, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        width={spread}
        height={0.06}
        color={[r, g, b]}
        intensity={total * 4}
      />
    )
  }
  return (
    <>
      {/* The bulb. What the shade stops on its way out lands as a shadow of
          whatever stands around the lamp. */}
      <pointLight
        position={[0, y, 0]}
        color={[r, g, b]}
        intensity={total * LAMP_KEY_SHARE}
        distance={7}
        decay={1.6}
        castShadow
        shadow-mapSize={[LAMP_SHADOW_MAP_PX, LAMP_SHADOW_MAP_PX]}
        shadow-radius={LAMP_SHADOW_BLUR}
        // Small offsets: a big one pushes the sample past a thin top or
        // panel and lets the light through the middle of it.
        shadow-bias={-0.0012}
        shadow-normalBias={0.008}
        shadow-camera-near={0.05}
        shadow-camera-far={9}
      />
      {/* What comes through the shade itself. Parchment and opal glass are
          not walls: they glow, so this part reaches past the shade and casts
          nothing. */}
      <pointLight
        position={[0, y, 0]}
        color={[r, g, b]}
        intensity={total * LAMP_THROUGH_SHARE}
        distance={6}
        decay={1.7}
        userData={{ through: true }}
      />
    </>
  )
}

export default function LightModel({ kind, item, state }: Props) {
  const p = (id: string) => paramValue(kind, item.params, id)
  const c = (slot: string) => colorValue(kind, item.colors, slot)
  const m = (slot: string) => materialValue(kind, slot)
  const size = p('size')
  let body: React.ReactNode
  let glowY = 1
  // How far the light is spread along the item, for a strip.
  let glowSpread = 0
  switch (kind.id) {
    case 'light_ceiling': {
      // A plain round focus in the ceiling, ten centimeters across.
      const r = size / 2
      glowY = CEILING_HEIGHT_M - r - 0.05
      body = (
        <group>
          <mesh position={[0, CEILING_HEIGHT_M - 0.006, 0]}>
            <cylinderGeometry args={[r, r, 0.012, SEG * 2]} />
            <BaseMaterial color={c('rim')} material={m('rim')} />
          </mesh>
          <mesh position={[0, CEILING_HEIGHT_M - 0.014, 0]} userData={{ transmits: true }}>
            <cylinderGeometry args={[r * 0.88, r * 0.88, 0.006, SEG * 2]} />
            <ShadeMaterial color={c('focus')} material={m('focus')} state={state} />
          </mesh>
        </group>
      )
      break
    }
    case 'light_pendant': {
      // After the Nagoya: a drum of thin vertical wooden slats held by a ring
      // top and bottom, open at both ends so it lights the ceiling too, with
      // a translucent diffuser disc set inside the lower ring.
      const cord = p('cord')
      const r = size / 2
      const top = CEILING_HEIGHT_M - cord
      const drumH = size * 0.58
      const slats = Math.max(16, Math.round((Math.PI * size) / 0.035))
      const slatW = (Math.PI * size) / slats / 1.7
      glowY = top - drumH * 0.6
      body = (
        <>
          <mesh position={[0, CEILING_HEIGHT_M - 0.015, 0]}>
            <cylinderGeometry args={[0.05, 0.055, 0.03, SEG]} />
            <BaseMaterial color={c('cord')} material={m('cord')} />
          </mesh>
          <mesh position={[0, CEILING_HEIGHT_M - cord / 2, 0]}>
            <capsuleGeometry args={[0.006, cord, 4, 8]} />
            <BaseMaterial color={c('cord')} material={m('cord')} />
          </mesh>
          {/* The two rings the slats are strung on. */}
          {[top, top - drumH].map(y => (
            <mesh key={y} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[r, 0.006, 6, SEG * 3]} />
              <BaseMaterial color={c('rings')} material={m('rings')} />
            </mesh>
          ))}
          {Array.from({ length: slats }).map((_, i) => {
            const a = (i / slats) * Math.PI * 2
            return (
              <mesh
                key={i}
                position={[Math.cos(a) * r, top - drumH / 2, Math.sin(a) * r]}
                rotation={[0, -a, 0]}
                castShadow
              >
                <boxGeometry args={[0.004, drumH, slatW]} />
                <BaseMaterial color={c('slats')} material={m('slats')} />
              </mesh>
            )
          })}
          {/* The diffuser, a translucent disc across the bottom of the drum. */}
          <mesh position={[0, top - drumH + 0.012, 0]} userData={{ transmits: true }}>
            <cylinderGeometry args={[r * 0.96, r * 0.96, 0.01, SEG * 2]} />
            <ShadeMaterial color={c('diffuser')} material={m('diffuser')} state={state} />
          </mesh>
        </>
      )
      break
    }
    case 'light_floor': {
      // After the TMM: a square beech shaft on a cross foot, with a
      // cylindrical parchment shade sitting near the top of it.
      const height = p('height')
      const r = size / 2
      const shadeH = size * 0.85
      const post = 0.028
      const shadeY = height - shadeH
      glowY = shadeY + shadeH * 0.5
      body = (
        <>
          {/* The foot: two flat battens crossing under the shaft. */}
          {[0, Math.PI / 2].map(a => (
            <mesh key={a} position={[0, 0.012, 0]} rotation={[0, a, 0]}>
              <boxGeometry args={[size * 1.5, 0.024, post * 1.6]} />
              <BaseMaterial color={c('stand')} material={m('stand')} />
            </mesh>
          ))}
          <mesh position={[0, height / 2, 0]} castShadow>
            <boxGeometry args={[post, height, post]} />
            <BaseMaterial color={c('stand')} material={m('stand')} />
          </mesh>
          {/* The shade hangs on the front of the shaft, the way it is
              hooked onto the mast, so the shaft stays outside it. */}
          <mesh position={[0, shadeY + shadeH / 2, r + post * 0.4]} castShadow userData={{ transmits: true }}>
            <cylinderGeometry args={[r, r, shadeH, SEG * 2, 1, true]} />
            <ShadeMaterial color={c('shade')} material={m('shade')} state={state} />
          </mesh>
        </>
      )
      break
    }
    case 'light_table': {
      // After the Cestita: an opal glass globe sitting in a little basket of
      // bent wooden ribs, which cross over the top into a handle.
      const height = p('height')
      const r = size / 2
      const globeR = height * 0.24
      const globeY = height * 0.42
      glowY = globeY
      body = (
        <group>
          {/* The ring the globe sits in. */}
          <mesh position={[0, height * 0.14, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[globeR * 0.86, 0.008, 6, SEG * 2]} />
            <BaseMaterial color={c('basket')} material={m('basket')} />
          </mesh>
          {/* Two ribs, each bent right over the globe, crossing at the top. */}
          {[0, Math.PI / 2].map(a => (
            <mesh key={a} position={[0, height * 0.5, 0]} rotation={[0, a, 0]} scale={[r, height * 0.5, r]} castShadow>
              <torusGeometry args={[1, 0.013 / r, 6, 36, Math.PI]} />
              <BaseMaterial color={c('basket')} material={m('basket')} />
            </mesh>
          ))}
          {/* The collar where they meet, which doubles as the handle. */}
          <mesh position={[0, height - 0.01, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.016, 0.009, 6, SEG * 2]} />
            <BaseMaterial color={c('basket')} material={m('basket')} />
          </mesh>
          <mesh position={[0, globeY, 0]} castShadow userData={{ transmits: true }}>
            <sphereGeometry args={[globeR, SEG * 2, SEG * 2]} />
            <ShadeMaterial color={c('globe')} material={m('globe')} state={state} />
          </mesh>
        </group>
      )
      break
    }
    case 'light_wall': {
      // After the TMM wall lamp: a beech channel on the wall with a
      // cylindrical parchment shade dropped into it.
      const height = p('height')
      const r = size / 2
      const shadeH = size * 0.95
      const rail = 0.018
      glowY = height + shadeH * 0.1
      body = (
        <group position={[0, height, 0]}>
          {/* The channel: a back board with a rail down each edge. */}
          <mesh position={[0, 0, rail / 2]}>
            <boxGeometry args={[size + rail * 2, shadeH * 1.05, rail]} />
            <BaseMaterial color={c('channel')} material={m('channel')} />
          </mesh>
          {[-1, 1].map(s2 => (
            <mesh key={s2} position={[(s2 * (size + rail)) / 2, 0, rail + r * 0.3]}>
              <boxGeometry args={[rail, shadeH * 1.05, r * 0.6]} />
              <BaseMaterial color={c('channel')} material={m('channel')} />
            </mesh>
          ))}
          {/* The shade sits in the channel, proud of it at the front. */}
          <mesh position={[0, 0, rail + r * 0.55]} castShadow userData={{ transmits: true }}>
            <cylinderGeometry args={[r, r, shadeH, SEG * 2, 1, true]} />
            <ShadeMaterial color={c('shade')} material={m('shade')} state={state} />
          </mesh>
          {/* The pull cord that switches it. */}
          <mesh position={[0, -shadeH * 0.85, rail + r * 0.55]}>
            <capsuleGeometry args={[0.003, shadeH * 0.5, 3, 6]} />
            <BaseMaterial color={c('channel')} material={m('channel')} />
          </mesh>
        </group>
      )
      break
    }
    case 'light_strip':
    case 'light_strip_ceiling':
    case 'light_strip_wall': {
      // An aluminium channel with a frosted diffuser in it. Lights place
      // themselves, so the ceiling one goes up to the ceiling and the other
      // two take their own height.
      const length = p('length')
      const height = kind.id === 'light_strip_ceiling' ? CEILING_HEIGHT_M - 0.04 : p('height')
      glowY = height + 0.05
      glowSpread = length
      body = (
        <group>
          <mesh position={[0, height + 0.035, 0]}>
            <boxGeometry args={[length, 0.022, 0.03]} />
            <BaseMaterial color={c('channel')} material={m('channel')} />
          </mesh>
          <mesh position={[0, height + 0.018, 0]} rotation={[0, 0, Math.PI / 2]} userData={{ transmits: true }}>
            <capsuleGeometry args={[0.016, Math.max(length - 0.032, 0.05), 4, 10]} />
            <ShadeMaterial color={c('diffuser')} material={m('diffuser')} state={state} />
          </mesh>
        </group>
      )
      break
    }
    default:
      body = null
  }

  return (
    <>
      {body}
      <Glow state={state} y={glowY} spread={glowSpread} />
    </>
  )
}
