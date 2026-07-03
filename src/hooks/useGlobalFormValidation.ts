import { useEffect } from 'react';

const SUMMARY_CLASS = 'am-validation-summary';
const INVALID_CLASS = 'am-invalid-field';

function getFieldLabel(field: HTMLElement, form: HTMLFormElement): string {
  const id = field.getAttribute('id');
  if (id) {
    const labelByFor = form.querySelector(`label[for="${id}"]`) as HTMLLabelElement | null;
    if (labelByFor?.textContent?.trim()) return labelByFor.textContent.replace('*', '').trim();
  }

  const nearestLabel = field.closest('div')?.querySelector('label');
  if (nearestLabel?.textContent?.trim()) return nearestLabel.textContent.replace('*', '').trim();

  const ariaLabel = field.getAttribute('aria-label');
  if (ariaLabel?.trim()) return ariaLabel.trim();

  const placeholder = (field as HTMLInputElement).placeholder;
  if (placeholder?.trim()) return placeholder.trim();

  const name = field.getAttribute('name');
  if (name?.trim()) return name.trim();

  return 'This field';
}

function getMessage(field: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement, label: string): string {
  if (field.validity.valueMissing) return `${label} is required.`;
  if (field.validity.typeMismatch && field.type === 'email') return `${label} must be a valid email address.`;
  if (field.validity.tooShort) return `${label} is too short.`;
  if (field.validity.tooLong) return `${label} is too long.`;
  if (field.validity.rangeUnderflow || field.validity.rangeOverflow) return `${label} is out of allowed range.`;
  return field.validationMessage || `${label} is invalid.`;
}

function setFieldInvalidState(field: HTMLElement, isInvalid: boolean) {
  if (isInvalid) {
    field.classList.add(INVALID_CLASS);
  } else {
    field.classList.remove(INVALID_CLASS);
  }

  if (field.tagName.toLowerCase() === 'select') {
    const selectRoot = field.closest('[data-am-select-root]');
    if (selectRoot) {
      if (isInvalid) {
        selectRoot.setAttribute('data-am-invalid', 'true');
      } else {
        selectRoot.removeAttribute('data-am-invalid');
      }
    }
  }
}

function clearValidationSummary(form: HTMLFormElement) {
  const existing = form.querySelector(`.${SUMMARY_CLASS}`);
  if (existing) existing.remove();
}

function renderValidationSummary(form: HTMLFormElement, messages: string[]) {
  clearValidationSummary(form);
  if (!messages.length) return;

  const summary = document.createElement('div');
  summary.className = SUMMARY_CLASS;

  const title = document.createElement('div');
  title.className = 'am-validation-summary-title';
  title.textContent = 'Please review the highlighted fields';

  const list = document.createElement('ul');
  list.className = 'am-validation-summary-list';

  messages.forEach((message) => {
    const item = document.createElement('li');
    item.textContent = message;
    list.appendChild(item);
  });

  summary.appendChild(title);
  summary.appendChild(list);
  form.prepend(summary);
}

function validateForm(form: HTMLFormElement): boolean {
  const controls = Array.from(form.querySelectorAll('input, select, textarea')) as Array<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>;
  const invalidControls = controls.filter((control) => !control.disabled && !control.checkValidity());

  controls.forEach((control) => setFieldInvalidState(control, false));

  if (!invalidControls.length) {
    clearValidationSummary(form);
    form.classList.remove('am-show-validation');
    return true;
  }

  const uniqueMessages = new Set<string>();
  invalidControls.forEach((control) => {
    setFieldInvalidState(control, true);
    const label = getFieldLabel(control, form);
    uniqueMessages.add(getMessage(control, label));
  });

  form.classList.add('am-show-validation');
  renderValidationSummary(form, Array.from(uniqueMessages));

  const firstInvalid = invalidControls[0];
  firstInvalid.focus();
  return false;
}

export default function useGlobalFormValidation() {
  useEffect(() => {
    const applyNoValidate = () => {
      const forms = document.querySelectorAll('form');
      forms.forEach((form) => {
        const htmlForm = form as HTMLFormElement;
        if (!htmlForm.noValidate) htmlForm.noValidate = true;
      });
    };

    applyNoValidate();

    const observer = new MutationObserver(() => applyNoValidate());
    observer.observe(document.body, { childList: true, subtree: true });

    const handleSubmitCapture = (event: Event) => {
      const form = event.target as HTMLFormElement | null;
      if (!(form instanceof HTMLFormElement)) return;

      const isValid = validateForm(form);
      if (!isValid) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    const handleInputCapture = (event: Event) => {
      const target = event.target as HTMLElement | null;
      if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement)) return;

      if (!target.closest('form')?.classList.contains('am-show-validation')) return;

      setFieldInvalidState(target, !target.checkValidity());
      const form = target.closest('form') as HTMLFormElement | null;
      if (!form) return;

      const hasInvalid = Array.from(form.querySelectorAll('input, select, textarea')).some((control) => {
        const field = control as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
        return !field.disabled && !field.checkValidity();
      });

      if (!hasInvalid) {
        form.classList.remove('am-show-validation');
        clearValidationSummary(form);
      }
    };

    document.addEventListener('submit', handleSubmitCapture, true);
    document.addEventListener('input', handleInputCapture, true);
    document.addEventListener('change', handleInputCapture, true);

    return () => {
      observer.disconnect();
      document.removeEventListener('submit', handleSubmitCapture, true);
      document.removeEventListener('input', handleInputCapture, true);
      document.removeEventListener('change', handleInputCapture, true);
    };
  }, []);
}
