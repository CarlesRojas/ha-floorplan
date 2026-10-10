import { callService, haptic, type TileEnv } from '#/tiles/actions.ts'
import { useHeld } from '#/tiles/features/parts.tsx'
import type { TileConfig } from '#/tiles/host.tsx'
import { Tile } from '#/tiles/Tile.tsx'
import type { EntityState } from '#/types.ts'
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react'

type Props = {
  env: TileEnv
  config: TileConfig
  entity: EntityState
  accent: string
  glow: string
}

// How far a finger goes sideways before the press is a drag.
const SLOP_PX = 8
// The brightness the handle starts to fade in at, and how strong it ends
// up at full brightness.
const GRIP_FROM = 95
const GRIP_OPACITY = 0.35
// How long the arrow keys wait for another press before they send.
const SEND_MS = 700

// A light whose whole tile is its brightness. The tile fills from the left
// as far as the light is bright and looks like a light that is on up to
// there, and like one that is off past it. A drag sideways anywhere on it
// moves that edge from where it was, and down to nothing turns the light
// off. A tap still turns the light on or off, back to the brightness it
// had. Near full brightness, where the edge is about to go, a short bar
// fades in just inside it to show there is something to drag.
export function BrightnessTile({ env, config, entity, accent, glow }: Props) {
  const on = entity.state === 'on'
  const brightness = typeof entity.attributes.brightness === 'number' ? entity.attributes.brightness : 255
  const [value, hold] = useHeld(on ? Math.max(1, Math.round((brightness / 255) * 100)) : 0)
  const [drag, setDrag] = useState<number | null>(null)
  const box = useRef<HTMLDivElement>(null)
  const start = useRef<{ x: number; y: number; from: number; dragging: boolean } | null>(null)
  const keyTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const shown = drag ?? value

  const send = (next: number) => {
    hold(next)
    if (next === 0) callService(env.hass, 'light.turn_off', { entity_id: entity.entity_id })
    else callService(env.hass, 'light.turn_on', { entity_id: entity.entity_id, brightness_pct: next })
  }
  // The window listeners outlive a render, so they reach the latest ones
  // through here.
  const latest = useRef({ send, drag })
  useEffect(() => {
    latest.current = { send, drag }
  })

  useEffect(() => {
    const move = (e: PointerEvent) => {
      const s = start.current
      if (!s || !box.current) return
      const dx = e.clientX - s.x
      if (!s.dragging) {
        if (Math.abs(dx) < SLOP_PX || Math.abs(dx) < Math.abs(e.clientY - s.y)) return
        s.dragging = true
      }
      const width = box.current.getBoundingClientRect().width
      setDrag(Math.round(Math.min(100, Math.max(0, s.from + (dx / width) * 100))))
    }
    const up = () => {
      const s = start.current
      start.current = null
      if (!s?.dragging) return
      const { send, drag } = latest.current
      setDrag(null)
      if (drag === null) return
      haptic('selection')
      send(drag)
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

  // The left and right arrows dim and brighten in steps of a tenth.
  const keys = (e: KeyboardEvent) => {
    const by = e.key === 'ArrowRight' ? 10 : e.key === 'ArrowLeft' ? -10 : 0
    if (!by) return
    e.preventDefault()
    const next = Math.min(100, Math.max(0, shown + by))
    setDrag(next)
    clearTimeout(keyTimer.current)
    keyTimer.current = setTimeout(() => {
      setDrag(null)
      send(next)
    }, SEND_MS)
  }

  const state = shown === 0 ? 'Off' : `${shown}%`
  const toggle = () => callService(env.hass, 'light.toggle', { entity_id: entity.entity_id })
  return (
    <div
      ref={box}
      className="fp-fill"
      data-dragging={drag !== null || undefined}
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
        onTap={toggle}
      />
      <div className="fp-fill-lit" inert style={{ clipPath: `inset(0 ${100 - shown}% 0 0)` }}>
        <Tile env={env} config={config} entity={entity} active accent={accent} glow={glow} state={state} />
        <span
          className="fp-fill-grip"
          style={{
            left: `calc(${shown}% - 12px)`,
            opacity: GRIP_OPACITY * Math.max(0, (shown - GRIP_FROM) / (100 - GRIP_FROM)),
          }}
        />
      </div>
    </div>
  )
}
