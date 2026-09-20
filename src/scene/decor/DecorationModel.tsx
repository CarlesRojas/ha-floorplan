import { decorationKind, mountHeight } from '#/decoration/catalog.ts'
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
  state: ItemState | null
  onClick?: () => void
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
export default function DecorationModel({ item, state, onClick }: Props) {
  const kind = decorationKind(item.kind)
  if (!kind) return null
  const Model = FAMILY_MODELS[kind.family]
  if (!Model) return null

  const rotation = MathUtils.degToRad(item.rotation ?? 0)
  const lift = mountHeight(kind, item.params)

  const interactive = onClick
    ? {
        onClick: (e: { stopPropagation: () => void }) => {
          e.stopPropagation()
          onClick()
        },
        onPointerOver: () => (document.body.style.cursor = 'pointer'),
        onPointerOut: () => (document.body.style.cursor = ''),
      }
    : {}

  return (
    <group position={[item.position[0], lift, -item.position[1]]} rotation={[0, rotation, 0]} {...interactive}>
      <Model kind={kind} item={item} state={state} />
    </group>
  )
}
