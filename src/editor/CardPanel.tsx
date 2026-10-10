import { BACKGROUNDS, DEFAULT_BACKGROUND, PLAIN_SWATCH, THEME_BACKGROUND } from '#/lib/background.ts'
import { cn } from '#/lib/utils.ts'
import { field, group, iconButton } from '#/editor/look.ts'
import ControlsGuide from '#/editor/ControlsGuide.tsx'
import { Switch } from '#/editor/panel.tsx'
import { EDITOR_TINT_COLOR } from '#/theme.ts'
import { entityName } from '#/devices/catalog.ts'
import type { BackgroundConfig, CardConfig, HomeAssistant, HomeConfig, RoomConfig } from '#/types.ts'
import { roomEntities } from '#/tiles/auto.ts'
import { faGripVertical, faPenRuler, faSpinner, faXmark } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from 'react'

type Props = {
  hass: HomeAssistant | null
  config: CardConfig
  onChange: (config: CardConfig) => void
  opening: boolean
  onOpen: () => void
}

// What the card's tab in Home Assistant's dialog shows: the way into the
// editor first, then the side panel, the background, what goes in the
// panel, and how to move the view last.
export default function CardPanel({ hass, config, onChange, opening, onOpen }: Props) {
  const rooms = config.rooms ?? []
  const sidePanel = config.side_panel === true

  const setSidePanel = (on: boolean) => {
    const { side_panel: _, ...rest } = config
    onChange(on ? { ...rest, side_panel: true } : rest)
  }

  // Writes a room's entities and tile order, leaving out a list that is
  // empty so the YAML stays as short as it was.
  const setRoom = (roomId: string, lists: { entities?: string[]; order?: string[] }) => {
    const next = rooms.map(room => {
      if (room.id !== roomId) return room
      const updated: RoomConfig = { ...room, ...lists }
      if (!updated.entities?.length) delete updated.entities
      if (!updated.order?.length) delete updated.order
      return updated
    })
    onChange({ ...config, rooms: next })
  }

  // Writes the home section, leaving out what is empty so the YAML stays
  // as short as it was.
  const home = config.home ?? {}
  const homeEntities = home.entities ?? []
  const setHome = (changes: HomeConfig) => {
    const next: HomeConfig = { ...home, ...changes }
    if (!next.name) delete next.name
    if (!next.entities?.length) delete next.entities
    const { home: _, ...rest } = config
    onChange(Object.keys(next).length ? { ...rest, home: next } : rest)
  }

  // Writes the background for one mode, leaving out the default so the YAML
  // stays as short as it was.
  const setBackground = (mode: 'light' | 'dark', id: string) => {
    const next: BackgroundConfig = { ...config.background, [mode]: id }
    if (next[mode] === DEFAULT_BACKGROUND) delete next[mode]
    const { background: _, ...rest } = config
    onChange(Object.keys(next).length ? { ...rest, background: next } : rest)
  }

  // An entity has one place: a piece on the plan, or one room's list.
  const taken = [
    ...(config.devices ?? []).map(device => device.entity_id),
    ...rooms.flatMap(room => room.entities ?? []),
  ]

  return (
    <div
      data-light={hass?.themes?.darkMode === false || undefined}
      className="fp-editor font-system flex flex-col gap-6 px-5 py-6 text-(--primary-text-color) antialiased"
    >
      <Section
        title="Floorplan"
        description="Draw the rooms of your home, furnish them, and link each piece to the Home Assistant device it stands for."
      >
        <div className={cn(group, 'flex-row items-center gap-3')}>
          <span className="bg-tint-fill flex size-9 shrink-0 items-center justify-center rounded-[10px] text-white">
            <FontAwesomeIcon icon={faPenRuler} className="size-4" />
          </span>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="text-[13px] font-semibold">Floorplan editor</span>
            <span className="text-label-2 truncate text-xs">Rooms, furniture and devices</span>
          </span>
          <button
            type="button"
            onClick={onOpen}
            disabled={opening}
            aria-busy={opening}
            className="bg-tint-fill flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-3.5 text-[13px] font-semibold text-white transition-[filter,transform] hover:brightness-[1.06] active:scale-[0.97] disabled:cursor-progress disabled:opacity-70"
          >
            {opening && <FontAwesomeIcon icon={faSpinner} spin className="size-3" />}
            {opening ? 'Opening…' : 'Open editor'}
          </button>
        </div>
      </Section>

      <Section
        title="Side panel"
        description="Tiles beside the floorplan, a heading for each room and a tile for each of its devices. With a room in view only its tiles show. On a narrow card the panel goes under the floorplan."
      >
        <label className={cn(group, 'cursor-pointer flex-row items-center justify-between gap-4 py-2.5')}>
          <span className="text-[13px]">Show the side panel</span>
          <Switch checked={sidePanel} accent={EDITOR_TINT_COLOR} label="Show the side panel" onChange={setSidePanel} />
        </label>
      </Section>

      <Section
        title="Background"
        description="The colors laid behind the view the card is in, one for a light dashboard and one for a dark one. Plain leaves the dashboard's own background."
      >
        <div className={cn(group, 'gap-4')}>
          <BackgroundPicker
            title="Light"
            mode="light"
            value={config.background?.light ?? DEFAULT_BACKGROUND}
            onChange={id => setBackground('light', id)}
          />
          <BackgroundPicker
            title="Dark"
            mode="dark"
            value={config.background?.dark ?? DEFAULT_BACKGROUND}
            onChange={id => setBackground('dark', id)}
          />
        </div>
      </Section>

      {sidePanel && (
        <Section
          title="Home"
          description="Tiles for the whole home rather than a room, such as a scene, a script, the weather or a group of lights, under a heading of their own. With any here, they are all the panel shows until a room is in view, and each room's tiles show only inside it. Leave it empty to show every room."
        >
          <div className={group}>
            <label className="grid grid-cols-[auto_1fr] items-center gap-3 text-[13px]">
              <span>Heading</span>
              <input
                type="text"
                value={home.name ?? ''}
                placeholder="Home"
                onChange={event => setHome({ name: event.target.value })}
                className={cn(field, 'bg-fill-strong hover:bg-fill-stronger focus:bg-fill-strong outline-none')}
              />
            </label>
            {homeEntities.length > 0 && (
              <SortableList
                items={homeEntities.map(id => ({
                  id,
                  title: hass ? entityName(hass, id) : id,
                  onRemove: () => setHome({ entities: homeEntities.filter(other => other !== id) }),
                }))}
                onReorder={entities => setHome({ entities })}
              />
            )}
            {hass && (
              <EntityPicker
                hass={hass}
                exclude={homeEntities}
                onPick={id => !homeEntities.includes(id) && setHome({ entities: [...homeEntities, id] })}
              />
            )}
          </div>
        </Section>
      )}

      {sidePanel && (
        <Section
          title="Tiles by room"
          description="Every device on the plan already has a tile in its room. Add the entities that have no piece on the plan, such as a scene, a sensor or a thermostat, and drag the handles to put the tiles in the order the panel shows them."
        >
          {rooms.length === 0 ? (
            <p className={cn(group, 'text-label-2 text-[13px]')}>Draw a room in the editor first.</p>
          ) : (
            rooms.map(room => (
              <RoomEntities
                key={room.id}
                hass={hass}
                config={config}
                room={room}
                taken={taken}
                onChange={lists => setRoom(room.id, lists)}
              />
            ))
          )}
        </Section>
      )}

      <Section title="Moving the view">
        <div className={cn(group, 'py-3')}>
          <ControlsGuide className="justify-start" />
        </div>
      </Section>
    </div>
  )
}

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-label-2 px-3 text-[13px] font-semibold">{title}</h3>
      {children}
      {description && <p className="text-label-2 px-3 text-xs leading-snug">{description}</p>}
    </section>
  )
}

