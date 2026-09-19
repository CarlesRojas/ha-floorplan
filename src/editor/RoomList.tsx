import type { Selection } from '#/editor/types.ts'
import { cn } from '#/lib/utils.ts'
import { ROOM_COLORS } from '#/theme.ts'
import type { Area, RoomConfig } from '#/types.ts'

type Props = {
  rooms: RoomConfig[]
  areas: Area[]
  selection: Selection
  onSelect: (roomId: string) => void
  onUpdate: (id: string, patch: Partial<RoomConfig>) => void
  onDelete: (id: string) => void
}

const input =
  'min-w-0 rounded border border-(--divider-color) bg-transparent px-2 py-1 text-xs text-(--primary-text-color)'

export default function RoomList({ rooms, areas, selection, onSelect, onUpdate, onDelete }: Props) {
  const sortedAreas = [...areas].sort((a, b) => a.name.localeCompare(b.name))

  if (rooms.length === 0) {
    return (
      <p className="text-xs text-(--secondary-text-color)">No rooms yet. Pick the Draw tool and click on the canvas.</p>
    )
  }

  return (
    <div className="flex flex-col gap-1">
      {rooms.map((room, i) => (
        <div
          key={room.id}
          onClick={() => onSelect(room.id)}
          className={cn(
            'grid grid-cols-[16px_minmax(0,1fr)_minmax(0,1fr)_56px_28px_auto] items-center gap-2 rounded-lg border border-transparent px-2 py-1',
            selection.roomId === room.id && 'border-(--primary-color)',
          )}
        >
          <span
            className="size-4 rounded-full"
            style={{ background: room.color ?? ROOM_COLORS[i % ROOM_COLORS.length] }}
          />
          <input
            className={input}
            value={room.name ?? ''}
            placeholder={room.id}
            onChange={e => onUpdate(room.id, { name: e.target.value || undefined })}
          />
          <select
            className={input}
            value={room.area_id ?? ''}
            onChange={e => onUpdate(room.id, { area_id: e.target.value || undefined })}
          >
            <option value="">No area</option>
            {sortedAreas.map(a => (
              <option key={a.area_id} value={a.area_id}>
                {a.name}
              </option>
            ))}
          </select>
          <input
            className={input}
            type="number"
            step={0.05}
            min={0}
            placeholder="radius"
            value={room.radius ?? ''}
            onChange={e => onUpdate(room.id, { radius: e.target.value === '' ? undefined : Number(e.target.value) })}
          />
          <input
            type="color"
            className="h-6 w-8 cursor-pointer bg-transparent"
            value={room.color ?? ROOM_COLORS[i % ROOM_COLORS.length]}
            onChange={e => onUpdate(room.id, { color: e.target.value })}
          />
          <button
            type="button"
            className="text-xs text-(--secondary-text-color) hover:text-(--error-color)"
            onClick={e => {
              e.stopPropagation()
              if (window.confirm(`Delete ${room.name ?? room.id}?`)) onDelete(room.id)
            }}
          >
            Delete
          </button>
        </div>
      ))}
    </div>
  )
}
