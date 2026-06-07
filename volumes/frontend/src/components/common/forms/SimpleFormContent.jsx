/* eslint-disable react/prop-types */
import { useState } from 'react';
import { AlertTriangle, Check } from 'lucide-react';
import BottomActionBar from '@/components/common/actions/BottomActionBar';
import AutocompleteSelect from '@/components/common/forms/AutocompleteSelect';
import { getBackendMessage } from '@/services/ui/notify';
import { formatPhone, normalizePhoneForStorage, validatePhoneMessage } from '@/utils/phone';
import { formatRut, normalizeRutForStorage, validateRutMessage } from '@/utils/rut';

const fieldClassName = 'h-11 w-full rounded-md border border-slate-300 px-3 text-sm placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100 disabled:text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:disabled:bg-slate-900 dark:focus:border-blue-500 dark:focus:ring-blue-950';
const textareaClassName = 'min-h-24 w-full resize-y rounded-md border border-slate-300 px-3 py-2 text-sm placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100 disabled:text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:disabled:bg-slate-900 dark:focus:border-blue-500 dark:focus:ring-blue-950';

const formatThousands = (value = '') => {
  const cleaned = String(value ?? '').replace(/[^\d]/g, '');
  if (!cleaned) return '';
  return new Intl.NumberFormat('es-CL').format(Number(cleaned));
};

const unformatNumber = (value = '') => String(value ?? '').replace(/[^\d]/g, '');

const sectionGridClass = {
  2: 'md:grid-cols-2',
  3: 'md:grid-cols-2 xl:grid-cols-3',
};

const buildSections = (fields) => {
  if (!fields.some((field) => field.type === 'section')) return [{ id: 'default', fields, columns: 2 }];

  const sections = [];
  let currentSection = null;

  fields.forEach((field) => {
    if (field.type === 'section') {
      currentSection = { ...field, fields: [], columns: field.columns || 2 };
      sections.push(currentSection);
      return;
    }

    if (!currentSection) {
      currentSection = { id: 'default', fields: [], columns: 2 };
      sections.push(currentSection);
    }

    currentSection.fields.push(field);
  });

  return sections;
};

const fieldSpanClass = (field, columns = 2) => {
  if (field.span === 'full' || field.wide) return columns === 3 ? 'md:col-span-2 xl:col-span-3' : 'md:col-span-2';
  if (field.span === 2) return 'md:col-span-2';
  return '';
};

const normalizeFormValues = (fields = [], values = {}) => fields.reduce((current, field) => {
  const value = current[field.id];
  if (!value) return current;
  if (field.validation === 'rut') return { ...current, [field.id]: formatRut(value) };
  if (field.validation === 'phone') return { ...current, [field.id]: formatPhone(value) };
  return current;
}, { ...values });

