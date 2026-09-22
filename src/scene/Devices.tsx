import DecorationModel from '#/scene/decor/DecorationModel.tsx'
import type { ItemState } from '#/scene/decor/state.ts'
import { clickAction, deviceSignals, kelvinToRgb, levelChannels, levelValues, signalValues } from '#/signals.ts'
import { LIGHT_GLOW_COLOR } from '#/theme.ts'
import type { CardConfig, DeviceConfig, HomeAssistant } from '#/types.ts'
import { useThree } from '@react-three/fiber'
import { Color, SRGBColorSpace } from 'three'

type Props = {
  hass: HomeAssistant | null
  config: CardConfig
  // In the editor, a press also picks the piece it landed on.
  onPick?: (id: string) => void
}

// The last color each light was seen with. Home Assistant drops rgb_color
// and brightness the moment a light goes off, so without this the shade
// jumps to the default warm glow for the length of the fade out: a flicker
// of the wrong color on the way down.
const lastGlow = new Map<string, [number, number, number]>()

// What a bound device tells its decoration items. Null when the device says
// nothing a model can draw, so the item stays neutral.
function itemState(hass: HomeAssistant, device: DeviceConfig): ItemState | null {
  const entityId = device.entity_id
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

  // Which of the device's percentages feeds each of the item's. What the
  // device was told to use wins, then one of the same name, then its first
  // percentage for whatever the item calls its main one.
  const channels = levelChannels(hass, entityId)
  const values = levelValues(hass, entityId)
  const pick = (itemChannel: string) => {
    const chosen = device.levels?.[itemChannel]
    if (chosen) return values[chosen]
    if (values[itemChannel] !== undefined) return values[itemChannel]
    return itemChannel === 'tilt' ? undefined : channels[0] && values[channels[0].id]
  }
  const levels: Record<string, number> = {}
  for (const id of ['open', 'tilt']) {
    const value = pick(id)
    if (value !== undefined) levels[id] = value
  }
  return {
    on,
    // Missing, not one, when the device has no percentage: a device that
    // only switches must not read as fully open.
    level: signals.includes('level') ? levels.open : undefined,
    levels,
    glow,
    value: v.value,
    text: v.state,
  }
}

export default function Devices({ hass, config, onPick }: Props) {
  const devices = config.devices ?? []
  const decorations = config.decorations ?? []
  const rooms = config.rooms ?? []
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
      {decorations.map(item => {
        const device = boundTo.get(item.id)
        const state = device && hass ? itemState(hass, device) : null
        // A press does what the device says, and in the editor also picks
        // the piece. A piece with nothing behind it is still pickable.
        const onClick =
          device || onPick
            ? () => {
                onPick?.(item.id)
                if (device) act(device.entity_id)
              }
            : undefined
        return (
          <DecorationModel
            key={item.id}
            item={item}
            all={decorations}
            room={rooms.find(r => r.id === item.room)}
            state={state}
            onClick={onClick}
            onOpen={device ? () => openMoreInfo(device.entity_id) : undefined}
          />
        )
      })}
    </>
  )
}
