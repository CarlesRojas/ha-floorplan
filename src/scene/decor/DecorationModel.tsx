import { decorationKind } from '#/decoration/catalog.ts'
import { usePressActions } from '#/scene/decor/press.ts'
import { standHeight } from '#/decoration/surfaces.ts'
import ApplianceModel from '#/scene/decor/ApplianceModel.tsx'
import DecorModel from '#/scene/decor/DecorModel.tsx'
import DeviceModel from '#/scene/decor/DeviceModel.tsx'
import FurnitureModel from '#/scene/decor/FurnitureModel.tsx'
import HearthModel from '#/scene/decor/Hearth.tsx'
import GadgetModel from '#/scene/decor/Gadgets.tsx'
import CountertopModel from '#/scene/decor/Countertop.tsx'
import GardenModel from '#/scene/decor/Garden.tsx'
import LightModel from '#/scene/decor/LightModel.tsx'
import OutdoorModel from '#/scene/decor/Outdoor.tsx'
import { sameState, type ItemState } from '#/scene/decor/state.ts'
import type { DecorationKind } from '#/decoration/catalog.ts'
import { memo, type ReactNode } from 'react'
import type { DecorationConfig, RoomConfig } from '#/types.ts'
import { MathUtils } from 'three'
import { useEased } from '#/scene/decor/ease.ts'

type Props = {
  item: DecorationConfig
  // Every item in the plan, so one standing on another can follow its top.
  all: DecorationConfig[]
  // The room it stands in, for the models that have to know the floor they
  // are on. Absent in the sidebar's preview, where there is no room.
  room?: RoomConfig
  state: ItemState | null
  // How far the standing desks under it have carried it up.
  raise?: number
  onClick?: () => void
  // A right click, or a long press, asks Home Assistant for the entity's own
  // dialog, where everything a click cannot do lives: brightness, color,
  // position.
  onOpen?: () => void
}

type FamilyModel = (props: {
  kind: DecorationKind
  item: DecorationConfig
  state: ItemState | null
  room?: RoomConfig
  all: DecorationConfig[]
}) => ReactNode

const FAMILY_MODELS: Record<string, FamilyModel> = {
  light: LightModel,
  seating: FurnitureModel,
  table: FurnitureModel,
  storage: FurnitureModel,
  bed: FurnitureModel,
  kitchen: ApplianceModel,
  laundry: ApplianceModel,
  bathroom: ApplianceModel,
  media: DeviceModel,
  climate: DeviceModel,
  cover: DeviceModel,
  security: DeviceModel,
  utility: DeviceModel,
  decor: DecorModel,
  outdoor: OutdoorModel,
}

// Kinds drawn by a model other than their family's: the pieces that come
// alive when they are on, a fire, a tree's lights, a tank, a feeder and a
// boiler, all live together, as do the desk gadgets, the small kitchen
// appliances and the garden buildings.
const KIND_MODELS: Record<string, FamilyModel> = {
  fireplace: HearthModel,
  christmas_tree: HearthModel,
  aquarium: HearthModel,
  pet_feeder: HearthModel,
  water_heater: HearthModel,
  pc_tower: GadgetModel,
  laptop: GadgetModel,
  wireless_charger: GadgetModel,
  projector_ust: GadgetModel,
  toaster: CountertopModel,
  cooking_robot: CountertopModel,
  air_fryer: CountertopModel,
  louvred_pergola: GardenModel,
  sauna: GardenModel,
}

// The models that read the rest of the plan, not just the piece they stand
// on: the vacuum finds its way round everything on the floor, and a counter
// cuts holes for the sinks standing on it.
const READS_PLAN = new Set(['vacuum_robot', 'kitchen_counter'])

// Places one decoration item in the scene. Wall and ceiling items are lifted
// to their mounting height here, so every model can be built from its own
// base up around its origin.
function DecorationModel({ item, all, room, state, raise = 0, onClick, onOpen }: Props) {
  const interactive = usePressActions(onClick, onOpen)
  const rise = useEased(raise, 2)
  const kind = decorationKind(item.kind)
  if (!kind) return null
  const Model = KIND_MODELS[kind.id] ?? FAMILY_MODELS[kind.family]
  if (!Model) return null

  const rotation = MathUtils.degToRad(item.rotation ?? 0)
  const lift = standHeight(item, all) + rise

  return (
    <group
      // Named so the editor's outline can find the piece that is picked.
      name={`decoration:${item.id}`}
      position={[item.position[0], lift, -item.position[1]]}
      rotation={[0, rotation, 0]}
      // A press that lands near this item rather than on it finds these.
      userData={onClick ? { pick: { click: onClick, open: onOpen ?? onClick } } : undefined}
      {...interactive}
    >
      <Model kind={kind} item={item} state={state} room={room} all={all} />
    </group>
  )
}

// A piece is only drawn again when something it shows has changed. Moving a
// slider on one piece, or a device reporting on another, used to rebuild
// every model in the flat, and the plan a piece stands in changes with every
// edit, so it only counts through the height it lifts the piece to.
function unchanged(a: Props, b: Props) {
  if (a.raise !== b.raise) return false
  if (a.item !== b.item || a.room !== b.room || a.onClick !== b.onClick || a.onOpen !== b.onOpen) return false
  if (!sameState(a.state, b.state)) return false
  if (a.all === b.all) return true
  return !READS_PLAN.has(a.item.kind) && standHeight(a.item, a.all) === standHeight(b.item, b.all)
}

export default memo(DecorationModel, unchanged)
