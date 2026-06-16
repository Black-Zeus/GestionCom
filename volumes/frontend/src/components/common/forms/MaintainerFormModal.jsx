/* eslint-disable react/prop-types */
import { useState } from 'react';
import AutocompleteSelect from '@/components/common/forms/AutocompleteSelect';
import { formatPhone, normalizePhoneForStorage, validatePhoneMessage } from '@/utils/phone';
import { formatRut, normalizeRutForStorage, validateRutMessage } from '@/utils/rut';

const inputCls = 'h-11 w-full rounded-md border border-slate-300 px-3 text-sm placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100 disabled:text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:disabled:bg-slate-900 dark:focus:border-blue-500 dark:focus:ring-blue-950';
const selectCls = `${inputCls} bg-white dark:bg-slate-950`;
const textareaCls = 'min-h-24 w-full resize-y rounded-md border border-slate-300 px-3 py-2 text-sm placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100 disabled:text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:disabled:bg-slate-900 dark:focus:border-blue-500 dark:focus:ring-blue-950';

const errCls = (has) => (has ? 'border-red-300 focus:border-red-400 focus:ring-red-100 dark:border-red-700 dark:focus:border-red-500 dark:focus:ring-red-950' : '');

const spanCls = (field, cols = 2) => {
  if (field.span === 'full' || field.wide) return cols === 3 ? 'md:col-span-2 xl:col-span-3' : 'md:col-span-2';
  if (field.span === 2) return 'md:col-span-2';
  return '';
};

const gridCls = { 2: 'md:grid-cols-2', 3: 'md:grid-cols-2 xl:grid-cols-3' };

const groupSections = (fields) => {
  if (!fields.some((f) => f.type === 'section')) {
    return [{ id: '__default', fields: fields.filter((f) => f.type !== 'section') }];
  }
  const groups = [];
  let cur = null;
  fields.forEach((f) => {
    if (f.type === 'section') { cur = { ...f, fields: [] }; groups.push(cur); return; }
    if (!cur) { cur = { id: '__default', fields: [] }; groups.push(cur); }
    cur.fields.push(f);
  });
  return groups;
};

