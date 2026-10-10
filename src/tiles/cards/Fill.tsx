import { callService, haptic, type TileEnv } from '#/tiles/actions.ts'
import { numberOf, useHeld } from '#/tiles/features/parts.tsx'
import type { TileConfig } from '#/tiles/host.tsx'
import { Tile } from '#/tiles/Tile.tsx'
import type { EntityState } from '#/types.ts'
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react'

type Props = {
  env: TileEnv
  config: TileConfig
  entity: EntityState
  // How far it is, from 0 to 100, and the steps it stops at, like the
  // speeds of a fan.
  value: number
  step?: number
  accent: string
  glow?: string
  // Whether it is on, open for a cover, when Home Assistant says more than
  // on and off.
  on?: boolean
  // What the line under the name says for a value, a percentage unless
  // it says otherwise.
  format?: (value: number) => string
  onTap: () => void
  onSend: (value: number) => void
  // The side it fills from: the left, or the bottom or the top for one
  // dragged up and down, like a blind or a screen that comes down.
  from?: 'left' | 'bottom' | 'top'
}

// How far a finger goes along the fill before the press is a drag.
const SLOP_PX = 8
// The value the handle starts to fade in at, and how strong it ends up at
// the end.
const GRIP_FROM = 95
const GRIP_OPACITY = 0.35
// How long the arrow keys wait for another press before they send.
const SEND_MS = 700

// A tile that is a value from 0 to 100 across its whole width, like a
// light's brightness, a fan's speed or how far a blind is open. The tile fills from the left as far
// as the value and looks like one that is on up to there, and like one
// that is off past it. A drag sideways anywhere on it moves that edge from
// where it was, following the finger smoothly, and when it lifts the value
// goes to the nearest step; down to nothing turns it off. A tap still turns
// it on or off. Near the end, where the edge is about to go, a short bar
// fades in just inside it to show there is something to drag. One that
// fills from the bottom or the top does the same up and down.
export function FillTile({
  env,
  config,
  entity,
  value: reported,
  step = 1,
  accent,
  glow,
  on = entity.state === 'on',
  format = v => (v === 0 ? 'Off' : `${v}%`),
  onTap,
  onSend,
  from = 'left',
}: Props) {
  const [value, hold] = useHeld(reported)
  const [drag, setDrag] = useState<number | null>(null)
  const box = useRef<HTMLDivElement>(null)
  const start = useRef<{ x: number; y: number; from: number; dragging: boolean } | null>(null)
  const keyTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const shown = drag ?? value

  // The nearest step, and the end itself for a step of a third that lands
  // a hair short of it.
  const snap = (v: number) => {
    const stepped = Math.round(v / step) * step
    if (100 - stepped < step / 100) return 100
    return Math.min(100, Math.max(0, Math.round(stepped * 100) / 100))
  }
  const send = (next: number) => {
    hold(next)
    onSend(next)
  }
  // The window listeners outlive a render, so they reach the latest ones
  // through here.
  const latest = useRef({ send, drag, snap, from })
  useEffect(() => {
    latest.current = { send, drag, snap, from }
  })

  useEffect(() => {
    const move = (e: PointerEvent) => {
      const s = start.current
      if (!s || !box.current) return
      const { from } = latest.current
      const vertical = from !== 'left'
      const along = from === 'left' ? e.clientX - s.x : from === 'top' ? e.clientY - s.y : s.y - e.clientY
      const across = vertical ? e.clientX - s.x : e.clientY - s.y
      if (!s.dragging) {
        if (Math.abs(along) < SLOP_PX || Math.abs(along) < Math.abs(across)) return
        s.dragging = true
      }
      const rect = box.current.getBoundingClientRect()
      const size = vertical ? rect.height : rect.width
      setDrag(Math.min(100, Math.max(0, s.from + (along / size) * 100)))
    }
    const up = () => {
      const s = start.current
      start.current = null
      if (!s?.dragging) return
      const { send, drag, snap } = latest.current
      setDrag(null)
      if (drag === null) return
      haptic('selection')
      send(snap(drag))
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
      clearTimeout(keyTimer.current)
    }
  }, [])

  const down = (e: ReactPointerEvent) => {
    if (e.button !== 0) return
    start.current = { x: e.clientX, y: e.clientY, from: shown, dragging: false }
  }

  // The arrows toward and away from where it fills from move a tenth, or a
  // step when steps are bigger.
  const keys = (e: KeyboardEvent) => {
    const [more, less] = {
      left: ['ArrowRight', 'ArrowLeft'],
      top: ['ArrowDown', 'ArrowUp'],
      bottom: ['ArrowUp', 'ArrowDown'],
    }[from]
    const by = e.key === more ? 1 : e.key === less ? -1 : 0
    if (!by) return
    e.preventDefault()
    const next = snap(shown + by * Math.max(step, 10))
    setDrag(next)
    clearTimeout(keyTimer.current)
    keyTimer.current = setTimeout(() => {
      setDrag(null)
      send(next)
    }, SEND_MS)
  }

  const state = format(Math.round(shown))
  return (
    <div
      ref={box}
      className="fp-fill"
      data-dragging={drag !== null || undefined}
      data-vertical={from !== 'left' || undefined}
      data-from={from}
      onPointerDownCapture={down}
      onKeyDown={keys}
    >
      <Tile
        env={env}
        config={config}
        entity={entity}
        active={on}
        looksOff
        role="switch"
        accent={accent}
        state={state}
        onTap={onTap}
      />
      <div
        className="fp-fill-lit"
        inert
        style={{
          clipPath: {
            left: `inset(0 ${100 - shown}% 0 0)`,
            top: `inset(0 0 ${100 - shown}% 0)`,
            bottom: `inset(${100 - shown}% 0 0 0)`,
          }[from],
        }}
      >
        <Tile env={env} config={config} entity={entity} active accent={accent} glow={glow} state={state} />
        <span
          className="fp-fill-grip"
          style={{
            [from === 'left' ? 'left' : 'top']:
              from === 'bottom' ? `calc(${100 - shown}% + 8px)` : `calc(${shown}% - 12px)`,
            opacity: GRIP_OPACITY * Math.max(0, (shown - GRIP_FROM) / (100 - GRIP_FROM)),
          }}
        />
      </div>
    </div>
  )
}

