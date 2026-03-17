/**
 * Northline N-Mark
 *
 * A geometric capital N drawn as three strokes: left vertical, descending
 * diagonal, right vertical — with rounded caps. The diagonal is the active
 * element, evoking a bearing line on a navigation chart. Reads clearly at
 * 12px and above. Always render inside a coloured container or pass a colour
 * via className / style.
 */

interface NMarkProps {
  className?: string
}

export function NMark({ className }: NMarkProps) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M3.5 12.5V3.5L12.5 12.5V3.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/**
 * NMarkContainer — the coloured rounded-square wrapper used in navbars,
 * sidebars, and favicons. Combines the bg-primary box with the NMark inside.
 */
interface NMarkContainerProps {
  size?: 'sm' | 'md'
  className?: string
}

export function NMarkContainer({ size = 'md', className }: NMarkContainerProps) {
  const sizeClasses =
    size === 'sm'
      ? 'h-5 w-5 rounded-md'
      : 'h-6 w-6 rounded-md'
  const iconClass =
    size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'

  return (
    <div
      className={`flex items-center justify-center bg-primary text-primary-foreground shrink-0 ${sizeClasses} ${className ?? ''}`}
    >
      <NMark className={iconClass} />
    </div>
  )
}
