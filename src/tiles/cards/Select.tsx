import { callService, type TileEnv } from '#/tiles/actions.ts'
import type { TileConfig } from '#/tiles/host.tsx'
import { Icon } from '#/tiles/Icon.tsx'
import { Tile } from '#/tiles/Tile.tsx'
import { useRef } from 'react'

export type SelectConfig = TileConfig & { tap_behavior?: 'menu' | 'cycle' }

const GAP = 8

type Props = { env: TileEnv; config: SelectConfig }

// A select or a dropdown helper. A tap opens a menu of its options beside
// the tile, or with tap_behavior: cycle moves on to the next option.
export default function Select({ env, config }: Props) {
  const entity = env.hass.states[config.entity!]
  const domain = config.entity!.split('.')[0]
  const options = Array.isArray(entity?.attributes.options) ? (entity.attributes.options as string[]) : []
  const anchor = useRef<HTMLDivElement>(null)
  const menu = useRef<HTMLDivElement>(null)

  const choose = (option: string) => {
    menu.current?.hidePopover()
    if (option !== entity?.state) callService(env.hass, `${domain}.select_option`, { entity_id: config.entity, option })
  }

  // The menu sits in the top layer, so it is placed by hand: under the
  // tile, or over it when there is no room below, and kept on screen.
  const open = () => {
    const el = menu.current
    const box = anchor.current?.getBoundingClientRect()
    if (!el || !box) return
    el.showPopover()
    const { width, height } = el.getBoundingClientRect()
    const below = box.bottom + GAP + height <= window.innerHeight
    const top = below ? box.bottom + GAP : Math.max(GAP, box.top - GAP - height)
    const left = Math.min(Math.max(GAP, box.left), window.innerWidth - width - GAP)
    el.style.top = `${top}px`
    el.style.left = `${left}px`
    el.style.setProperty('--_origin', below ? 'top left' : 'bottom left')
    el.querySelector<HTMLElement>('[aria-checked="true"]')?.focus()
  }

  const tap = () => {
    if (config.tap_behavior === 'cycle')
      callService(env.hass, `${domain}.select_next`, { entity_id: config.entity, cycle: true })
    else open()
  }

  return (
    <div ref={anchor} className="h-full">
      <Tile env={env} config={config} entity={entity} state={entity?.state ?? ''} onTap={tap} />
      <div
        ref={menu}
        popover="auto"
        role="menu"
        className="fp-menu"
        onKeyDown={e => {
          const items = [...(menu.current?.querySelectorAll<HTMLElement>('.fp-option') ?? [])]
          const at = items.indexOf(e.target as HTMLElement)
          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault()
            const step = e.key === 'ArrowDown' ? 1 : -1
            items[(at + step + items.length) % items.length]?.focus()
          }
        }}
      >
        {options.map(option => (
          <button
            key={option}
            type="button"
            role="menuitemradio"
            aria-checked={option === entity?.state}
            className="fp-option"
            onClick={() => choose(option)}
          >
            <span className="min-w-0 flex-1 truncate">{option}</span>
            {option === entity?.state && <Icon icon="ph:check" className="fp-check" />}
          </button>
        ))}
      </div>
    </div>
  )
}