const SIDEWAYS = ['curtain', 'gate', 'door']

// A cover's or a valve's tile that is how far it is open, or with `tilt`
// how far its slats are tilted. A tap opens or closes it. A cover that
// goes up and down, like a blind, a shutter or a garage door, fills from
// the bottom as it rises, or from the top for a screen that comes down to
// open; one that slides aside, like a curtain or a gate, from the left.
export function PositionTile({
  env,
  config,
  entity,
  tilt = false,
}: {
  env: TileEnv
  config: TileConfig
  entity: EntityState
  tilt?: boolean
}) {
  const valve = entity.entity_id.startsWith('valve.')
  const domain = valve ? 'valve' : 'cover'
  const open = entity.state === 'open' || entity.state === 'opening'
  const value = tilt
    ? (numberOf(entity, 'current_tilt_position') ?? 0)
    : (numberOf(entity, 'current_position') ?? (open ? 100 : 0))
  const target = { entity_id: entity.entity_id }
  const sideways = valve || tilt || SIDEWAYS.includes(String(entity.attributes.device_class))
  return (
    <FillTile
      from={sideways ? 'left' : (config as { invert?: boolean }).invert ? 'top' : 'bottom'}
      env={env}
      config={config}
      entity={entity}
      value={value}
      on={tilt ? value > 0 : open}
      accent="var(--_accent-cover)"
      format={v => (tilt ? `Tilt ${v}%` : v === 0 ? 'Closed' : v === 100 ? 'Open' : `${v}%`)}
      onTap={() => callService(env.hass, `${domain}.toggle`, target)}
      onSend={v =>
        tilt
          ? callService(env.hass, 'cover.set_cover_tilt_position', { ...target, tilt_position: v })
          : callService(env.hass, `${domain}.set_${domain}_position`, { ...target, position: v })
      }
    />
  )
}
