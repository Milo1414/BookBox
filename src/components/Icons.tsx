interface IconProps {
  className?: string
}

export function IconBook({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 5.5C4 4.67 4.67 4 5.5 4H12v16H5.5C4.67 20 4 19.33 4 18.5V5.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M12 4h6.5C19.33 4 20 4.67 20 5.5v13c0 .83-.67 1.5-1.5 1.5H12"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M12 4v16" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  )
}

export function IconSearch({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="6.25" stroke="currentColor" strokeWidth="1.7" />
      <path d="M16 16.5 20 20.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  )
}

export function IconPlus({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

export function IconHome({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4.5 10.8 12 4.5l7.5 6.3V19a1.5 1.5 0 0 1-1.5 1.5h-3.5v-5.5h-5V20.5H6A1.5 1.5 0 0 1 4.5 19V10.8Z"
        fill="currentColor"
      />
    </svg>
  )
}

export function IconLibrary({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M5 6.2c0-.66.9-1.2 2-1.2s2 .54 2 1.2V18c0 .66-.9 1.2-2 1.2s-2-.54-2-1.2V6.2Z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M11 6.2c0-.66.9-1.2 2-1.2s2 .54 2 1.2V18c0 .66-.9 1.2-2 1.2s-2-.54-2-1.2V6.2Z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path d="M17.2 6.4 20 18.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

export function IconCompass({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.6" />
      <path d="m14.8 9.2-1.2 4.4-4.4 1.2 1.2-4.4 4.4-1.2Z" fill="currentColor" />
    </svg>
  )
}

export function IconClock({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="7.25" stroke="currentColor" strokeWidth="1.7" />
      <path d="M12 8.2V12l2.6 1.6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  )
}

export function IconBookmark({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M7 5.5A1.5 1.5 0 0 1 8.5 4h7A1.5 1.5 0 0 1 17 5.5V20l-5-3.2L7 20V5.5Z"
        fill="currentColor"
      />
    </svg>
  )
}

export function IconCheck({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="7.25" stroke="currentColor" strokeWidth="1.7" />
      <path d="m8.6 12.2 2.3 2.3 4.5-4.8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function IconHeart({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 19.2s-6.4-3.9-8.2-7.6C2.4 9.2 3.3 6.4 6 5.6c1.6-.5 3.3.1 4.2 1.5C11.1 5.7 12.8 5.1 14.4 5.6c2.7.8 3.6 3.6 2.2 6-1.8 3.7-8.6 7.6-8.6 7.6Z"
        fill="currentColor"
      />
    </svg>
  )
}

export function IconChevron({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="m9 5 7 7-7 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function IconFunnel({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4.5 6h15l-5.2 6.4V18l-4.6 2v-7.6L4.5 6Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function IconDots({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="6" cy="12" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="18" cy="12" r="1.6" />
    </svg>
  )
}

export function IconOwned({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4.5 6.5c0-.8 1.2-1.5 2.7-1.5 1.6 0 3.3.5 5.3 1.5 2-1 3.7-1.5 5.3-1.5 1.5 0 2.7.7 2.7 1.5V18c0 .7-1.1 1.3-2.5 1.3-1.6 0-3.4-.5-5.5-1.6-2.1 1.1-3.9 1.6-5.5 1.6-1.4 0-2.5-.6-2.5-1.3V6.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M12.5 6.6V17.4" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  )
}

export function IconStar({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 3.35 14.62 9.1l6.23.7-4.68 4.15 1.35 6.12L12 16.95 6.48 20.07l1.35-6.12-4.68-4.15 6.23-.7L12 3.35Z" />
    </svg>
  )
}

export function IconReading({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M5 7.5h5.2c1.2 0 2.3.6 3 1.6.7-1 1.8-1.6 3-1.6H21V18h-4.6c-1.3 0-2.5.5-3.4 1.4-.9-.9-2.1-1.4-3.4-1.4H3V7.5h2Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  )
}