const SimpleFormContent = ({
  fields = [],
  initialValues = {},
  onSubmit,
  onClose,
  submitLabel = 'Guardar',
  savingLabel = 'Guardando...',
  actionBarClassName = '-mx-6 -mb-6',
}) => {
  const [form, setForm] = useState(() => normalizeFormValues(fields, initialValues));
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [saving, setSaving] = useState(false);
  const setField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  };
  const sections = buildSections(fields);
  const hasSections = fields.some((field) => field.type === 'section');

  const validateForm = (nextForm) => {
    const nextErrors = {};
    fields.forEach((field) => {
      if (field.type === 'section' || field.type === 'custom' || field.disabled || field.readOnly) return;
      const value = nextForm[field.id];
      if (field.required && (value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0))) {
        nextErrors[field.id] = `${field.label} es requerido.`;
        return;
      }
      if (field.validation === 'rut') {
        const rutError = validateRutMessage(value);
        if (rutError) nextErrors[field.id] = rutError;
      }
      if (field.validation === 'phone') {
        const phoneError = validatePhoneMessage(value);
        if (phoneError) nextErrors[field.id] = phoneError;
      }
    });
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const submit = async (event) => {
    event.preventDefault();
    setSubmitError('');
    const displayForm = fields.reduce((current, field) => {
      if (!current[field.id]) return current;
      if (field.validation === 'rut') return { ...current, [field.id]: formatRut(current[field.id]) };
      if (field.validation === 'phone') return { ...current, [field.id]: formatPhone(current[field.id]) };
      return current;
    }, form);
    const payloadForm = fields.reduce((current, field) => {
      if (!current[field.id]) return current;
      if (field.validation === 'rut') return { ...current, [field.id]: normalizeRutForStorage(current[field.id]) };
      if (field.validation === 'phone') return { ...current, [field.id]: normalizePhoneForStorage(current[field.id]) };
      return current;
    }, displayForm);
    setForm(displayForm);
    if (!validateForm(displayForm)) {
      setSubmitError('Revisa los campos marcados antes de guardar.');
      return;
    }
    setSaving(true);
    try {
      await onSubmit(payloadForm);
      onClose?.();
    } catch (error) {
      setSubmitError(getBackendMessage(error, 'No fue posible guardar los cambios. Revisa la informacion ingresada o intenta nuevamente.'));
    } finally {
      setSaving(false);
    }
  };

  const renderField = (field, columns) => {
    const LeadingIcon = field.leadingIcon;
    const hasError = Boolean(errors[field.id]);
    const inputStateClass = hasError ? 'border-red-300 focus:border-red-400 focus:ring-red-100 dark:border-red-700 dark:focus:border-red-500 dark:focus:ring-red-950' : '';
    const selectedOption = field.type === 'select' ? field.options.find((option) => String(option.value) === String(form[field.id] ?? '')) : null;

    return (
      <div key={field.id} className={`space-y-1.5 text-sm ${fieldSpanClass(field, columns)}`}>
        {field.collapseLabel ? null : field.hideLabel ? (
          <span aria-hidden="true" className="block invisible font-medium">Campo</span>
        ) : (
          <span className="font-medium text-slate-800 dark:text-slate-100">{field.label}</span>
        )}
        {field.type === 'select' ? (
          <select className={`${fieldClassName} ${inputStateClass} bg-white dark:bg-slate-950`} value={form[field.id] ?? ''} onChange={(event) => setField(field.id, event.target.value)} required={field.required} disabled={field.disabled}>
            <option value="">{field.emptyLabel || (field.required ? 'Seleccione una opcion' : 'Sin seleccion')}</option>
            {field.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        ) : field.type === 'autocomplete' ? (
          <AutocompleteSelect
            value={form[field.id] ?? ''}
            onChange={(value) => setField(field.id, value)}
            options={field.options}
            placeholder={field.placeholder || 'Seleccionar'}
            searchPlaceholder={field.searchPlaceholder || 'Buscar opcion'}
            clearable={field.clearable}
            showIcons={field.showIcons}
            multiple={field.multiple}
            maxVisibleTags={field.maxVisibleTags}
            disabled={field.disabled}
          />
        ) : field.type === 'custom' && field.render ? (
          field.render({ form, setField, field })
        ) : field.type === 'checkbox' ? (
          <label className={`flex min-h-11 items-start gap-3 rounded-md border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950 ${field.disabled ? 'opacity-70' : ''}`}>
            <input type="checkbox" checked={Boolean(form[field.id])} onChange={(event) => setField(field.id, event.target.checked)} disabled={field.disabled} className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 disabled:cursor-not-allowed" />
            <span className="text-sm text-slate-700 dark:text-slate-200">
              <span className="block font-medium">{field.checkLabel}</span>
              {field.help && <span className="mt-0.5 block text-xs font-normal text-slate-500 dark:text-slate-400">{field.help}</span>}
            </span>
          </label>
        ) : field.type === 'textarea' ? (
          <textarea className={`${textareaClassName} ${inputStateClass}`} value={form[field.id] ?? ''} onChange={(event) => setField(field.id, event.target.value)} required={field.required} placeholder={field.placeholder} readOnly={field.readOnly} disabled={field.disabled} rows={field.rows || 3} />
        ) : field.type === 'amount' ? (
          <div className="relative">
            {LeadingIcon && <LeadingIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />}
            <input
              className={`${fieldClassName} ${inputStateClass} ${LeadingIcon ? 'pl-10' : ''} text-right tabular-nums`}
              inputMode="numeric"
              value={formatThousands(form[field.id])}
              onChange={(event) => setField(field.id, unformatNumber(event.target.value))}
              required={field.required}
              min={field.min}
              readOnly={field.readOnly}
              disabled={field.disabled}
              placeholder={field.placeholder}
            />
          </div>
        ) : (
          <div className="relative">
            {LeadingIcon && <LeadingIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />}
            {field.prefix && !LeadingIcon && <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-500">{field.prefix}</span>}
            {field.suffix && <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-500">{field.suffix}</span>}
            <input
              className={`${fieldClassName} ${inputStateClass} ${LeadingIcon || field.prefix ? 'pl-10' : ''} ${field.suffix ? 'pr-9' : ''} ${field.mono ? 'font-mono' : ''}`}
              type={field.type || 'text'}
              value={form[field.id] ?? ''}
              onChange={(event) => setField(field.id, event.target.value)}
              onBlur={() => {
                if (!form[field.id]) return;
                if (field.validation === 'rut') {
                  const formattedValue = formatRut(form[field.id]);
                  setField(field.id, formattedValue);
                  const rutError = validateRutMessage(formattedValue);
                  if (rutError) setErrors((current) => ({ ...current, [field.id]: rutError }));
                }
                if (field.validation === 'phone') {
                  const formattedValue = formatPhone(form[field.id]);
                  setField(field.id, formattedValue);
                  const phoneError = validatePhoneMessage(formattedValue);
                  if (phoneError) setErrors((current) => ({ ...current, [field.id]: phoneError }));
                }
              }}
              required={field.required}
              min={field.min}
              readOnly={field.readOnly}
              disabled={field.disabled}
              placeholder={field.placeholder}
            />
          </div>
        )}
        {hasError && <span className="block text-xs font-medium text-red-600 dark:text-red-400">{errors[field.id]}</span>}
        {field.showOptionDescription !== false && selectedOption?.description && (
          <span className="block rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-xs leading-5 text-blue-800 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-200">
            {selectedOption.description}
          </span>
        )}
        {field.help && field.type !== 'checkbox' && <span className="block text-xs text-slate-500 dark:text-slate-400">{field.help}</span>}
      </div>
    );
  };

  return (
    <form onSubmit={submit} className="space-y-6">
      <div className={hasSections ? 'space-y-4' : 'grid gap-x-3 gap-y-4 md:grid-cols-2'}>
        {sections.map((section) => {
          const Icon = section.icon;
          const columns = section.columns || 2;
          const content = (
            <div key={section.id} className={`grid gap-x-3 gap-y-4 ${sectionGridClass[columns] || sectionGridClass[2]}`}>
              {section.fields.map((field) => renderField(field, columns))}
            </div>
          );

          if (!hasSections || section.id === 'default') return content;

          return (
            <section key={section.id} className="rounded-md border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <div className="mb-4 flex items-start gap-3">
                {Icon && (
                  <span className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-md bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-300">
                    <Icon className="h-4 w-4" />
                  </span>
                )}
                <div className="min-w-0">
                  <h3 className="text-base font-semibold text-slate-900 dark:text-slate-50">{section.label}</h3>
                  {section.description && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{section.description}</p>}
                </div>
              </div>
              {content}
            </section>
          );
        })}
      </div>
      <BottomActionBar
        className={actionBarClassName}
        leftContent={submitError ? (
          <div className="flex w-[90%] max-w-none items-start gap-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200">
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-200">
              <AlertTriangle className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold">Error al guardar</p>
              <p className="mt-0.5 text-xs leading-5">{submitError}</p>
            </div>
          </div>
        ) : null}
        actions={[
          { id: 'cancel', label: 'Cancelar', variant: 'neutral', onClick: onClose },
          { id: 'save', label: saving ? savingLabel : submitLabel, icon: Check, variant: 'primary', disabled: saving, type: 'submit' },
        ]}
      />
    </form>
  );
};

export default SimpleFormContent;
