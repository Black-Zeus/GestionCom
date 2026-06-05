/* eslint-disable react/prop-types */
import { useState } from 'react';
import { Check } from 'lucide-react';
import BottomActionBar from '@/components/common/actions/BottomActionBar';

const fieldClassName = 'h-11 w-full rounded-md border border-slate-300 px-3 text-sm placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100 disabled:text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:disabled:bg-slate-900 dark:focus:border-blue-500 dark:focus:ring-blue-950';
const textareaClassName = 'min-h-24 w-full resize-y rounded-md border border-slate-300 px-3 py-2 text-sm placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100 disabled:text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:disabled:bg-slate-900 dark:focus:border-blue-500 dark:focus:ring-blue-950';

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

const SimpleFormContent = ({
  fields = [],
  initialValues = {},
  onSubmit,
  onClose,
  submitLabel = 'Guardar',
  savingLabel = 'Guardando...',
  actionBarClassName = '-mx-6 -mb-6',
}) => {
  const [form, setForm] = useState(initialValues);
  const [saving, setSaving] = useState(false);
  const setField = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const sections = buildSections(fields);
  const hasSections = fields.some((field) => field.type === 'section');

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await onSubmit(form);
      onClose?.();
    } finally {
      setSaving(false);
    }
  };

  const renderField = (field, columns) => {
    const LeadingIcon = field.leadingIcon;

    return (
      <div key={field.id} className={`space-y-1.5 text-sm ${fieldSpanClass(field, columns)}`}>
        <span className="font-medium text-slate-800 dark:text-slate-100">{field.label}</span>
        {field.type === 'select' ? (
          <select className={`${fieldClassName} bg-white dark:bg-slate-950`} value={form[field.id] ?? ''} onChange={(event) => setField(field.id, event.target.value)} required={field.required}>
            <option value="">{field.required ? 'Seleccione una opcion' : 'Sin seleccion'}</option>
            {field.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        ) : field.type === 'custom' && field.render ? (
          field.render({ form, setField })
        ) : field.type === 'checkbox' ? (
          <label className="flex min-h-11 items-start gap-3 rounded-md border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950">
            <input type="checkbox" checked={Boolean(form[field.id])} onChange={(event) => setField(field.id, event.target.checked)} className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
            <span className="text-sm text-slate-700 dark:text-slate-200">
              <span className="block font-medium">{field.checkLabel}</span>
              {field.help && <span className="mt-0.5 block text-xs font-normal text-slate-500 dark:text-slate-400">{field.help}</span>}
            </span>
          </label>
        ) : field.type === 'textarea' ? (
          <textarea className={textareaClassName} value={form[field.id] ?? ''} onChange={(event) => setField(field.id, event.target.value)} required={field.required} placeholder={field.placeholder} readOnly={field.readOnly} disabled={field.disabled} rows={field.rows || 3} />
        ) : (
          <div className="relative">
            {LeadingIcon && <LeadingIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />}
            <input className={`${fieldClassName} ${LeadingIcon ? 'pl-10' : ''} ${field.mono ? 'font-mono' : ''}`} type={field.type || 'text'} value={form[field.id] ?? ''} onChange={(event) => setField(field.id, event.target.value)} required={field.required} min={field.min} readOnly={field.readOnly} disabled={field.disabled} placeholder={field.placeholder} />
          </div>
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
        actions={[
          { id: 'cancel', label: 'Cancelar', variant: 'neutral', onClick: onClose },
          { id: 'save', label: saving ? savingLabel : submitLabel, icon: Check, variant: 'primary', disabled: saving, type: 'submit' },
        ]}
      />
    </form>
  );
};

export default SimpleFormContent;
