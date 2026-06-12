import './Spinner.css';

export function Spinner({ size = 20, color }) {
  return (
    <div
      className="spinner"
      style={{
        width: size,
        height: size,
        borderColor: color ? `${color}33` : undefined,
        borderTopColor: color ?? undefined,
      }}
    />
  );
}
