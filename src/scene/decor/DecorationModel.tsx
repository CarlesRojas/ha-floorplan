import { decorationKind } from '#/decoration/catalog.ts'
import { usePressActions } from '#/scene/decor/press.ts'
import { standHeight } from '#/decoration/surfaces.ts'
import ApplianceModel from '#/scene/decor/ApplianceModel.tsx'
import DecorModel from '#/scene/decor/DecorModel.tsx'
import DeviceModel from '#/scene/decor/DeviceModel.tsx'
import FurnitureModel from '#/scene/decor/FurnitureModel.tsx'
import LightModel from '#/scene/decor/LightModel.tsx'
import type { ItemState } from '#/scene/decor/state.ts'
import type { DecorationKind } from '#/decoration/catalog.ts'
import type { ReactNode } from 'react'
import type { DecorationConfig } from '#/types.ts'
import { MathUtils } from 'three'

type Props = {
  item: DecorationConfig
  // Every item in the plan, so one standing on another can follow its top.
  all: DecorationConfig[]
  state: ItemState | null
  onClick?: () => void
  // A right click, or a long press, asks Home Assistant for the entity's own
  // dialog, where everything a click cannot do lives: brightness, color,
  // position.
  onOpen?: () => void
}

type FamilyModel = (props: { kind: DecorationKind; item: DecorationConfig; state: ItemState | null }) => ReactNode

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
}

// Places one decoration item in the scene. Wall and ceiling items are lifted
// to their mounting height here, so every model can be built from its own
// base up around its origin.
export default function DecorationModel({ item, all, state, onClick, onOpen }: Props) {
  const interactive = usePressActions(onClick, onOpen)
  const kind = decorationKind(item.kind)
  if (!kind) return null
  const Model = FAMILY_MODELS[kind.family]
  if (!Model) return null

  const rotation = MathUtils.degToRad(item.rotation ?? 0)
  const lift = standHeight(item, all)

  return (
    <group
      position={[item.position[0], lift, -item.position[1]]}
      rotation={[0, rotation, 0]}
      // A press that lands near this item rather than on it finds these.
      userData={onClick ? { pick: { click: onClick, open: onOpen ?? onClick } } : undefined}
      {...interactive}
    >
      <Model kind={kind} item={item} state={state} />
    </group>
  )
}
