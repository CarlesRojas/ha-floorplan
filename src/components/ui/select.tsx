import { cn } from '#/lib/utils.ts'
import { faCheck, faChevronDown } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'

// Select in the shadcn style, for the same reason the context menu is: the
// fullscreen editor stops pointer and key events at its boundary, so a
// library that dismisses through plain document listeners never hears them.
// A native select is no good here either, since an option can hold only
// text, and a device has to show the controls it offers beside its name.

export type SelectOption = {
  value: string
  label: string
  // Shown under the label, for example the entity id.
  note?: string
  // Shown at the end of the row, for example the controls a device offers.
  badge?: ReactNode
}

type Props = {
  value: string
  options: SelectOption[]
  placeholder?: string
  onChange: (value: string) => void
  className?: string
  style?: React.CSSProperties
  'aria-label'?: string
}

export function Select({ value, options, placeholder = 'None', onChange, className, style, ...rest }: Props) {
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  const list = useRef<HTMLDivElement>(null)
  const [drop, setDrop] = useState<{ x: number; y: number; width: number; above: boolean } | null>(null)
  const current = options.find(o => o.value === value)

  // The list is fixed rather than absolute, so the sidebar's own scrolling
  // does not clip it. That means placing it by hand, above the trigger when
  // there is no room below.
  useLayoutEffect(() => {
    if (!open || !box.current) {
      setDrop(null)
      return
    }
    const rect = box.current.getBoundingClientRect()
    const height = list.current?.getBoundingClientRect().height ?? 0
    const below = window.innerHeight - rect.bottom
    const above = height > below && rect.top > below
    setDrop({ x: rect.left, y: above ? rect.top - height - 4 : rect.bottom + 4, width: rect.width, above })
  }, [open, options.length])

  useEffect(() => {
    if (!open) return
    const away = (e: PointerEvent) => {
      const path = e.composedPath()
      if (box.current && path.includes(box.current)) return
      if (list.current && path.includes(list.current)) return
      setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.stopPropagation()
      setOpen(false)
    }
    document.addEventListener('pointerdown', away, true)
    document.addEventListener('keydown', onKey, true)
    return () => {
      document.removeEventListener('pointerdown', away, true)
      document.removeEventListener('keydown', onKey, true)
    }
  }, [open])

  return (
    <div className="relative min-w-0" ref={box}>
      <button
        type="button"
        aria-label={rest['aria-label']}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        style={style}
        className={cn(
          'flex w-full min-w-0 items-center gap-2 rounded border border-(--divider-color) px-2 py-1.5 text-left text-sm text-(--primary-text-color)',
          className,
        )}
      >
        <span className={cn('min-w-0 flex-1 truncate', !current && 'text-(--secondary-text-color)')}>
          {current?.label ?? placeholder}
        </span>
        {current?.badge}
        <FontAwesomeIcon icon={faChevronDown} className="size-3 shrink-0 text-(--secondary-text-color)" />
      </button>
      {open && (
        <div
          ref={list}
          role="listbox"
          className={cn(
            'fixed z-50 max-h-72 overflow-y-auto rounded-md border border-(--divider-color) bg-(--card-background-color) p-1 shadow-lg',
            !drop && 'invisible',
          )}
          style={{ left: drop?.x, top: drop?.y, width: drop?.width }}
        >
          {options.map(o => (
            <button
              key={o.value}
              type="button"
              role="option"
              aria-selected={o.value === value}
              onClick={() => {
                onChange(o.value)
                setOpen(false)
              }}
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-(--secondary-background-color)"
            >
              <FontAwesomeIcon
                icon={faCheck}
                className={cn('size-3 shrink-0', o.value === value ? 'opacity-100' : 'opacity-0')}
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate">{o.label}</span>
                {o.note && <span className="block truncate text-xs text-(--secondary-text-color)">{o.note}</span>}
              </span>
              {o.badge}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
