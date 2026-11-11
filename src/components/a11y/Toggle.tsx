import './toggle.css';

interface ToggleProps {
  on: boolean;
  onClick: () => void;
  label: string;
  disabled?:boolean;
}

export function Toggle({ on, onClick, label, disabled=false }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="ll-switch"
    >
      <span
        aria-hidden="true"
        className="ll-switch__thumb"
      />
    </button>
  );
}
