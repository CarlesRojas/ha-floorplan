import { haptic, type TileEnv } from '#/tiles/actions.ts'
import { useHeld } from '#/tiles/features/parts.tsx'
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
  onTap: () => void
  onSend: (value: number) => void
}

// How far a finger goes sideways before the press is a drag.
const SLOP_PX = 8
// The value the handle starts to fade in at, and how strong it ends up at
// the end.
const GRIP_FROM = 95
const GRIP_OPACITY = 0.35
// How long the arrow keys wait for another press before they send.
const SEND_MS = 700

// A tile that is a value from 0 to 100 across its whole width, like a
// light's brightness or a fan's speed. The tile fills from the left as far
// as the value and looks like one that is on up to there, and like one
// that is off past it. A drag sideways anywhere on it moves that edge from
// where it was, following the finger smoothly, and when it lifts the value
// goes to the nearest step; down to nothing turns it off. A tap still turns
// it on or off. Near the end, where the edge is about to go, a short bar
// fades in just inside it to show there is something to drag.
export function FillTile({ env, config, entity, value: reported, step = 1, accent, glow, onTap, onSend }: Props) {
  const on = entity.state === 'on'
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
  const latest = useRef({ send, drag, snap })
  useEffect(() => {
    latest.current = { send, drag, snap }
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
      setDrag(Math.min(100, Math.max(0, s.from + (dx / width) * 100)))
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

  // The left and right arrows move a tenth, or a step when steps are
  // bigger.
  const keys = (e: KeyboardEvent) => {
    const by = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
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

  const state = Math.round(shown) === 0 ? 'Off' : `${Math.round(shown)}%`
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
        onTap={onTap}
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
