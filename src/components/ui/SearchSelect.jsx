import { useState, useRef, useEffect } from 'react'

export default function SearchSelect({ groups, selected, onSelect, placeholder }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const q = query.toLowerCase()
  const filtered = groups
    .map((g) => ({
      ...g,
      items: g.items.filter(
        (item) => item.toLowerCase().includes(q) && !selected.includes(item),
      ),
    }))
    .filter((g) => g.items.length > 0)

  return (
    <div className="search-select" ref={ref}>
      <input
        className="field-input"
        placeholder={placeholder || 'Search...'}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        autoComplete="off"
      />
      {open && filtered.length > 0 && (
        <div className="search-select-dropdown">
          {filtered.map((g) => (
            <div key={g.group}>
              <div className="search-select-group">{g.group}</div>
              {g.items.map((item) => (
                <div
                  key={item}
                  className="search-select-item"
                  onClick={() => {
                    onSelect(item)
                    setQuery('')
                    setOpen(false)
                  }}
                >
                  {item}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
