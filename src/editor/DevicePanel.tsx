import { deviceType, entityName, placeableEntities, typesFor, type EntityInfo } from '#/devices/catalog.ts'
import { cn } from '#/lib/utils.ts'
import { EDITOR_MODE_COLORS, ROOM_COLORS } from '#/theme.ts'
import type { Area, DeviceConfig, HomeAssistant, RoomConfig } from '#/types.ts'
import { faCheck, faPlus, faTrash, faTriangleExclamation } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useState } from 'react'

type Props = {
  hass: HomeAssistant | null
  rooms: RoomConfig[]
  room: RoomConfig | null
  devices: DeviceConfig[]
  selected: string | null
  onSelectRoom: (roomId: string) => void
  onAssignArea: (roomId: string, areaId: string | undefined) => void
  onSelect: (entityId: string | null) => void
  onAdd: (entity: EntityInfo) => void
  onUpdate: (entityId: string, patch: Partial<DeviceConfig>) => void
  onRemove: (entityId: string) => void
}

const input =
  'min-w-0 rounded border border-(--divider-color) bg-transparent px-2 py-1.5 text-sm text-(--primary-text-color)'
const accent = EDITOR_MODE_COLORS.devices

export default function DevicePanel({
  hass,
  rooms,
  room,
  devices,
  selected,
  onSelectRoom,
  onAssignArea,
  onSelect,
  onAdd,
  onUpdate,
  onRemove,
}: Props) {
  const [query, setQuery] = useState('')
  const areas: Area[] = Object.values(hass?.areas ?? {}).sort((a, b) => a.name.localeCompare(b.name))
  const areaName = (id: string | null | undefined) => (id ? (hass?.areas?.[id]?.name ?? id) : undefined)

  if (!room) {
    if (rooms.length === 0) {
      return <p className="text-sm text-(--secondary-text-color)">No rooms yet. Draw them in the Rooms mode first.</p>
    }
    return (
      <div className="flex flex-col gap-1">
        <p className="mb-1 text-sm text-(--secondary-text-color)">Pick a room to place its devices.</p>
        {rooms.map((r, i) => {
          const count = devices.filter(d => d.room === r.id).length
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => onSelectRoom(r.id)}
              className="grid grid-cols-[12px_minmax(0,1fr)_auto] items-center gap-2 rounded-lg px-2 py-2 text-left hover:bg-(--secondary-background-color)"
            >
              <span
                className="size-3 rounded-full"
                style={{ background: r.color ?? ROOM_COLORS[i % ROOM_COLORS.length] }}
              />
              <div className="min-w-0">
                <p className="truncate text-sm text-(--primary-text-color)">{r.name ?? r.id}</p>
                <p className="truncate text-xs text-(--secondary-text-color)">{areaName(r.area_id) ?? 'No area'}</p>
              </div>
              <span className="text-xs text-(--secondary-text-color)">
                {count} {count === 1 ? 'device' : 'devices'}
              </span>
            </button>
          )
        })}
      </div>
    )
  }

  const used = new Map(rooms.filter(r => r.area_id).map(r => [r.area_id!, r.id]))
  const header = (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-semibold">{room.name ?? room.id}</p>
      <label className="grid grid-cols-[80px_1fr] items-center gap-2 text-sm">
        Area
        <select
          className={input}
          value={room.area_id ?? ''}
          onChange={e => onAssignArea(room.id, e.target.value || undefined)}
        >
          <option value="">No area</option>
          {areas.map(a => {
            const owner = used.get(a.area_id)
            const taken = owner !== undefined && owner !== room.id
            return (
              <option key={a.area_id} value={a.area_id} disabled={taken}>
                {a.name}
                {taken ? ' (used)' : ''}
              </option>
            )
          })}
        </select>
      </label>
    </div>
  )

  if (!hass?.entities) {
    return (
      <div className="flex flex-col gap-3">
        {header}
        <p className="text-sm text-(--secondary-text-color)">
          This Home Assistant version does not expose the entity registry.
        </p>
      </div>
    )
  }

  const placedHere = new Map(devices.filter(d => d.room === room.id).map(d => [d.entity_id, d]))
  const placedElsewhere = new Map(devices.filter(d => d.room !== room.id).map(d => [d.entity_id, d.room]))
  const all = placeableEntities(hass)
  // Devices placed here whose entity vanished from the registry still show, so they can be removed.
  const orphans: EntityInfo[] = [...placedHere.keys()]
    .filter(id => !all.some(e => e.entity_id === id))
    .map(id => ({ entity_id: id, name: entityName(hass, id), domain: id.split('.')[0], area_id: null }))
  const q = query.trim().toLowerCase()
  const matches = (e: EntityInfo) => !q || e.name.toLowerCase().includes(q) || e.entity_id.toLowerCase().includes(q)
  const inArea = room.area_id ? all.filter(e => e.area_id === room.area_id) : []
  const rest = [...all.filter(e => !room.area_id || e.area_id !== room.area_id), ...orphans]
  const selectedDevice = selected ? placedHere.get(selected) : undefined

  const row = (e: EntityInfo) => {
    const device = placedHere.get(e.entity_id)
    const elsewhere = placedElsewhere.get(e.entity_id)
    const type = deviceType({ entity_id: e.entity_id, type: device?.type ?? e.suggestedType })
    // Placed here but Home Assistant puts it in another area.
    const mismatch = device && e.area_id && room.area_id !== e.area_id
    return (
      <div
        key={e.entity_id}
        onClick={() => device && onSelect(e.entity_id)}
        className={cn(
          'grid grid-cols-[20px_minmax(0,1fr)_auto] items-center gap-2 rounded-lg border border-transparent px-2 py-1',
          device && 'cursor-pointer',
          selected === e.entity_id && 'border-current',
        )}
        style={selected === e.entity_id ? { color: accent } : undefined}
      >
        {type ? <FontAwesomeIcon icon={type.icon} className="size-4 text-(--secondary-text-color)" /> : <span />}
        <div className="min-w-0 text-(--primary-text-color)">
          <p className="truncate text-sm">{e.name}</p>
          <p className="truncate text-xs text-(--secondary-text-color)">{e.entity_id}</p>
          {mismatch && (
            <p className="text-(--warning-color, #f59e0b) flex items-center gap-1 text-xs">
              <FontAwesomeIcon icon={faTriangleExclamation} className="size-3" />
              In Home Assistant this is in {areaName(e.area_id)}
            </p>
          )}
        </div>
        {device ? (
          <span className="flex items-center gap-1 text-xs font-semibold" style={{ color: accent }}>
            <FontAwesomeIcon icon={faCheck} className="size-3" />
            Placed
          </span>
        ) : elsewhere ? (
          <span className="text-xs text-(--secondary-text-color)">
            In {rooms.find(r => r.id === elsewhere)?.name ?? elsewhere}
          </span>
        ) : (
          <button
            type="button"
            onClick={ev => {
              ev.stopPropagation()
              onAdd(e)
            }}
            className="flex h-8 items-center gap-1 rounded-lg px-3 text-xs font-semibold text-white"
            style={{ backgroundColor: accent }}
          >
            <FontAwesomeIcon icon={faPlus} className="size-3" />
            Add
          </button>
        )}
      </div>
    )
  }

  const inAreaShown = inArea.filter(matches)
  const restShown = rest.filter(matches)

  return (
    <div className="flex flex-col gap-3">
      {header}
      <input className={input} placeholder="Search entities" value={query} onChange={e => setQuery(e.target.value)} />
      {room.area_id && (
        <div className="flex flex-col gap-1">
          <p className="text-xs font-semibold text-(--secondary-text-color)">In {areaName(room.area_id)}</p>
          {inAreaShown.length === 0 ? (
            <p className="px-2 text-xs text-(--secondary-text-color)">Nothing in this area.</p>
          ) : (
            inAreaShown.map(row)
          )}
        </div>
      )}
      <div className="flex flex-col gap-1">
        <p className="text-xs font-semibold text-(--secondary-text-color)">
          {room.area_id ? 'Other entities' : 'All entities'}
        </p>
        {restShown.length === 0 ? (
          <p className="px-2 text-xs text-(--secondary-text-color)">No matches.</p>
        ) : (
          restShown.map(row)
        )}
      </div>

      {selectedDevice && (
        <div className="flex flex-col gap-2 border-t border-(--divider-color) pt-3">
          <p className="truncate text-sm font-semibold">{entityName(hass, selectedDevice.entity_id)}</p>
          <label className="grid grid-cols-[80px_1fr] items-center gap-2 text-sm">
            Type
            <select
              className={input}
              value={deviceType(selectedDevice)?.id ?? ''}
              onChange={e => {
                const next = typesFor(selectedDevice.entity_id).find(t => t.id === e.target.value)
                onUpdate(selectedDevice.entity_id, {
                  type: e.target.value,
                  length: next?.hasLength ? (selectedDevice.length ?? next.defaultLength) : undefined,
                })
              }}
            >
              {typesFor(selectedDevice.entity_id).map(t => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          <label className="grid grid-cols-[80px_1fr] items-center gap-2 text-sm">
            Rotation
            <input
              className={input}
              type="number"
              step={15}
              value={selectedDevice.rotation ?? 0}
              onChange={e =>
                onUpdate(selectedDevice.entity_id, { rotation: ((Number(e.target.value) % 360) + 360) % 360 })
              }
            />
          </label>
          {deviceType(selectedDevice)?.hasLength && (
            <label className="grid grid-cols-[80px_1fr] items-center gap-2 text-sm">
              Length (m)
              <input
                className={input}
                type="number"
                step={0.1}
                min={0.1}
                value={selectedDevice.length ?? deviceType(selectedDevice)?.defaultLength ?? 1}
                onChange={e => onUpdate(selectedDevice.entity_id, { length: Math.max(0.1, Number(e.target.value)) })}
              />
            </label>
          )}
          <button
            type="button"
            onClick={() => onRemove(selectedDevice.entity_id)}
            className="mt-1 flex h-9 items-center justify-center gap-2 rounded-lg border border-(--divider-color) text-sm font-semibold text-(--error-color)"
          >
            <FontAwesomeIcon icon={faTrash} className="size-3.5" />
            Remove from plan
          </button>
        </div>
      )}
    </div>
  )
}
