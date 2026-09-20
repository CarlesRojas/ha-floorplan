import { deviceType } from '#/devices/catalog.ts'
import DecorationModel from '#/scene/decor/DecorationModel.tsx'
import type { ItemState } from '#/scene/decor/state.ts'
import { clickAction, deviceSignals, kelvinToRgb, signalValues } from '#/signals.ts'
import { CEILING_HEIGHT_M, DEVICE_SPHERE_COLOR, DEVICE_SPHERE_RADIUS_M, LIGHT_GLOW_COLOR } from '#/theme.ts'
import type { CardConfig, DeviceConfig, HomeAssistant } from '#/types.ts'
import { Color } from 'three'

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
// nothing a model can draw, so the item stays neutral.
function itemState(hass: HomeAssistant, entityId: string): ItemState | null {
  const signals = deviceSignals(hass, entityId)
  if (signals.length === 0) return null
  const v = signalValues(hass, entityId)
  const base = new Color(LIGHT_GLOW_COLOR)
  let glow: [number, number, number] = [base.r, base.g, base.b]
  if (v.color) glow = [v.color[0] / 255, v.color[1] / 255, v.color[2] / 255]
  else if (v.warmth) glow = kelvinToRgb(v.warmth)
  return {
    on: v.on ?? false,
    level: signals.includes('level') ? (v.level ?? 1) : 1,
    glow,
    value: v.value,
    text: v.state,
  }
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

  return (
    <>
      {devices.map(device => {
        const bound = (device.decorations ?? []).some(id => decorations.some(d => d.id === id))
        if (bound) return null
        const on = hass ? (signalValues(hass, device.entity_id).on ?? false) : false
        return (
          <mesh
            key={device.entity_id}
            position={[device.position[0], sphereHeight(device), -device.position[1]]}
            onClick={e => {
              e.stopPropagation()
              act(device.entity_id)
            }}
            onPointerOver={() => (document.body.style.cursor = 'pointer')}
            onPointerOut={() => (document.body.style.cursor = '')}
          >
            <sphereGeometry args={[DEVICE_SPHERE_RADIUS_M, 12, 8]} />
            <meshStandardMaterial
              color={DEVICE_SPHERE_COLOR}
              emissive={LIGHT_GLOW_COLOR}
              emissiveIntensity={on ? 1.2 : 0}
              roughness={0.6}
            />
          </mesh>
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
          />
        )
      })}
    </>
  )
}
