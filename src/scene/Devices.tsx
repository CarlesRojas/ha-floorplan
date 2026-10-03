import { betweenOf, roomLookedFrom } from '#/decoration/between.ts'
import { decorationKind } from '#/decoration/catalog.ts'
import { canTry, tryItemState, type TryStates } from '#/editor/tryState.ts'
import DecorationModel from '#/scene/decor/DecorationModel.tsx'
import { deskRise } from '#/scene/decor/state.ts'
import type { ItemState } from '#/scene/decor/state.ts'
import {
  clickAction,
  clickOutcome,
  deviceSignals,
  kelvinToRgb,
  levelChannels,
  levelValues,
  signalValues,
} from '#/signals.ts'
import { LIGHT_GLOW_COLOR } from '#/theme.ts'
import type { CardConfig, DeviceConfig, HomeAssistant } from '#/types.ts'
import { useThree } from '@react-three/fiber'
import { useEffect, useState } from 'react'
import { Color, MathUtils, SRGBColorSpace, Vector3 } from 'three'

type Props = {
  hass: HomeAssistant | null
  config: CardConfig
  // In the editor, a press also picks the piece it landed on.
  onPick?: (id: string) => void
  // In the editor, the states tried on pieces with no device, and a click on
  // one of those steps its state the way a device's click would.
  tries?: TryStates
  onTry?: (id: string) => void
  // Asked before a click acts on a device, with the room its piece stands
  // in. True means the click was spent on the room instead.
  roomFirst?: (room: string) => boolean
}

// The last color each light was seen with. Home Assistant drops rgb_color
// and brightness the moment a light goes off, so without this the shade
// jumps to the default warm glow for the length of the fade out: a flicker
// of the wrong color on the way down.
const lastGlow = new Map<string, [number, number, number]>()
// The default glow, and a scratch color for converting Home Assistant's,
// built once rather than on every state change of every light.
const baseGlow = new Color(LIGHT_GLOW_COLOR)
const scratch = new Color()

// What a click said a device would be, until Home Assistant reports it or
// this long goes by. Home Assistant's own toggles do the same: they flip at
// once and fall back if nothing confirms them. Without it a piece sat still
// for as long as the device took to answer, which for a lamp on a cloud
// account can be a second or two.
const GUESS_MS = 2000

