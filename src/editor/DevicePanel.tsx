import { deviceType, entitiesInArea, entityName, typesFor, type EntityInfo } from '#/devices/catalog.ts'
import { cn } from '#/lib/utils.ts'
import { EDITOR_MODE_COLORS } from '#/theme.ts'
import type { DeviceConfig, HomeAssistant, RoomConfig } from '#/types.ts'
import { faCheck, faPlus, faTrash } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

type Props = {
  hass: HomeAssistant | null
  room: RoomConfig | null
  devices: DeviceConfig[]
  selected: string | null
  onSelect: (entityId: string | null) => void
  onAdd: (entity: EntityInfo) => void
  onUpdate: (entityId: string, patch: Partial<DeviceConfig>) => void
  onRemove: (entityId: string) => void
}

const input =
  'min-w-0 rounded border border-(--divider-color) bg-transparent px-2 py-1.5 text-sm text-(--primary-text-color)'
const accent = EDITOR_MODE_COLORS.devices

export default function DevicePanel({ hass, room, devices, selected, onSelect, onAdd, onUpdate, onRemove }: Props) {
  if (!room) return <p className="text-sm text-(--secondary-text-color)">Select a room to see its devices.</p>
  if (!room.area_id) {
    return (
      <p className="text-sm text-(--secondary-text-color)">
        Link {room.name ?? room.id} to a Home Assistant area in the Rooms mode to list its devices.
      </p>
    )
  }
  if (!hass?.entities) {
    return (
      <p className="text-sm text-(--secondary-text-color)">
        This Home Assistant version does not expose the entity registry.
      </p>
    )
  }

  const placed = new Map(devices.filter(d => d.room === room.id).map(d => [d.entity_id, d]))
  const inArea = entitiesInArea(hass, room.area_id)
  // Devices placed here whose entity left the area still show, so they can be removed.
  const orphans: EntityInfo[] = [...placed.keys()]
    .filter(id => !inArea.some(e => e.entity_id === id))
    .map(id => ({ entity_id: id, name: entityName(hass, id), domain: id.split('.')[0] }))
  const entities = [...inArea, ...orphans]
  const selectedDevice = selected ? placed.get(selected) : undefined

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-semibold">{room.name ?? room.id}</p>
      {entities.length === 0 ? (
        <p className="text-sm text-(--secondary-text-color)">
          No devices in this area. Assign devices to it in Home Assistant.
        </p>
      ) : (
        <div className="flex flex-col gap-1">
          {entities.map(e => {
            const device = placed.get(e.entity_id)
            const type = deviceType({ entity_id: e.entity_id, type: device?.type ?? e.suggestedType })
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
                {type ? (
                  <FontAwesomeIcon icon={type.icon} className="size-4 text-(--secondary-text-color)" />
                ) : (
                  <span />
                )}
                <div className="min-w-0 text-(--primary-text-color)">
                  <p className="truncate text-sm">{e.name}</p>
                  <p className="truncate text-xs text-(--secondary-text-color)">{e.entity_id}</p>
                </div>
                {device ? (
                  <span className="flex items-center gap-1 text-xs font-semibold" style={{ color: accent }}>
                    <FontAwesomeIcon icon={faCheck} className="size-3" />
                    Placed
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
          })}
        </div>
      )}

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
