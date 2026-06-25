interface Props {
  label: string;
  value: string;
  suffix?: string;
}

export default function Stat({ label, value, suffix }: Props) {
  return (
    <div className="stat">
      <span className="stat-label">{label}</span>
      <span className="stat-value">
        {value}
        {suffix && <span className="stat-suffix"> {suffix}</span>}
      </span>
    </div>
  );
}
