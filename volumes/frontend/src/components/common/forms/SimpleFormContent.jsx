/* eslint-disable react/prop-types */
import { useState } from 'react';

const fieldClassName = 'h-11 w-full rounded-md border border-slate-300 px-3 text-sm dark:border-slate-700 dark:bg-slate-950';

const SimpleFormContent = ({ fields = [], initialValues = {}, onSubmit, onClose }) => {
  const [form, setForm] = useState(initialValues);
  const [saving, setSaving] = useState(false);
  const setField = (field, value) => setForm((current) => ({ ...current, [field]: value }));

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

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="grid gap-3 md:grid-cols-2">
        {fields.map((field) => (
          <label key={field.id} className={`space-y-1 text-sm ${field.wide ? 'md:col-span-2' : ''}`}>
            <span className="font-medium">{field.label}</span>
            {field.type === 'select' ? (
              <select className={`${fieldClassName} bg-white dark:bg-slate-950`} value={form[field.id] ?? ''} onChange={(event) => setField(field.id, event.target.value)} required={field.required}>
                {field.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            ) : field.type === 'checkbox' ? (
              <label className="flex h-11 items-center gap-2 rounded-md border px-3 dark:border-slate-700">
                <input type="checkbox" checked={Boolean(form[field.id])} onChange={(event) => setField(field.id, event.target.checked)} />
                {field.checkLabel}
              </label>
            ) : (
              <input className={fieldClassName} type={field.type || 'text'} value={form[field.id] ?? ''} onChange={(event) => setField(field.id, event.target.value)} required={field.required} min={field.min} readOnly={field.readOnly} disabled={field.disabled} />
            )}
          </label>
        ))}
      </div>
      <div className="flex justify-end gap-2 border-t pt-4 dark:border-slate-800">
        <button type="button" onClick={onClose} className="h-10 rounded-md border px-4 text-sm dark:border-slate-700">Cancelar</button>
        <button type="submit" disabled={saving} className="h-10 rounded-md bg-slate-950 px-4 text-sm text-white dark:bg-white dark:text-slate-950">{saving ? 'Guardando...' : 'Guardar'}</button>
      </div>
    </form>
  );
};

export default SimpleFormContent;
