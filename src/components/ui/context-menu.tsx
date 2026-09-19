import { cn } from '#/lib/utils.ts'
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'

// Context menu in the shadcn style. It does not wrap Radix: the fullscreen
// editor stops pointer and key events at its boundary so Home Assistant's
// dialog ignores them, and Radix dismisses its menus through listeners on
// document that would never fire. Dismissal here uses capture phase
// listeners, which run before that boundary is reached.

export type ContextMenuPosition = { x: number; y: number }

type ContextMenuProps = {
  position: ContextMenuPosition | null
  onClose: () => void
  children: ReactNode
  className?: string
}

export function ContextMenu({ position, onClose, children, className }: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [placed, setPlaced] = useState<ContextMenuPosition | null>(null)

  // Keep the menu inside the viewport.
  useLayoutEffect(() => {
    if (!position || !ref.current) {
      setPlaced(null)
      return
    }
    const { width, height } = ref.current.getBoundingClientRect()
    setPlaced({
      x: Math.min(position.x, window.innerWidth - width - 8),
      y: Math.min(position.y, window.innerHeight - height - 8),
    })
  }, [position])

  useEffect(() => {
    if (!position) return
    const onPointerDown = (e: PointerEvent) => {
      if (ref.current && e.composedPath().includes(ref.current)) return
      onClose()
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
    }
    document.addEventListener('pointerdown', onPointerDown, true)
    document.addEventListener('keydown', onKeyDown, true)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true)
      document.removeEventListener('keydown', onKeyDown, true)
    }
  }, [position, onClose])

  if (!position) return null

  return (
    <div
      ref={ref}
      role="menu"
      className={cn(
        'bg-popover text-popover-foreground border-border fixed z-50 min-w-40 overflow-hidden rounded-md border p-1 shadow-md',
        !placed && 'invisible',
        className,
      )}
      style={{ left: placed?.x ?? position.x, top: placed?.y ?? position.y }}
      onContextMenu={e => e.preventDefault()}
    >
      {children}
    </div>
  )
}

type ContextMenuItemProps = {
  children: ReactNode
  onSelect: () => void
  disabled?: boolean
  variant?: 'default' | 'destructive'
  shortcut?: string
  className?: string
}

export function ContextMenuItem({
  children,
  onSelect,
  disabled,
  variant = 'default',
  shortcut,
  className,
}: ContextMenuItemProps) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        'focus:bg-accent focus:text-accent-foreground hover:bg-accent hover:text-accent-foreground relative flex w-full cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm outline-none select-none',
        'disabled:pointer-events-none disabled:opacity-50',
        variant === 'destructive' &&
          'text-destructive hover:bg-destructive/10 hover:text-destructive focus:bg-destructive/10 focus:text-destructive',
        className,
      )}
    >
      {children}
      {shortcut && <span className="text-muted-foreground ml-auto text-sm tracking-widest">{shortcut}</span>}
    </button>
  )
}

export function ContextMenuSeparator({ className }: { className?: string }) {
  return <div role="separator" className={cn('bg-border -mx-1 my-1 h-px', className)} />
}

export function ContextMenuLabel({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('text-muted-foreground px-2 py-1.5 text-sm font-semibold', className)}>{children}</div>
}
