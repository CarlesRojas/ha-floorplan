import { useRef, useState, type KeyboardEvent, type MouseEvent, type PointerEvent } from 'react'
import { haptic } from '#/tiles/actions.ts'

const HOLD_MS = 500
// How far a finger can drift before the press counts as a scroll.
const SLOP_PX = 10
// A touch long press can also raise a context menu. One hold, not two.
const SETTLE_MS = 800

type Options = { onTap?: () => void; onHold?: () => void; haptics?: boolean }

// Tap, long press, right click and keyboard on a tile. A tap runs on click,
// so a press that turned into a scroll or a hold never also taps. Inner
// buttons stop their events so they never reach these.
export function useTileGestures({ onTap, onHold, haptics = true }: Options) {
  const [pressed, setPressed] = useState(false)
  const press = useRef({ timer: 0, x: 0, y: 0, held: false, heldAt: 0, moved: false })

  const cancel = () => {
    clearTimeout(press.current.timer)
    press.current.timer = 0
    setPressed(false)
  }

  const hold = () => {
    const now = Date.now()
    if (now - press.current.heldAt < SETTLE_MS) return
    press.current.held = true
    press.current.heldAt = now
    if (haptics) haptic('medium')
    onHold?.()
  }

  const tap = () => {
    if (!onTap) return
    if (haptics) haptic('light')
    onTap()
  }

  return {
    pressed,
    handlers: {
      onPointerDown: (e: PointerEvent) => {
        if (e.button !== 0) return
        const p = press.current
        Object.assign(p, { x: e.clientX, y: e.clientY, held: false, moved: false })
        setPressed(true)
        clearTimeout(p.timer)
        p.timer = window.setTimeout(() => {
          cancel()
          hold()
        }, HOLD_MS)
      },
      onPointerMove: (e: PointerEvent) => {
        const p = press.current
        if (!p.timer || Math.hypot(e.clientX - p.x, e.clientY - p.y) < SLOP_PX) return
        p.moved = true
        cancel()
      },
      onPointerUp: cancel,
      onPointerCancel: () => {
        press.current.moved = true
        cancel()
      },
      onPointerLeave: cancel,
      onClick: (e: MouseEvent) => {
        const p = press.current
        if (p.held || p.moved) {
          p.held = p.moved = false
          return
        }
        e.preventDefault()
        tap()
      },
      onContextMenu: (e: MouseEvent) => {
        e.preventDefault()
        cancel()
        hold()
      },
      onKeyDown: (e: KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          if (!e.repeat) tap()
        } else if (e.key === 'ContextMenu' || (e.key === 'F10' && e.shiftKey)) {
          e.preventDefault()
          hold()
        }
      },
    },
  }
}

// Spread on a button inside a tile, so pressing it never presses the tile.
export const insideTile = {
  onPointerDown: (e: PointerEvent) => e.stopPropagation(),
  onKeyDown: (e: KeyboardEvent) => e.stopPropagation(),
}

// Spread on a menu or a sheet that pops up from inside a tile, so picking
// anything in it never also presses the tile under it.
export const popsOver = {
  onPointerDown: (e: PointerEvent) => e.stopPropagation(),
  onClick: (e: MouseEvent) => e.stopPropagation(),
  onKeyDown: (e: KeyboardEvent) => e.stopPropagation(),
}
