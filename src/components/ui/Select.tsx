import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';

interface OptionItem {
  value: string;
  label: string;
  disabled?: boolean;
}

function parseOptions(children: React.ReactNode): OptionItem[] {
  const options: OptionItem[] = [];
  React.Children.forEach(children, (child) => {
    if (React.isValidElement(child) && child.type === 'option') {
      const props = child.props as { value?: string | number; children?: React.ReactNode; disabled?: boolean };
      options.push({
        value: String(props.value ?? ''),
        label: String(props.children ?? ''),
        disabled: props.disabled,
      });
    }
  });
  return options;
}

interface SelectProps {
  value?: string | number;
  onChange?: React.ChangeEventHandler<HTMLSelectElement>;
  children: React.ReactNode;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  searchable?: boolean;
}

export default function Select({ value, onChange, children, required, disabled, className, searchable = true }: SelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const options = parseOptions(children);
  const selectedOption = options.find((o) => o.value === String(value ?? ''));
  const filteredOptions = searchable && query.trim()
    ? options.filter((opt) => opt.label.toLowerCase().includes(query.trim().toLowerCase()))
    : options;

  function updateMenuPosition() {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const estimatedMenuHeight = searchable ? 270 : 220;
    const spaceBelow = viewportHeight - rect.bottom;
    const openUpward = spaceBelow < estimatedMenuHeight && rect.top > spaceBelow;

    setMenuStyle({
      position: 'fixed',
      left: rect.left,
      width: rect.width,
      zIndex: 250,
      top: openUpward ? undefined : rect.bottom + 6,
      bottom: openUpward ? viewportHeight - rect.top + 6 : undefined,
    });
  }

  useEffect(() => {
    if (!open) return;
    function handleOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(target)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    updateMenuPosition();
    const handleReposition = () => updateMenuPosition();

    window.addEventListener('resize', handleReposition);
    window.addEventListener('scroll', handleReposition, true);
    return () => {
      window.removeEventListener('resize', handleReposition);
      window.removeEventListener('scroll', handleReposition, true);
    };
  }, [open, searchable, options.length]);

  useEffect(() => {
    if (open) {
      if (searchable && searchRef.current) {
        try {
          searchRef.current.focus({ preventScroll: true });
        } catch {
          // Older browsers may not support focus options.
          searchRef.current.focus();
        }
      }
      return;
    }
    setQuery('');
  }, [open, searchable]);

  function handleSelect(optValue: string) {
    onChange?.({ target: { value: optValue } } as React.ChangeEvent<HTMLSelectElement>);
    setOpen(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') setOpen(false);
    if ((e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') && !open) {
      e.preventDefault();
      setOpen(true);
    }
  }

  return (
    <div ref={containerRef} className={clsx('relative w-full', className)} data-am-select-root="true">
      {/* Hidden native select keeps form validation working */}
      <select
        value={String(value ?? '')}
        required={required}
        disabled={disabled}
        onChange={onChange}
        tabIndex={-1}
        aria-hidden="true"
        className="absolute inset-0 w-full opacity-0 pointer-events-none"
      >
        {children}
      </select>

      {/* Trigger */}
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        onKeyDown={handleKeyDown}
        className={clsx(
          'w-full flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm text-left',
          'bg-white border shadow-[0_1px_3px_rgba(0,0,0,0.07)]',
          'outline-none transition-all duration-150',
          open
            ? 'border-brand ring-2 ring-[rgba(31,43,123,0.15)]'
            : 'border-[#d1d5db] hover:border-[#9ca3af] focus:border-brand focus:ring-2 focus:ring-[rgba(31,43,123,0.15)]',
          disabled ? 'opacity-50 cursor-not-allowed bg-[#f9fafb]' : 'cursor-pointer',
        )}
      >
        <span className={clsx('truncate', !selectedOption || selectedOption.value === '' ? 'text-[#9ca3af]' : 'text-[#1f2937]')}>
          {selectedOption?.label ?? ''}
        </span>
        <svg
          width="15" height="15" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2.5"
          strokeLinecap="round" strokeLinejoin="round"
          className={clsx('shrink-0 text-brand transition-transform duration-200', open && 'rotate-180')}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Dropdown list */}
      {open && createPortal(
        <div
          ref={dropdownRef}
          style={menuStyle}
          className="bg-white border border-[#e5e7eb] rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.13)] overflow-hidden"
        >
          {searchable && (
            <div className="p-2 border-b border-[#eef0f3]">
              <input
                ref={searchRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search…"
                className="w-full rounded-lg border border-[#dbe0e6] bg-white px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-[rgba(31,43,123,0.12)]"
              />
            </div>
          )}
          <div className="max-h-[220px] overflow-y-auto py-1">
            {filteredOptions.length === 0 && (
              <div className="px-3 py-3 text-sm text-[#9ca3af]">No matches</div>
            )}
            {filteredOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                disabled={opt.disabled}
                onClick={() => !opt.disabled && handleSelect(opt.value)}
                className={clsx(
                  'w-full text-left px-3 py-2.5 text-sm transition-colors',
                  String(value ?? '') === opt.value
                    ? 'bg-[rgba(31,43,123,0.09)] text-brand font-semibold'
                    : opt.value === ''
                      ? 'text-[#9ca3af] hover:bg-[#f9fafb]'
                      : 'text-[#374151] hover:bg-[#f5f7fa]',
                  opt.disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer',
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
