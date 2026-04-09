export default function ProgressBar({ step, labels }) {
  return (
    <div className="progress">
      {labels.map((label, i) => (
        <div key={label} className="progress-step">
          <div
            className={`progress-bar ${
              i === step ? 'active' : i < step ? 'done' : ''
            }`}
          />
          <span
            className={`progress-label ${
              i === step ? 'active' : i < step ? 'done' : ''
            }`}
          >
            {label}
          </span>
        </div>
      ))}
    </div>
  )
}