// A row of swatches, one for each background in the given mode and one for
// the theme's own, with the chosen one ringed.
function BackgroundPicker({
  title,
  mode,
  value,
  onChange,
}: {
  title: string
  mode: 'light' | 'dark'
  value: string
  onChange: (id: string) => void
}) {
  const options = [
    ...BACKGROUNDS.map(b => ({ id: b.id, name: b.name, swatch: b[mode] })),
    { id: THEME_BACKGROUND, name: 'Plain', swatch: PLAIN_SWATCH[mode] },
  ]
  return (
    <div className="flex flex-col gap-2">
      <p className="px-0.5 text-[13px] font-medium">{title}</p>
      <div role="radiogroup" aria-label={`${title} background`} className="grid grid-cols-3 gap-x-2.5 gap-y-3">
        {options.map(option => {
          const chosen = option.id === value
          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={chosen}
              onClick={() => onChange(option.id)}
              className="group flex cursor-pointer flex-col items-center gap-1.5"
            >
              <span
                className={cn(
                  'block aspect-[16/10] w-full rounded-[10px] shadow-[inset_0_0_0_0.5px_rgba(0,0,0,0.12)] ring-offset-2 ring-offset-(--card-background-color) transition-[box-shadow,transform] group-active:scale-[0.97]',
                  chosen ? 'ring-tint ring-[2.5px]' : 'group-hover:ring-separator group-hover:ring-2',
                )}
                style={{ background: option.swatch }}
              />
              <span className={cn('text-xs', chosen ? 'text-tint font-semibold' : 'text-label-2')}>{option.name}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function roomName(hass: HomeAssistant | null, room: RoomConfig) {
  return room.name ?? (room.area_id && hass?.areas[room.area_id]?.name) ?? room.id
}

function RoomEntities({
  hass,
  config,
  room,
  taken,
  onChange,
}: {
  hass: HomeAssistant | null
  config: CardConfig
  room: RoomConfig
  taken: string[]
  onChange: (lists: { entities?: string[]; order?: string[] }) => void
}) {
  const extra = room.entities ?? []
  const ids = roomEntities(config, room)
  const name = (id: string) => (hass ? entityName(hass, id) : id)
  const remove = (id: string) =>
    onChange({ entities: extra.filter(other => other !== id), order: room.order?.filter(other => other !== id) })

  return (
    <div className={group}>
      <p className="px-0.5 text-[13px] font-semibold">{roomName(hass, room)}</p>
      {ids.length > 0 && (
        <SortableList
          items={ids.map(id => ({
            id,
            title: name(id),
            onRemove: extra.includes(id) ? () => remove(id) : undefined,
          }))}
          onReorder={order => onChange({ order })}
        />
      )}
      {hass && <EntityPicker hass={hass} exclude={taken} onPick={id => onChange({ entities: [...extra, id] })} />}
    </div>
  )
}

type Item = { id: string; title: string; onRemove?: () => void }
type Drag = { id: string; grab: number; y: number }

// A list whose rows are put in order by dragging the handle on their right,
// or by focusing it and pressing the up and down arrows. While a row is
// dragged the others make room for it, and the new order is handed on once
// it is let go.
function SortableList({ items, onReorder }: { items: Item[]; onReorder: (ids: string[]) => void }) {
  const [order, setOrder] = useState<string[] | null>(null)
  const [held, setHeld] = useState<string | null>(null)
  const rows = useRef(new Map<string, HTMLLIElement>())
  const drag = useRef<Drag | null>(null)
  const byId = new Map(items.map(item => [item.id, item]))
  const ids = (order ?? items.map(item => item.id)).filter(id => byId.has(id))

  // Keeps the dragged row under the pointer, wherever its slot now is.
  const place = () => {
    const current = drag.current
    const row = current && rows.current.get(current.id)
    if (!current || !row) return
    const top = current.y - current.grab - row.parentElement!.getBoundingClientRect().top
    row.style.transform = `translateY(${top - row.offsetTop}px)`
  }
  useLayoutEffect(place)

  const start = (event: PointerEvent<HTMLButtonElement>, id: string) => {
    if (event.button !== 0) return
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    const row = rows.current.get(id)!
    drag.current = { id, grab: event.clientY - row.getBoundingClientRect().top, y: event.clientY }
    setOrder(ids)
    setHeld(id)
  }

  const move = (event: PointerEvent<HTMLButtonElement>) => {
    const current = drag.current
    if (!current || !order) return
    current.y = event.clientY
    const row = rows.current.get(current.id)!
    const middle = event.clientY - current.grab + row.offsetHeight / 2
    const others = order.filter(id => id !== current.id)
    const index = others.filter(id => {
      const other = rows.current.get(id)!.getBoundingClientRect()
      return other.top + other.height / 2 < middle
    }).length
    const next = [...others.slice(0, index), current.id, ...others.slice(index)]
    if (next.some((id, i) => id !== order[i])) setOrder(next)
    else place()
  }

  const end = () => {
    const current = drag.current
    if (!current) return
    rows.current.get(current.id)?.style.removeProperty('transform')
    drag.current = null
    const changed = order && order.some((id, i) => id !== items[i]?.id)
    setOrder(null)
    setHeld(null)
    if (changed) onReorder(order)
  }

  const nudge = (event: KeyboardEvent<HTMLButtonElement>, id: string) => {
    const by = event.key === 'ArrowUp' ? -1 : event.key === 'ArrowDown' ? 1 : 0
    const from = ids.indexOf(id)
    if (!by || from + by < 0 || from + by >= ids.length) return
    event.preventDefault()
    const next = [...ids]
    next.splice(from, 1)
    next.splice(from + by, 0, id)
    onReorder(next)
  }

  return (
    <ul className="bg-raised relative flex flex-col overflow-visible rounded-lg shadow-[0_0_0_0.5px_rgba(0,0,0,0.08)]">
      {ids.map(id => {
        const item = byId.get(id)!
        const dragging = held === id
        return (
          <li
            key={id}
            ref={element => {
              if (element) rows.current.set(id, element)
              else rows.current.delete(id)
            }}
            className={cn(
              'bg-raised not-first:border-separator flex h-10 items-center gap-0.5 pr-1 pl-3 not-first:border-t first:rounded-t-lg last:rounded-b-lg',
              dragging &&
                'relative z-10 rounded-lg border-transparent shadow-[0_10px_30px_-8px_rgba(0,0,0,0.45),0_0_0_0.5px_rgba(0,0,0,0.1)]',
            )}
          >
            <span className="min-w-0 flex-1 truncate text-[13px]">{item.title}</span>
            {item.onRemove && (
              <button
                type="button"
                aria-label={`Remove ${item.title}`}
                onClick={item.onRemove}
                className={cn(
                  iconButton,
                  'text-label-2 size-8 shrink-0 cursor-pointer hover:text-(--primary-text-color)',
                )}
              >
                <FontAwesomeIcon icon={faXmark} className="size-3.5" />
              </button>
            )}
            <button
              type="button"
              aria-label={`Move ${item.title}`}
              onPointerDown={event => start(event, id)}
              onPointerMove={move}
              onPointerUp={end}
              onPointerCancel={end}
              onKeyDown={event => nudge(event, id)}
              className={cn(
                iconButton,
                'text-label-2 size-8 shrink-0 touch-none hover:text-(--primary-text-color)',
                dragging ? 'cursor-grabbing' : 'cursor-grab',
              )}
            >
              <FontAwesomeIcon icon={faGripVertical} className="size-3.5" />
            </button>
          </li>
        )
      })}
    </ul>
  )
}

type PickerElement = HTMLElement & {
  hass: HomeAssistant
  value: string
  placeholder: string
  excludeEntities: string[]
}

// Home Assistant loads its entity picker with the editors that use it. One
// of its own cards' editors is asked for, which brings it in.
async function loadPicker() {
  if (customElements.get('ha-entity-picker')) return
  const helpers = await window.loadCardHelpers?.()
  const card = helpers?.createCardElement({ type: 'entities', entities: [] })
  await (card?.constructor as { getConfigElement?: () => Promise<unknown> } | undefined)?.getConfigElement?.()
  await customElements.whenDefined('ha-entity-picker')
}

// Home Assistant's own entity picker. Picking an entity hands it on and
// leaves the picker empty again, ready for the next one.
function EntityPicker({
  hass,
  exclude,
  onPick,
}: {
  hass: HomeAssistant
  exclude: string[]
  onPick: (entityId: string) => void
}) {
  const holder = useRef<HTMLDivElement>(null)
  const picker = useRef<PickerElement | null>(null)
  const latest = useRef({ hass, exclude, onPick })
  useEffect(() => {
    latest.current = { hass, exclude, onPick }
  })

  useEffect(() => {
    let gone = false
    void loadPicker().then(() => {
      if (gone || !holder.current) return
      const element = document.createElement('ha-entity-picker') as PickerElement
      element.hass = latest.current.hass
      element.excludeEntities = latest.current.exclude
      element.placeholder = 'Add an entity'
      element.value = ''
      element.addEventListener('value-changed', event => {
        event.stopPropagation()
        const id = (event as CustomEvent<{ value?: string }>).detail.value
        if (!id) return
        element.value = ''
        latest.current.onPick(id)
      })
      picker.current = element
      holder.current.replaceChildren(element)
    })
    return () => {
      gone = true
      picker.current = null
    }
  }, [])

  useEffect(() => {
    if (!picker.current) return
    picker.current.hass = hass
    picker.current.excludeEntities = exclude
  })

  // Its field takes the fill of the fields around it, with no line under it
  // and the corners rounded the same.
  return (
    <div
      ref={holder}
      className="overflow-hidden rounded-lg [--ha-color-border-neutral-loud:transparent] [--ha-color-form-background:var(--fp-fill-strong)] [--mdc-theme-primary:var(--fp-tint)] [&>*]:block [&>*]:w-full"
    />
  )
}
