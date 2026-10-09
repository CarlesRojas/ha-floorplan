import { stubEntity, TileHost, type GridOptions, type TileConfig } from '#/tiles/host.tsx'
import Button from '#/tiles/cards/Button.tsx'
import Camera, { type CameraConfig } from '#/tiles/cards/Camera.tsx'
import Cover, { type CoverConfig } from '#/tiles/cards/Cover.tsx'
import Select, { type SelectConfig } from '#/tiles/cards/Select.tsx'
import Title, { type TitleConfig } from '#/tiles/cards/Title.tsx'
import Toggle from '#/tiles/cards/Toggle.tsx'
import Vacuum, { type VacuumConfig } from '#/tiles/cards/Vacuum.tsx'
import { SplitCard } from '#/tiles/split.ts'
import type { HomeAssistant } from '#/types.ts'
import type { ReactNode } from 'react'

// The Floorplan tiles, shipped in the same file as the floorplan card.

const TOGGLE_DOMAINS = ['light', 'switch', 'input_boolean']
const BUTTON_DOMAINS = ['button', 'input_button', 'script', 'scene']
const COVER_DOMAINS = ['cover']
const VACUUM_DOMAINS = ['vacuum']
const SELECT_DOMAINS = ['select', 'input_select']
const CAMERA_DOMAINS = ['camera']

type EntityView<C extends TileConfig> = (props: {
  env: { hass: HomeAssistant; host: HTMLElement; entityId?: string }
  config: C
}) => ReactNode

// One class per card, which only names its domains and its view.
function entityCard<C extends TileConfig>(domains: string[], View: EntityView<C>) {
  return class extends TileHost<C> {
    protected readonly domains = domains

    static getStubConfig(hass?: HomeAssistant) {
      return { entity: stubEntity(hass, domains) ?? `${domains[0]}.example` }
    }

    protected view() {
      if (!this._hass) return null
      const env = { hass: this._hass, host: this, entityId: this._config!.entity }
      return <View env={env} config={this._config!} />
    }
  }
}

class TitleCard extends TileHost<TitleConfig & TileConfig> {
  protected readonly domains = null

  static getStubConfig() {
    return { title: 'Living Room' }
  }

  getCardSize() {
    return 1
  }

  getGridOptions(): GridOptions {
    return { columns: 'full', rows: 1 }
  }

  protected view() {
    return <Title hass={this._hass} config={this._config!} area={this.area()} />
  }
}

class CameraCard extends entityCard<CameraConfig>(CAMERA_DOMAINS, Camera) {
  getCardSize() {
    return 4
  }

  getGridOptions(): GridOptions {
    return { columns: 12, rows: 'auto' }
  }
}

const CARDS: { type: string; element: CustomElementConstructor; name: string; description: string }[] = [
  {
    type: 'fp-title',
    element: TitleCard,
    name: 'Floorplan Title',
    description: 'Section heading that follows the room filter',
  },
  {
    type: 'fp-toggle',
    element: entityCard(TOGGLE_DOMAINS, Toggle),
    name: 'Floorplan Toggle',
    description: 'Light, switch or boolean tile',
  },
  {
    type: 'fp-button',
    element: entityCard(BUTTON_DOMAINS, Button),
    name: 'Floorplan Button',
    description: 'Button, script or scene tile',
  },
  {
    type: 'fp-cover',
    element: entityCard<CoverConfig>(COVER_DOMAINS, Cover),
    name: 'Floorplan Cover',
    description: 'Blind or screen tile with up, stop and down',
  },
  {
    type: 'fp-vacuum',
    element: entityCard<VacuumConfig>(VACUUM_DOMAINS, Vacuum),
    name: 'Floorplan Vacuum',
    description: 'Robot vacuum tile',
  },
  {
    type: 'fp-select',
    element: entityCard<SelectConfig>(SELECT_DOMAINS, Select),
    name: 'Floorplan Select',
    description: 'Option tile with a menu',
  },
  { type: 'fp-camera', element: CameraCard, name: 'Floorplan Camera', description: 'Camera picture tile' },
  {
    type: 'fp-split',
    element: SplitCard,
    name: 'Floorplan Split',
    description: 'The floorplan on two thirds of the view and its tiles on the rest',
  },
]

export function registerTiles() {
  window.customCards = window.customCards ?? []
  for (const card of CARDS) {
    if (!customElements.get(card.type)) customElements.define(card.type, card.element)
    if (!window.customCards.some(c => c.type === card.type))
      window.customCards.push({ type: card.type, name: card.name, description: card.description })
  }
}
