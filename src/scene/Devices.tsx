import { deviceType } from '#/devices/catalog.ts'
import DecorationModel from '#/scene/decor/DecorationModel.tsx'
import { usePressActions } from '#/scene/decor/press.ts'
import type { ItemState } from '#/scene/decor/state.ts'
import { clickAction, deviceSignals, kelvinToRgb, signalValues } from '#/signals.ts'
import { CEILING_HEIGHT_M, DEVICE_SPHERE_COLOR, DEVICE_SPHERE_RADIUS_M, LIGHT_GLOW_COLOR } from '#/theme.ts'
import type { CardConfig, DeviceConfig, HomeAssistant } from '#/types.ts'
import { useThree } from '@react-three/fiber'
import { Color, SRGBColorSpace } from 'three'

type Props = {
  hass: HomeAssistant | null
  config: CardConfig
}

const CEILING_TYPES = new Set(['ceiling', 'ceiling_lamp', 'spot', 'ceiling_fan'])

function sphereHeight(device: DeviceConfig) {
  const type = deviceType(device)?.id
  if (type && CEILING_TYPES.has(type)) return CEILING_HEIGHT_M - 0.3
  if (type === 'led_strip') return 0.1
  return 0.9
}

// What a bound device tells its decoration items. Null when the device says
// The last color each light was seen with. Home Assistant drops rgb_color
// and brightness the moment a light goes off, so without this the shade
// jumps to the default warm glow for the length of the fade out: a flicker
// of the wrong color on the way down.
const lastGlow = new Map<string, [number, number, number]>()

// nothing a model can draw, so the item stays neutral.
function itemState(hass: HomeAssistant, entityId: string): ItemState | null {
  const signals = deviceSignals(hass, entityId)
  if (signals.length === 0) return null
  const v = signalValues(hass, entityId)
  const base = new Color(LIGHT_GLOW_COLOR)
  let glow: [number, number, number] = [base.r, base.g, base.b]
  // Home Assistant's colors are sRGB. Handing the raw numbers to three,
  // which works in linear, washed every color out toward white: a magenta
  // light came out pale pink.
  const fromSrgb = ([r, g, b]: [number, number, number]): [number, number, number] => {
    const c = new Color().setRGB(r, g, b, SRGBColorSpace)
    return [c.r, c.g, c.b]
  }
  if (v.color) glow = fromSrgb([v.color[0] / 255, v.color[1] / 255, v.color[2] / 255])
  else if (v.warmth) glow = fromSrgb(kelvinToRgb(v.warmth))
  const on = v.on ?? false
  if (v.color || v.warmth) lastGlow.set(entityId, glow)
  // Off, and saying nothing about its color: it fades out in the color it
  // was lit with.
  else if (!on) glow = lastGlow.get(entityId) ?? glow
  return {
    on,
    level: signals.includes('level') ? (v.level ?? 1) : 1,
    glow,
    value: v.value,
    text: v.state,
  }
}

// A device with nothing standing in for it, shown as a small sphere that
// lights up with it.
function DeviceSphere({
  position,
  on,
  onClick,
  onOpen,
}: {
  position: [number, number, number]
  on: boolean
  onClick: () => void
  onOpen: () => void
}) {
  const interactive = usePressActions(onClick, onOpen)
  return (
    <mesh position={position} {...interactive}>
      <sphereGeometry args={[DEVICE_SPHERE_RADIUS_M, 12, 8]} />
      <meshStandardMaterial
        color={DEVICE_SPHERE_COLOR}
        emissive={LIGHT_GLOW_COLOR}
        emissiveIntensity={on ? 1.2 : 0}
        roughness={0.6}
      />
    </mesh>
  )
}

export default function Devices({ hass, config }: Props) {
  const devices = config.devices ?? []
  const decorations = config.decorations ?? []
  const boundTo = new Map<string, DeviceConfig>()
  for (const device of devices) for (const id of device.decorations ?? []) boundTo.set(id, device)

  const act = (entityId: string) => {
    const action = clickAction(entityId)
    if (hass && action) void hass.callService(action.domain, action.service, { entity_id: entityId })
  }

  // Home Assistant's own dialog for the entity, which carries the controls a
  // click cannot stand in for: brightness, color, a cover's position. The
  // event has to cross the card's shadow root to reach it.
  const gl = useThree(state => state.gl)
  const openMoreInfo = (entityId: string) => {
    gl.domElement.dispatchEvent(
      new CustomEvent('hass-more-info', { detail: { entityId }, bubbles: true, composed: true }),
    )
  }

  return (
    <>
      {devices.map(device => {
        const bound = (device.decorations ?? []).some(id => decorations.some(d => d.id === id))
        if (bound) return null
        const on = hass ? (signalValues(hass, device.entity_id).on ?? false) : false
        return (
          <DeviceSphere
            key={device.entity_id}
            position={[device.position[0], sphereHeight(device), -device.position[1]]}
            on={on}
            onClick={() => act(device.entity_id)}
            onOpen={() => openMoreInfo(device.entity_id)}
          />
        )
      })}
      {decorations.map(item => {
        const device = boundTo.get(item.id)
        const state = device && hass ? itemState(hass, device.entity_id) : null
        return (
          <DecorationModel
            key={item.id}
            item={item}
            all={decorations}
            state={state}
            onClick={device ? () => act(device.entity_id) : undefined}
            onOpen={device ? () => openMoreInfo(device.entity_id) : undefined}
          />
        )
      })}
    </>
  )
}
