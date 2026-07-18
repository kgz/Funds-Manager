import React from 'react';
import { cn } from '@/lib/utils/cn'; // Assuming you have this utility

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  icons?: {
    on?: React.ReactNode;
    off?: React.ReactNode;
  };
  disabled?: boolean;
  id?: string; // For associating label
}

export const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
  checked,
  onChange,
  label,
  icons,
  disabled = false,
  id = `toggle-switch-${React.useId()}`, // Generate unique ID
}) => {
  const handleToggle = () => {
    if (!disabled) {
      onChange(!checked);
    }
  };

  return (
    <label
      htmlFor={id}
      className={cn(
        'flex items-center gap-2 text-sm',
        disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
        'text-paper-muted hover:text-paper-fg' // Match label style
      )}
    >
      {/* The visual switch */}
      <button
        type="button"
        id={id}
        role="switch"
        aria-checked={checked}
        onClick={handleToggle}
        disabled={disabled}
        className={cn(
          'relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-secondary-default focus:ring-offset-2 focus:ring-offset-black',
          checked ? 'bg-secondary-default' : 'bg-gray-600', // Use secondary for 'on', gray for 'off'
          disabled ? 'cursor-not-allowed' : 'cursor-pointer'
        )}
      >
        {/* Switch knob */}
        <span
          aria-hidden="true"
          className={cn(
            'pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
            checked ? 'translate-x-4' : 'translate-x-0' // Move knob
          )}
        />
      </button>

      {/* Optional Label Text */}
      {label && <span>{label}</span>}

      {/* Optional Icons */}
      {icons && (
        <span className="ml-1">
          {checked ? icons.on : icons.off}
        </span>
      )}
    </label>
  );
};
