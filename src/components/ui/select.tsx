import { cn } from '#/lib/utils.ts'
import { faCheck, faChevronDown, faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'

// Select in the shadcn style, for the same reason the context menu is: the
// fullscreen editor stops pointer and key events at its boundary, so a
// library that dismisses through plain document listeners never hears them.
// A native select is no good here either, since an option can hold only
// text, and a device has to show the controls it offers under its name.
//
// A long list searches itself, the way shadcn's combobox does: a box at the
// top of the panel filters as you type, the arrow keys walk what is left and
// Enter takes it. A home with fifty lights is not a list worth scrolling.

// How many options it takes before the search box is worth the room.
const SEARCH_FROM = 7

export type SelectOption = {
  value: string
  label: string
  // Shown under the label, for example the controls a device offers.
  detail?: ReactNode
  // Matched by the search as well as the label, for example an entity id.
  keywords?: string
}

type Props = {
  value: string
  options: SelectOption[]
  placeholder?: string
  searchPlaceholder?: string
  onChange: (value: string) => void
  className?: string
  style?: React.CSSProperties
  'aria-label'?: string
}

export function Select({
  value,
  options,
  placeholder = 'None',
  searchPlaceholder = 'Search',
  onChange,
  className,
  style,
  ...rest
}: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const box = useRef<HTMLDivElement>(null)
  const list = useRef<HTMLDivElement>(null)
  const search = useRef<HTMLInputElement>(null)
  const [drop, setDrop] = useState<{ x: number; y: number; width: number } | null>(null)
  const current = options.find(o => o.value === value)

  const searchable = options.length >= SEARCH_FROM
  const q = query.trim().toLowerCase()
  const shown =
    searchable && q ? options.filter(o => `${o.label} ${o.keywords ?? ''}`.toLowerCase().includes(q)) : options

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
    setDrop({ x: rect.left, y: above ? Math.max(rect.top - height - 4, 8) : rect.bottom + 4, width: rect.width })
  }, [open, shown.length])

  // Opening puts the caret in the search box, so the list can be narrowed
  // without reaching for it.
  useEffect(() => {
    if (open) search.current?.focus()
  }, [open])

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

  const pick = (next: string) => {
    onChange(next)
    setOpen(false)
  }

  // The arrows walk the list and Enter takes what they are on, so the whole
  // thing works without leaving the search box.
  const onSearchKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      if (shown.length === 0) return
      const step = e.key === 'ArrowDown' ? 1 : shown.length - 1
      setActive(at => (at + step) % shown.length)
      return
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      if (shown[active]) pick(shown[active].value)
    }
  }

  return (
    <div className="relative min-w-0" ref={box}>
      <button
        type="button"
        aria-label={rest['aria-label']}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => {
          // Every opening starts over, with nothing typed and the first row
          // under the arrows.
          if (!open) {
            setQuery('')
            setActive(0)
          }
          setOpen(!open)
        }}
        style={style}
        className={cn(
          'flex w-full min-w-0 items-center gap-2 rounded border border-(--divider-color) px-2 py-1.5 text-left text-sm text-(--primary-text-color)',
          className,
        )}
      >
        <span className={cn('min-w-0 flex-1 truncate', !current && 'text-(--secondary-text-color)')}>
          {current?.label ?? placeholder}
        </span>
        <FontAwesomeIcon icon={faChevronDown} className="size-3 shrink-0 text-(--secondary-text-color)" />
      </button>
      {open && (
        <div
          ref={list}
          className={cn(
            'fixed z-50 flex max-h-80 flex-col overflow-hidden rounded-md border border-(--divider-color) bg-(--card-background-color) shadow-lg',
            // Hidden by opacity, not by visibility, for the one frame before
            // it is placed: a hidden element cannot take focus, and the
            // search box wants it the moment the panel opens.
            !drop && 'pointer-events-none opacity-0',
          )}
          style={{ left: drop?.x, top: drop?.y, width: drop?.width }}
        >
          {searchable && (
            <div className="flex items-center gap-2 border-b border-(--divider-color) px-2">
              <FontAwesomeIcon icon={faMagnifyingGlass} className="size-3 shrink-0 text-(--secondary-text-color)" />
              <input
                ref={search}
                value={query}
                placeholder={searchPlaceholder}
                onChange={e => {
                  setQuery(e.target.value)
                  setActive(0)
                }}
                onKeyDown={onSearchKey}
                className="min-w-0 flex-1 bg-transparent py-2 text-sm text-(--primary-text-color) outline-none"
              />
            </div>
          )}
          <div role="listbox" className="min-h-0 flex-1 overflow-y-auto p-1">
            {shown.length === 0 && (
              <p className="px-2 py-3 text-center text-sm text-(--secondary-text-color)">Nothing matches.</p>
            )}
            {shown.map((o, i) => (
              <button
                key={o.value}
                type="button"
                role="option"
                aria-selected={o.value === value}
                onPointerEnter={() => setActive(i)}
                onClick={() => pick(o.value)}
                className={cn(
                  'flex w-full items-start gap-2 rounded-sm px-2 py-1.5 text-left text-sm',
                  i === active && 'bg-(--secondary-background-color)',
                )}
              >
                <FontAwesomeIcon
                  icon={faCheck}
                  className={cn('mt-1 size-3 shrink-0', o.value === value ? 'opacity-100' : 'opacity-0')}
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate">{o.label}</div>
                  {o.detail && <div className="mt-1">{o.detail}</div>}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