// What a bound device tells its decoration items. Null when the device says
// nothing a model can draw, so the item stays neutral.
function itemState(hass: HomeAssistant, device: DeviceConfig, guesses: Map<string, boolean>): ItemState | null {
  const entityId = device.entity_id
  const signals = deviceSignals(hass, entityId)
  if (signals.length === 0) return null
  const v = signalValues(hass, entityId)
  // A guess stands until the device agrees with it, or its timer ends it.
  if (guesses.get(entityId) === v.on) guesses.delete(entityId)
  const on = guesses.get(entityId) ?? v.on ?? false
  let glow: [number, number, number] = [baseGlow.r, baseGlow.g, baseGlow.b]
  // Home Assistant's colors are sRGB. Handing the raw numbers to three,
  // which works in linear, washed every color out toward white: a magenta
  // light came out pale pink.
  const fromSrgb = ([r, g, b]: [number, number, number]): [number, number, number] => {
    const c = scratch.setRGB(r, g, b, SRGBColorSpace)
    return [c.r, c.g, c.b]
  }
  if (v.color) glow = fromSrgb([v.color[0] / 255, v.color[1] / 255, v.color[2] / 255])
  else if (v.warmth) glow = fromSrgb(kelvinToRgb(v.warmth))
  if (v.color || v.warmth) lastGlow.set(entityId, glow)
  // Saying nothing about its color: off, or guessed on before Home Assistant
  // has said what color it is. Either way it shows the color it was last
  // lit with.
  else glow = lastGlow.get(entityId) ?? glow

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

export default function Devices({ hass, config, onPick, tries, onTry, roomFirst }: Props) {
  const devices = config.devices ?? []
  const decorations = config.decorations ?? []
  const rooms = config.rooms ?? []
  const boundTo = new Map<string, DeviceConfig>()
  for (const device of devices) for (const id of device.decorations ?? []) boundTo.set(id, device)
  // By id, so a plan of a few hundred pieces is not searched end to end
  // for every one of them on every state change.
  const byId = new Map(decorations.map(d => [d.id, d]))
  const roomById = new Map(rooms.map(r => [r.id, r]))

  // The guesses clicks have made, by entity, and the timers that end them.
  // A guess that runs out has to be drawn again to fall back, and nothing
  // else prompts a render just then.
  const [guesses] = useState(() => new Map<string, boolean>())
  const [timers] = useState(() => new Map<string, ReturnType<typeof setTimeout>>())
  const [, redraw] = useState(0)
  useEffect(
    () => () => {
      for (const timer of timers.values()) clearTimeout(timer)
      timers.clear()
    },
    [timers],
  )

  const act = (entityId: string) => {
    const action = clickAction(entityId, hass?.states[entityId]?.state)
    if (!hass || !action) return
    // A second click before the first is answered flips the guess, not the
    // device, so two quick clicks show what two toggles leave.
    const outcome = clickOutcome(hass, entityId, guesses.get(entityId))
    if (outcome !== undefined) {
      guesses.set(entityId, outcome)
      // A second click on the same piece starts its wait over.
      const earlier = timers.get(entityId)
      if (earlier !== undefined) clearTimeout(earlier)
      timers.set(
        entityId,
        setTimeout(() => {
          timers.delete(entityId)
          guesses.delete(entityId)
          redraw(n => n + 1)
        }, GUESS_MS),
      )
      redraw(n => n + 1)
    }
    // A call Home Assistant refuses must not surface as an unhandled
    // rejection in the dashboard. Its own toast already says what went wrong.
    hass.callService(action.domain, action.service, { entity_id: entityId }).catch(() => {})
  }

  // Home Assistant's own dialog for the entity, which carries the controls a
  // click cannot stand in for: brightness, color, a cover's position. The
  // event has to cross the card's shadow root to reach it.
  const gl = useThree(state => state.gl)
  const get = useThree(state => state.get)
  const openMoreInfo = (entityId: string) => {
    gl.domElement.dispatchEvent(
      new CustomEvent('hass-more-info', { detail: { entityId }, bubbles: true, composed: true }),
    )
  }

  // What a press on each piece does. The models are only drawn again when
  // they change, so each is handed a handler that stays the same and calls
  // whatever this render says a press does now.
  const [actions] = useState(() => new Map<string, { click?: () => void; open?: () => void }>())
  const [handlers] = useState(() => new Map<string, { click: () => void; open: () => void }>())
  const handler = (id: string) => {
    let h = handlers.get(id)
    if (!h) {
      h = { click: () => actions.get(id)?.click?.(), open: () => actions.get(id)?.open?.() }
      handlers.set(id, h)
    }
    return h
  }

  const stateOf = (item: (typeof decorations)[number]) => {
    const device = boundTo.get(item.id)
    const kind = decorationKind(item.kind)
    // With nothing behind it, a piece the editor can try states on shows
    // the one tried last, and a click steps it.
    const tried = !device && onTry && kind && canTry(kind)
    const tryState = tried ? tries?.[item.id] : undefined
    const state =
      device && hass ? itemState(hass, device, guesses) : kind && tryState ? tryItemState(kind, tryState) : null
    return { device, kind, tried, state }
  }
  const states = new Map(decorations.map(item => [item.id, stateOf(item)]))
  // How far each piece is carried up by the standing desks it stands on,
  // directly or on something else that stands on one.
  const raise = (item: (typeof decorations)[number]) => {
    let total = 0
    let at = item
    for (let depth = 0; at.on && depth < 6; depth++) {
      const below = byId.get(at.on)
      if (!below) break
      if (below.kind === 'desk') total += deskRise(states.get(below.id)?.state ?? null)
      at = below
    }
    return total
  }

  return (
    <>
      {decorations.map(item => {
        const { device, tried, state } = states.get(item.id) ?? stateOf(item)
        // A piece in a wall between two rooms sends its first click to the
        // room it is looked at from, the one the camera looks out of.
        const between = betweenOf(item, rooms)
        const roomOf = () => {
          if (!between) return item.room
          const turn = MathUtils.degToRad(item.rotation ?? 0)
          const camera = get().camera
          const look = camera.getWorldDirection(new Vector3())
          return roomLookedFrom(between, item.position[0], -item.position[1], turn, look, camera.position)
        }
        // A press does what the device says, and in the editor also picks
        // the piece. A piece with nothing behind it is still pickable.
        const onClick =
          device || onPick || tried
            ? () => {
                onPick?.(item.id)
                if (device) {
                  if (!roomFirst?.(roomOf())) act(device.entity_id)
                } else if (tried) onTry?.(item.id)
              }
            : undefined
        const onOpen = device ? () => openMoreInfo(device.entity_id) : undefined
        actions.set(item.id, { click: onClick, open: onOpen })
        const h = handler(item.id)
        return (
          <DecorationModel
            key={item.id}
            item={item}
            all={decorations}
            room={roomById.get(item.room)}
            between={between}
            state={state}
            raise={raise(item)}
            onClick={onClick && h.click}
            onOpen={onOpen && h.open}
          />
        )
      })}
    </>
  )
}
