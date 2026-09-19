import Canvas from '#/editor/Canvas.tsx'
import Overlay from '#/editor/Overlay.tsx'
import PlanPanel from '#/editor/PlanPanel.tsx'
import RoomList from '#/editor/RoomList.tsx'
import Toolbar from '#/editor/Toolbar.tsx'
import type { Selection, Tool } from '#/editor/types.ts'
import { fitView, round, type View } from '#/editor/view.ts'
import { EDITOR_SIDEBAR_WIDTH_PX } from '#/constants.ts'
import type { CardConfig, HomeAssistant, PlanImageConfig, Point, RoomConfig } from '#/types.ts'
import { useEffect, useRef, useState } from 'react'

type Props = {
  hass: HomeAssistant | null
  config: CardConfig
  onChange: (config: CardConfig) => void
}

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
  const [fullscreen, setFullscreen] = useState(true)
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
        if (e.shiftKey) setFullscreen(!fullscreen)
        else setView(null)
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
        : 'Click a room to select it. Drag corners to move them, click the plus signs to add corners. Delete removes a corner. Drag empty space to pan, wheel to zoom.'

  const canvas = (
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
      fill={fullscreen}
    />
  )

  const toolbar = (
    <Toolbar
      tool={tool}
      fullscreen={fullscreen}
      onTool={setTool}
      onFit={() => setView(null)}
      onFullscreen={setFullscreen}
    />
  )

  const panels = (
    <>
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
    </>
  )

  const hintLine = <p className="text-xs text-(--secondary-text-color)">{hint}</p>

  if (fullscreen) {
    return (
      <Overlay>
        <div
          className="font-montserrat flex h-full flex-col gap-3 bg-(--card-background-color) p-4 text-(--primary-text-color) outline-none"
          tabIndex={0}
          onKeyDown={onKeyDown}
        >
          <div className="flex items-center gap-4">
            {toolbar}
            {hintLine}
          </div>
          <div className="flex min-h-0 flex-1 gap-4">
            <div className="min-w-0 flex-1">{canvas}</div>
            <div className="flex shrink-0 flex-col gap-3 overflow-y-auto" style={{ width: EDITOR_SIDEBAR_WIDTH_PX }}>
              {panels}
            </div>
          </div>
        </div>
      </Overlay>
    )
  }

  return (
    <div
      className="font-montserrat flex flex-col gap-3 text-(--primary-text-color) outline-none"
      tabIndex={0}
      onKeyDown={onKeyDown}
    >
      {toolbar}
      {canvas}
      {hintLine}
      {panels}
    </div>
  )
}
