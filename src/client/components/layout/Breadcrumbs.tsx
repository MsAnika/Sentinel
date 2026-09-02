import React from 'react'
import { ChevronRight } from 'lucide-react'

export interface BreadcrumbItem {
  label: string
  onClick?: () => void
}

/** A persistent trail so the analyst always knows where they are inside a
 * drill-down (Home > Assessment #.. > Findings > ..), and can jump back to
 * any earlier level in one click instead of repeatedly hitting "back". */
export const Breadcrumbs: React.FC<{ items: BreadcrumbItem[] }> = ({ items }) => {
  if (items.length <= 1) return null
  return (
    <nav className="flex items-center gap-1.5 text-[11px] font-mono text-zinc-500">
      {items.map((item, i) => {
        const isLast = i === items.length - 1
        return (
          <React.Fragment key={i}>
            {i > 0 && <ChevronRight className="h-3 w-3 shrink-0 text-zinc-700" />}
            {item.onClick && !isLast ? (
              <button
                onClick={item.onClick}
                className="uppercase tracking-wider hover:text-cyan-300 transition-colors cursor-pointer"
              >
                {item.label}
              </button>
            ) : (
              <span className={isLast ? 'uppercase tracking-wider font-bold text-zinc-300' : 'uppercase tracking-wider'}>
                {item.label}
              </span>
            )}
          </React.Fragment>
        )
      })}
    </nav>
  )
}
