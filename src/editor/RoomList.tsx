import type { Selection } from '#/editor/types.ts'
import { cn } from '#/lib/utils.ts'
import { ROOM_COLORS } from '#/theme.ts'
import type { Area, RoomConfig } from '#/types.ts'
import { faTrash } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

type Props = {
  rooms: RoomConfig[]
  areas: Area[]
  selection: Selection
  onSelect: (roomId: string) => void
  onUpdate: (id: string, patch: Partial<RoomConfig>) => void
  onRename: (id: string, name: string | undefined) => void
  onRenameDone: () => void
  onDelete: (id: string) => void
}

const input =
  'min-w-0 rounded border border-(--divider-color) bg-transparent px-2 py-1.5 text-sm text-(--primary-text-color)'

export default function RoomList({
  rooms,
  areas,
  selection,
  onSelect,
  onUpdate,
  onRename,
  onRenameDone,
  onDelete,
}: Props) {
  const sortedAreas = [...areas].sort((a, b) => a.name.localeCompare(b.name))
  const used = new Map(rooms.filter(r => r.area_id).map(r => [r.area_id!, r.id]))

  if (rooms.length === 0) {
    return (
      <p className="text-sm text-(--secondary-text-color)">No rooms yet. Pick the Draw tool and click on the canvas.</p>
    )
  }

  return (
    <div className="flex flex-col gap-1">
      {rooms.map((room, i) => (
        <div
          key={room.id}
          onClick={() => onSelect(room.id)}
          className={cn(
            'grid grid-cols-[12px_minmax(0,1fr)_minmax(0,1fr)_auto] items-center gap-2 rounded-lg border border-transparent px-2 py-1',
            selection.roomId === room.id && 'border-(--primary-color)',
          )}
        >
          <span
            className="size-3 rounded-full"
            style={{ background: room.color ?? ROOM_COLORS[i % ROOM_COLORS.length] }}
          />
          <input
            className={input}
            value={room.name ?? ''}
            placeholder={room.id}
            onChange={e => onRename(room.id, e.target.value || undefined)}
            onBlur={onRenameDone}
          />
          <select
            className={input}
            value={room.area_id ?? ''}
            onChange={e => onUpdate(room.id, { area_id: e.target.value || undefined })}
          >
            <option value="">No area</option>
            {sortedAreas.map(a => {
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
          <button
            type="button"
            aria-label="Delete room"
            className="flex size-7 items-center justify-center rounded text-(--secondary-text-color) hover:text-(--error-color)"
            onClick={e => {
              e.stopPropagation()
              if (window.confirm(`Delete ${room.name ?? room.id}?`)) onDelete(room.id)
            }}
          >
            <FontAwesomeIcon icon={faTrash} className="size-3.5" />
          </button>
        </div>
      ))}
    </div>
  )
}
