import './Toggle.css';

export function Toggle({ checked, onChange, label, id }) {
  return (
    <label className="toggle-wrap">
      {label && <span className="toggle-label">{label}</span>}
      {/* Input is inside the label — label click activates it exactly once.
          No htmlFor needed, and no onClick on the visual div to avoid double-fire. */}
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange?.(e.target.checked)}
        className="toggle-input"
      />
      <div className={`toggle ${checked ? 'toggle--on' : ''}`}>
        <div className="toggle-thumb" />
      </div>
    </label>
  );
}
