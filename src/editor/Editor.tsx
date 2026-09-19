import Canvas from '#/editor/Canvas.tsx'
import PlanPanel from '#/editor/PlanPanel.tsx'
import RoomList from '#/editor/RoomList.tsx'
import type { Selection, Tool } from '#/editor/types.ts'
import { fitView, round, type View } from '#/editor/view.ts'
import { cn } from '#/lib/utils.ts'
import type { CardConfig, HomeAssistant, PlanImageConfig, Point, RoomConfig } from '#/types.ts'
import { useEffect, useRef, useState } from 'react'

type Props = {
  hass: HomeAssistant | null
  config: CardConfig
  onChange: (config: CardConfig) => void
}

const TOOLS: { id: Tool; label: string; key: string }[] = [
  { id: 'select', label: 'Select', key: 'V' },
  { id: 'draw', label: 'Draw room', key: 'D' },
  { id: 'plan', label: 'Move plan', key: 'P' },
]

function nextRoomId(rooms: RoomConfig[]) {
  let n = rooms.length + 1
  while (rooms.some(r => r.id === `room-${n}`)) n++
  return n
}

export default function Editor({ hass, config, onChange }: Props) {
  const [rooms, setRooms] = useState<RoomConfig[]>(config.rooms ?? [])
  const [plan, setPlan] = useState<PlanImageConfig | undefined>(config.plan)
  const [tool, setTool] = useState<Tool>('select')
  const [selection, setSelection] = useState<Selection>({ roomId: null, vertex: null })
  const [draft, setDraft] = useState<Point[]>([])
  const [calibration, setCalibration] = useState<Point[] | null>(null)
  const [view, setView] = useState<View | null>(null)
  const lastEmitted = useRef<string>(JSON.stringify({ rooms: config.rooms ?? [], plan: config.plan }))

  // Pick up edits made outside, for example in the YAML editor.
  useEffect(() => {
    const incoming = JSON.stringify({ rooms: config.rooms ?? [], plan: config.plan })
    if (incoming === lastEmitted.current) return
    lastEmitted.current = incoming
    setRooms(config.rooms ?? [])
    setPlan(config.plan)
  }, [config])

  const commit = (nextRooms: RoomConfig[], nextPlan: PlanImageConfig | undefined = plan) => {
    setRooms(nextRooms)
    setPlan(nextPlan)
    const serialized = JSON.stringify({ rooms: nextRooms, plan: nextPlan })
    if (serialized === lastEmitted.current) return
    lastEmitted.current = serialized
    const next: CardConfig = { ...config, rooms: nextRooms }
    if (nextPlan) next.plan = nextPlan
    else delete next.plan
    onChange(next)
  }

  const updateRoom = (id: string, patch: Partial<RoomConfig>) =>
    commit(rooms.map(r => (r.id === id ? { ...r, ...patch } : r)))

  const deleteRoom = (id: string) => {
    commit(rooms.filter(r => r.id !== id))
    if (selection.roomId === id) setSelection({ roomId: null, vertex: null })
  }

  const closeDraft = () => {
    if (draft.length < 3) return
    const n = nextRoomId(rooms)
    const room: RoomConfig = { id: `room-${n}`, name: `Room ${n}`, points: draft.map(([x, y]) => [round(x), round(y)]) }
    commit([...rooms, room])
    setDraft([])
    setSelection({ roomId: room.id, vertex: null })
    setTool('select')
  }

  const deleteSelectedVertex = () => {
    const room = rooms.find(r => r.id === selection.roomId)
    if (!room || selection.vertex === null || room.points.length <= 3) return
    updateRoom(room.id, { points: room.points.filter((_, i) => i !== selection.vertex) })
    setSelection({ roomId: room.id, vertex: null })
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    const target = e.target as HTMLElement
    if (['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName)) return
    switch (e.key) {
      case 'v':
      case 'V':
        setTool('select')
        break
      case 'd':
      case 'D':
        setTool('draw')
        break
      case 'p':
      case 'P':
        setTool('plan')
        break
      case 'f':
      case 'F':
        setView(null)
        break
      case 'Enter':
        closeDraft()
        break
      case 'Escape':
        setDraft([])
        setCalibration(null)
        setSelection({ roomId: null, vertex: null })
        break
      case 'Delete':
      case 'Backspace':
        deleteSelectedVertex()
        break
      default:
        return
    }
    e.preventDefault()
  }

  const onCalibrationPoint = (p: Point) => {
    if (!calibration || !plan) return
    const points = [...calibration, p]
    if (points.length < 2) {
      setCalibration(points)
      return
    }
    setCalibration(null)
    const [a, b] = points
    const measured = Math.hypot(b[0] - a[0], b[1] - a[1])
    const answer = window.prompt('Real distance between the two points, in meters')
    const real = Number(answer)
    if (!answer || !Number.isFinite(real) || real <= 0 || measured === 0) return
    commit(rooms, { ...plan, width: round((plan.width * real) / measured) })
  }

  const hint = calibration
    ? `Calibrating: click point ${calibration.length + 1} of 2 on the plan`
    : tool === 'draw'
      ? 'Click to add corners. Click the first corner or press Enter to close. Esc cancels.'
      : tool === 'plan'
        ? 'Drag to move the plan image.'
        : 'Click a room to select it. Drag corners to move them, drag the small dots to add corners. Delete removes a corner. Drag empty space to pan, wheel to zoom.'

  return (
    <div
      className="font-montserrat flex flex-col gap-3 text-(--primary-text-color) outline-none"
      tabIndex={0}
      onKeyDown={onKeyDown}
    >
      <div className="flex flex-wrap items-center gap-2">
        {TOOLS.map(t => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTool(t.id)}
            className={cn(
              'rounded-full border border-(--divider-color) px-3 py-1 text-xs font-semibold',
              tool === t.id && 'border-(--primary-color) bg-(--primary-color) text-white',
            )}
          >
            {t.label} <span className="opacity-60">{t.key}</span>
          </button>
        ))}
        <button
          type="button"
          onClick={() => setView(null)}
          className="rounded-full border border-(--divider-color) px-3 py-1 text-xs font-semibold"
        >
          Fit view <span className="opacity-60">F</span>
        </button>
      </div>

      <Canvas
        rooms={rooms}
        plan={plan}
        tool={tool}
        selection={selection}
        draft={draft}
        calibration={calibration}
        view={view}
        onView={setView}
        fit={(w, h) => fitView(rooms, w, h)}
        onSelect={setSelection}
        onRooms={(next, done) => (done ? commit(next) : setRooms(next))}
        onPlan={(next, done) => (done ? commit(rooms, next) : setPlan(next))}
        onDraftPoint={p => setDraft([...draft, p])}
        onCloseDraft={closeDraft}
        onCalibrationPoint={onCalibrationPoint}
      />

      <p className="text-xs text-(--secondary-text-color)">{hint}</p>

      <RoomList
        rooms={rooms}
        areas={Object.values(hass?.areas ?? {})}
        selection={selection}
        onSelect={roomId => setSelection({ roomId, vertex: null })}
        onUpdate={updateRoom}
        onDelete={deleteRoom}
      />

      <PlanPanel
        plan={plan}
        calibrating={calibration !== null}
        onChange={next => commit(rooms, next)}
        onCalibrate={() => setCalibration([])}
      />
    </div>
  )
}
