export default function Card({ children, className = '', style, variant }) {
  const classes = ['card', variant === 'vault' ? 'card-vault' : '', className]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={classes} style={style}>
      {children}
    </div>
  )
}
