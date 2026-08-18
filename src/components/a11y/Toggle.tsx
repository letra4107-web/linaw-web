interface ToggleProps {
  on: boolean;
  onClick: () => void;
  label: string;
}

export function Toggle({ on, onClick, label }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onClick}
      className={`relative h-7 w-12 shrink-0 rounded-full border-2 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] ${
        on ? 'border-[var(--color-success)] bg-[var(--color-success)]' : 'border-gray-300 bg-gray-300'
      }`}
    >
      <span className="sr-only">{label}</span>
      <span
        className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
          on ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}
