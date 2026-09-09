interface CategoryTagProps {
  category: string
  onClick?: () => void
  active?: boolean
}

export function CategoryTag({ category, onClick, active = false }: CategoryTagProps) {
  if (onClick) {
    return (
      <button type="button" className={`tag ${active ? 'is-active' : ''}`} onClick={onClick}>
        {category}
      </button>
    )
  }
  return <span className="tag">{category}</span>
}