const MaintainerFormModal = ({
  fields = [],
  initialValues = {},
  onSubmit,
  onClose,
  submitLabel = 'Guardar',
  savingLabel = 'Guardando...',
  footerNote = null,
}) => {
  const [form, setFormState] = useState(() => {
    const base = { ...initialValues };
    fields.forEach((f) => {
      if (!f.id || f.type === 'section' || f.type === 'custom') return;
      if (f.validation === 'rut' && base[f.id]) base[f.id] = formatRut(base[f.id]);
      if (f.validation === 'phone' && base[f.id]) base[f.id] = formatPhone(base[f.id]);
    });
    return base;
  });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const setField = (id, value) => {
    setFormState((s) => ({ ...s, [id]: value }));
    if (errors[id]) setErrors((s) => { const n = { ...s }; delete n[id]; return n; });
  };

  const validate = (values) => {
    const errs = {};
    fields.forEach((f) => {
      if (!f.id || f.type === 'section' || f.type === 'custom' || f.disabled || f.readOnly) return;
      const val = values[f.id];
      if (f.required && (val === undefined || val === null || val === '' || (Array.isArray(val) && !val.length))) {
        errs[f.id] = `${f.label} es requerido.`;
        return;
      }
      if (f.validation === 'rut' && val) { const e = validateRutMessage(val); if (e) errs[f.id] = e; }
      if (f.validation === 'phone' && val) { const e = validatePhoneMessage(val); if (e) errs[f.id] = e; }
    });
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    const displayed = { ...form };
    fields.forEach((f) => {
      if (!f.id || !displayed[f.id]) return;
      if (f.validation === 'rut') displayed[f.id] = formatRut(displayed[f.id]);
      if (f.validation === 'phone') displayed[f.id] = formatPhone(displayed[f.id]);
    });
    setFormState(displayed);
    if (!validate(displayed)) { setFormError('Revisa los campos marcados antes de guardar.'); return; }
    const payload = { ...displayed };
    fields.forEach((f) => {
      if (!f.id || !payload[f.id]) return;
      if (f.validation === 'rut') payload[f.id] = normalizeRutForStorage(payload[f.id]);
      if (f.validation === 'phone') payload[f.id] = normalizePhoneForStorage(payload[f.id]);
    });
    setSaving(true);
    try {
      await onSubmit(payload);
      onClose?.();
    } catch (err) {
      setFormError(err?.message || 'No fue posible guardar los cambios.');
    } finally {
      setSaving(false);
    }
  };

  const renderField = (field, cols = 2) => {
    const hasError = Boolean(errors[field.id]);
    const LeadingIcon = field.leadingIcon;
    const selectedOption = field.type === 'select'
      ? (field.options || []).find((o) => String(o.value) === String(form[field.id] ?? ''))
      : null;

    return (
      <div key={field.id} className={`space-y-1.5 text-sm ${spanCls(field, cols)}`}>
        {field.type !== 'checkbox' && !field.collapseLabel && (
          <span className="font-medium text-slate-800 dark:text-slate-100">{field.label}</span>
        )}
        {field.type === 'select' ? (
          <>
            <select
              className={`${selectCls} ${errCls(hasError)}`}
              value={form[field.id] ?? ''}
              onChange={(e) => setField(field.id, e.target.value)}
              required={field.required}
              disabled={field.disabled}
            >
              <option value="">{field.emptyLabel || (field.required ? 'Seleccione una opcion' : 'Sin seleccion')}</option>
              {(field.options || []).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            {field.showOptionDescription !== false && selectedOption?.description && (
              <span className="block rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-xs leading-5 text-blue-800 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-200">
                {selectedOption.description}
              </span>
            )}
          </>
        ) : field.type === 'autocomplete' ? (
          <AutocompleteSelect
            value={form[field.id] ?? ''}
            onChange={(val) => setField(field.id, val)}
            options={field.options || []}
            placeholder={field.placeholder || 'Seleccionar'}
            searchPlaceholder={field.searchPlaceholder || 'Buscar opcion'}
            clearable={field.clearable}
            showIcons={field.showIcons}
            multiple={field.multiple}
            maxVisibleTags={field.maxVisibleTags}
            disabled={field.disabled}
          />
        ) : field.type === 'checkbox' ? (
          <label className={`flex min-h-11 items-start gap-3 rounded-md border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950 ${field.disabled ? 'opacity-70' : ''}`}>
            <input
              type="checkbox"
              checked={Boolean(form[field.id])}
              onChange={(e) => setField(field.id, e.target.checked)}
              disabled={field.disabled}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 disabled:cursor-not-allowed"
            />
            <span className="text-sm text-slate-700 dark:text-slate-200">
              <span className="block font-medium">{field.checkLabel}</span>
              {field.help && <span className="mt-0.5 block text-xs font-normal text-slate-500 dark:text-slate-400">{field.help}</span>}
            </span>
          </label>
        ) : field.type === 'textarea' ? (
          <textarea
            className={`${textareaCls} ${errCls(hasError)}`}
            value={form[field.id] ?? ''}
            onChange={(e) => setField(field.id, e.target.value)}
            required={field.required}
            placeholder={field.placeholder}
            readOnly={field.readOnly}
            disabled={field.disabled}
            rows={field.rows || 3}
          />
        ) : field.type === 'custom' && field.render ? (
          field.render({ form, setField, field })
        ) : (
          <div className="relative">
            {LeadingIcon && <LeadingIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />}
            {field.prefix && !LeadingIcon && <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-500">{field.prefix}</span>}
            {field.suffix && <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-500">{field.suffix}</span>}
            <input
              className={`${inputCls} ${errCls(hasError)} ${LeadingIcon || field.prefix ? 'pl-10' : ''} ${field.suffix ? 'pr-9' : ''} ${field.mono ? 'font-mono' : ''}`}
              type={field.type || 'text'}
              value={form[field.id] ?? ''}
              onChange={(e) => setField(field.id, e.target.value)}
              onBlur={() => {
                if (!form[field.id]) return;
                if (field.validation === 'rut') {
                  const v = formatRut(form[field.id]);
                  setField(field.id, v);
                  const err = validateRutMessage(v);
                  if (err) setErrors((s) => ({ ...s, [field.id]: err }));
                }
                if (field.validation === 'phone') {
                  const v = formatPhone(form[field.id]);
                  setField(field.id, v);
                  const err = validatePhoneMessage(v);
                  if (err) setErrors((s) => ({ ...s, [field.id]: err }));
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
        {field.help && field.type !== 'checkbox' && <span className="block text-xs text-slate-500 dark:text-slate-400">{field.help}</span>}
      </div>
    );
  };

  const sections = groupSections(fields);
  const hasSections = fields.some((f) => f.type === 'section');

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className={hasSections ? 'space-y-4' : ''}>
        {sections.map((section) => {
          const Icon = section.icon;
          const cols = section.columns || 2;
          return (
            <div key={section.id} className="rounded-md border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
              {hasSections && section.id !== '__default' && (
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
              )}
              <div className={`grid gap-x-3 gap-y-4 ${gridCls[cols] || gridCls[2]}`}>
                {section.fields.map((field) => renderField(field, cols))}
              </div>
            </div>
          );
        })}
      </div>

      {formError && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {formError}
        </div>
      )}

      <div className={`flex items-center gap-4 border-t border-slate-200 pt-4 dark:border-slate-800 ${footerNote ? 'justify-between' : 'justify-end'}`}>
        {footerNote && (
          <div className="min-w-0 flex-1 text-sm text-slate-500 dark:text-slate-400">
            {footerNote(form)}
          </div>
        )}
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-md border border-slate-200 px-4 text-sm font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="h-10 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
          >
            {saving ? savingLabel : submitLabel}
          </button>
        </div>
      </div>
    </form>
  );
};

export default MaintainerFormModal;
