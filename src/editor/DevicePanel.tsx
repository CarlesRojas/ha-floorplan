import { deviceType, entityName, placeableEntities, typesFor, type EntityInfo } from '#/devices/catalog.ts'
import { cn } from '#/lib/utils.ts'
import { EDITOR_MODE_COLORS, ROOM_COLORS } from '#/theme.ts'
import { decorationKind } from '#/decoration/catalog.ts'
import type { Area, DecorationConfig, DeviceConfig, HomeAssistant, RoomConfig } from '#/types.ts'
import { faPlus, faTrash, faTriangleExclamation } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useState } from 'react'

type Props = {
  hass: HomeAssistant | null
  rooms: RoomConfig[]
  room: RoomConfig | null
  devices: DeviceConfig[]
  decorations: DecorationConfig[]
  onBindDecoration: (entityId: string, decorationId: string, bound: boolean) => void
  selected: string | null
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
  decorations,
  onBindDecoration,
  selected,
  onAssignArea,
  onSelect,
  onAdd,
  onUpdate,
  onRemove,
}: Props) {
  const [query, setQuery] = useState('')
  const areas: Area[] = Object.values(hass?.areas ?? {}).sort((a, b) => a.name.localeCompare(b.name))
  const areaName = (id: string | null | undefined) => (id ? (hass?.areas?.[id]?.name ?? id) : undefined)

  const used = new Map(rooms.filter(r => r.area_id).map(r => [r.area_id!, r.id]))
  const header = !room ? (
    <p className="text-sm text-(--secondary-text-color)">
      {rooms.length === 0 ? 'Draw rooms in the Rooms mode first.' : 'Pick a room on the canvas to add devices to it.'}
    </p>
  ) : (
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

  const placed = new Map(devices.map(d => [d.entity_id, d]))
  const roomOf = (id: string) => rooms.find(r => r.id === id)
  const roomColor = (id: string) => {
    const i = rooms.findIndex(r => r.id === id)
    return rooms[i]?.color ?? ROOM_COLORS[(i < 0 ? 0 : i) % ROOM_COLORS.length]
  }
  const all = placeableEntities(hass)
  // Placed devices whose entity vanished from the registry still show, so they can be removed.
  const orphans: EntityInfo[] = [...placed.keys()]
    .filter(id => !all.some(e => e.entity_id === id))
    .map(id => ({ entity_id: id, name: entityName(hass, id), domain: id.split('.')[0], area_id: null }))
  const q = query.trim().toLowerCase()
  const entities = [...all, ...orphans]
    .filter(e => !q || e.name.toLowerCase().includes(q) || e.entity_id.toLowerCase().includes(q))
    .sort((a, b) => a.name.localeCompare(b.name))
  const selectedDevice = selected ? placed.get(selected) : undefined

  const row = (e: EntityInfo) => {
    const device = placed.get(e.entity_id)
    const deviceRoom = device ? roomOf(device.room) : undefined
    const type = deviceType({ entity_id: e.entity_id, type: device?.type ?? e.suggestedType })
    // Placed in a room whose area differs from where Home Assistant puts it.
    const mismatch = device && e.area_id && deviceRoom?.area_id !== e.area_id
    const isSelected = selected === e.entity_id
    return (
      <div
        key={e.entity_id}
        onClick={() => device && onSelect(e.entity_id)}
        className={cn(
          'grid grid-cols-[20px_minmax(0,1fr)_auto] items-center gap-2 rounded-lg border border-transparent px-2 py-1',
          device && 'cursor-pointer',
          isSelected && 'border-current',
        )}
        style={isSelected ? { color: accent } : undefined}
      >
        {type ? <FontAwesomeIcon icon={type.icon} className="size-4 text-(--secondary-text-color)" /> : <span />}
        <div className="min-w-0 text-(--primary-text-color)">
          <p className="flex items-center gap-2 text-sm">
            <span className="truncate">{e.name}</span>
            {device && (
              <span
                className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold text-black"
                style={{ backgroundColor: roomColor(device.room) }}
              >
                {deviceRoom?.name ?? device.room}
              </span>
            )}
          </p>
          <p className="truncate text-xs text-(--secondary-text-color)">{e.entity_id}</p>
          {mismatch && (
            <p className="text-(--warning-color, #f59e0b) flex items-center gap-1 text-xs">
              <FontAwesomeIcon icon={faTriangleExclamation} className="size-3" />
              In Home Assistant this is in {areaName(e.area_id)}
            </p>
          )}
        </div>
        {!device && room ? (
          <button
            type="button"
            aria-label={`Add ${e.name}`}
            onClick={ev => {
              ev.stopPropagation()
              onAdd(e)
            }}
            className="flex size-8 items-center justify-center rounded-lg hover:bg-(--secondary-background-color)"
            style={{ color: accent }}
          >
            <FontAwesomeIcon icon={faPlus} className="size-4" />
          </button>
        ) : (
          <span />
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {header}
      <input className={input} placeholder="Search entities" value={query} onChange={e => setQuery(e.target.value)} />
      <div className="flex flex-col gap-1">
        {entities.length === 0 ? (
          <p className="px-2 text-xs text-(--secondary-text-color)">No matches.</p>
        ) : (
          entities.map(row)
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
          {decorations.length > 0 && (
            <div className="flex flex-col gap-1 border-t border-(--divider-color) pt-3">
              <p className="text-xs font-semibold text-(--secondary-text-color)">Decoration items standing in for it</p>
              <p className="text-xs text-(--secondary-text-color)">
                With none, the device shows as a sphere in 3D. Bound items take its clicks and its state.
              </p>
              {decorations.map(item => {
                const bound = selectedDevice.decorations?.includes(item.id) ?? false
                const owner = devices.find(
                  d => d.entity_id !== selectedDevice.entity_id && d.decorations?.includes(item.id),
                )
                const itemRoom = rooms.find(r => r.id === item.room)
                return (
                  <label key={item.id} className="flex items-center gap-2 rounded-lg px-2 py-1 text-sm">
                    <input
                      type="checkbox"
                      checked={bound}
                      style={{ accentColor: accent }}
                      onChange={e => onBindDecoration(selectedDevice.entity_id, item.id, e.target.checked)}
                    />
                    <span className="truncate">{decorationKind(item.kind)?.label ?? item.kind}</span>
                    <span className="ml-auto truncate text-xs text-(--secondary-text-color)">
                      {owner ? `bound to ${entityName(hass, owner.entity_id)}` : (itemRoom?.name ?? item.room)}
                    </span>
                  </label>
                )
              })}
            </div>
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
