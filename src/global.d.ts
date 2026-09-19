import type { HTMLAttributes } from 'react'

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'ha-card': HTMLAttributes<HTMLElement> & { header?: string }
    }
  }
}
