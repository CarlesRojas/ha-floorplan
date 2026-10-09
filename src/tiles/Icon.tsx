import { cn } from '#/lib/utils.ts'
import { PHOSPHOR_ICONS, phosphor } from '#/tiles/icons.ts'

const warned = new Set<string>()

type Props = { icon: string; on?: boolean; className?: string }

// An icon written as `ph:<name>` is drawn from the bundled Phosphor set.
// Anything else, like `mdi:lightbulb`, goes to Home Assistant's own icon
// element, which knows every icon Home Assistant does.
export function Icon({ icon, on = false, className }: Props) {
  if (icon.startsWith('ph:')) {
    const name = icon.slice(3)
    let svg = phosphor(name, on)
    if (!svg) {
      if (!warned.has(name)) {
        warned.add(name)
        console.warn(`Floorplan tiles: ph:${name} is not one of the bundled icons: ${PHOSPHOR_ICONS.join(', ')}`)
      }
      svg = phosphor('question', on)
    }
    return <span aria-hidden className={cn('fp-icon', className)} dangerouslySetInnerHTML={{ __html: svg ?? '' }} />
  }
  return <ha-icon aria-hidden className={cn('fp-icon', className)} icon={icon} />
}
