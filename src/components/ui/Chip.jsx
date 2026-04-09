export default function Chip({ label, active, small, onClick, style, children }) {
  const classes = ['chip', active ? 'active' : '', small ? 'small' : '']
    .filter(Boolean)
    .join(' ')

  return (
    <span className={classes} onClick={onClick} style={style}>
      {children || label}
    </span>
  )
}
