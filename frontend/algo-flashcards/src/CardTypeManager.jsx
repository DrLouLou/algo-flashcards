import { useState, useEffect } from 'react';
import fetchWithAuth from './api';

export default function CardTypeManager({ open, onClose, editCardType }) {
  // If editing, preload fields from editCardType
  const isEdit = !!editCardType;
  const [form, setForm] = useState({ name: '', description: '', fields: '' });
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [layout, setLayout] = useState({ front: [], back: [], preview: [], hidden: [] });
  const [fieldsList, setFieldsList] = useState([]);
  const [dragged, setDragged] = useState(null);
  const [previewFields, setPreviewFields] = useState([]);
  const [hiddenFields, setHiddenFields] = useState([]);
  const [loading, setLoading] = useState(false);

  // Preload for edit mode
  useEffect(() => {
    if (isEdit && editCardType) {
      setForm({
        name: editCardType.name || '',
        description: editCardType.description || '',
        fields: (editCardType.fields || []).join(',')
      });
      setFieldsList(editCardType.fields || []);
      setLayout({
        front: (editCardType.layout?.front || []),
        back: (editCardType.layout?.back || []),
        preview: (editCardType.layout?.preview || []),
        hidden: (editCardType.layout?.hidden || []),
      });
      setPreviewFields(editCardType.layout?.preview || []);
      setHiddenFields(editCardType.layout?.hidden || []);
    } else if (!open) {
      // Reset when closed
      setForm({ name: '', description: '', fields: '' });
      setFieldsList([]);
      setLayout({ front: [], back: [], preview: [], hidden: [] });
      setPreviewFields([]);
      setHiddenFields([]);
      setError(null);
      setSuccess(null);
    }
  }, [isEdit, editCardType, open]);

  useEffect(() => {
    if (success && isEdit && editCardType) {
      // After edit, fetch the updated card type and pass to onClose
      fetchWithAuth(`${import.meta.env.VITE_API_BASE_URL}/cardtypes/${editCardType.id}/`)
        .then(r => r.json())
        .then(updated => {
          setSuccess(null);
          setForm({ name: '', description: '', fields: '' });
          setError(null);
          setLayout({ front: [], back: [], preview: [], hidden: [] });
          setFieldsList([]);
          setPreviewFields([]);
          setHiddenFields([]);
          onClose && onClose(updated);
        });
      return;
    }
    if (success) {
      const timer = setTimeout(() => {
        setSuccess(null);
        setForm({ name: '', description: '', fields: '' });
        setError(null);
        setLayout({ front: [], back: [], preview: [], hidden: [] });
        setFieldsList([]);
        setPreviewFields([]);
        setHiddenFields([]);
        onClose && onClose();
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [success, onClose, isEdit, editCardType]);

  useEffect(() => {
    // Update fieldsList and reset layout when fields change
    const list = form.fields.split(',').map(f => f.trim()).filter(Boolean);
    setFieldsList(list);
    // Only update layout from fields if not editing an existing card type
    if (!isEdit || !editCardType) {
      setLayout(l => {
        // Remove fields not in list
        const front = l.front.filter(f => list.includes(f));
        const back = l.back.filter(f => list.includes(f));
        // Add new fields to front by default
        const assigned = new Set([...front, ...back]);
        const unassigned = list.filter(f => !assigned.has(f));
        return {
          ...l,
          front: [...front, ...unassigned],
          back,
          preview: l.preview ? l.preview.filter(f => list.includes(f)) : [],
          hidden: l.hidden ? l.hidden.filter(f => list.includes(f)) : [],
        };
      });
      setPreviewFields(prev => prev.filter(f => list.includes(f)));
      setHiddenFields(prev => prev.filter(f => list.includes(f)));
    }
  }, [form.fields, isEdit, editCardType]);

  // Prevent 'tags' from being added as a field in new or edited card types
  useEffect(() => {
    // Remove 'tags' from fieldsList and form.fields if present
    setFieldsList(list => list.filter(f => f.toLowerCase() !== 'tags'));
    setForm(f => ({ ...f, fields: f.fields.split(',').map(x => x.trim()).filter(x => x.toLowerCase() !== 'tags').join(',') }));
  }, [form.fields]);

  if (!open) return null;

  const handleChange = e => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  };

  // Drag and drop handlers
  const handleDragStart = (field, from) => {
    setDragged({ field, from });
  };
  const handleDrop = (to) => {
    if (!dragged) return;
    setLayout(l => {
      const fromList = [...l[dragged.from]].filter(f => f !== dragged.field);
      const toList = l[to].includes(dragged.field) ? [...l[to]] : [...l[to], dragged.field];
      return {
        ...l,
        [dragged.from]: fromList,
        [to]: toList,
      };
    });
    setDragged(null);
  };
  const handleDragOver = e => e.preventDefault();

  const handlePreviewToggle = (field) => {
    setPreviewFields(prev => prev.includes(field) ? prev.filter(f => f !== field) : [...prev, field]);
  };

  const handleHiddenToggle = (field) => {
    setHiddenFields(prev => prev.includes(field) ? prev.filter(f => f !== field) : [...prev, field]);
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    const fieldsList = form.fields.split(',').map(f => f.trim()).filter(Boolean);
    if (!form.name.trim() || fieldsList.length === 0) {
      setError('Name and at least one field are required.');
      setLoading(false);
      return;
    }
    // Warn if duplicate field names (case-insensitive)
    const lowerFields = fieldsList.map(f => f.toLowerCase());
    if (new Set(lowerFields).size !== lowerFields.length) {
      setError('Field names must be unique.');
      setLoading(false);
      return;
    }
    // Layout must cover all fields (front, back, or hidden)
    const allLayoutFields = [...layout.front, ...layout.back, ...hiddenFields];
    if (fieldsList.some(f => !allLayoutFields.includes(f))) {
      setError('All fields must be assigned to front, back, or hidden.');
      setLoading(false);
      return;
    }
    // At least one preview field
    if (previewFields.length === 0) {
      setError('Select at least one field for deck preview.');
      setLoading(false);
      return;
    }
    try {
      let res;
      if (isEdit && editCardType) {
        // PATCH update
        res = await fetchWithAuth(`${import.meta.env.VITE_API_BASE_URL}/cardtypes/${editCardType.id}/`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: form.name.trim(),
            description: form.description.trim(),
            fields: fieldsList,
            layout: { ...layout, preview: previewFields, hidden: hiddenFields },
          }),
        });
      } else {
        // POST create
        res = await fetchWithAuth(`${import.meta.env.VITE_API_BASE_URL}/cardtypes/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: form.name.trim(),
            description: form.description.trim(),
            fields: fieldsList,
            layout: { ...layout, preview: previewFields, hidden: hiddenFields },
          }),
        });
      }
      if (!res.ok) {
        let errMsg = isEdit ? 'Could not update card type' : 'Could not create card type';
        try {
          const errJson = await res.json();
          if (errJson && (errJson.name || errJson.fields)) {
            errMsg = (Array.isArray(errJson.name) ? errJson.name[0] : errJson.name) || (Array.isArray(errJson.fields) ? errJson.fields[0] : errJson.fields) || errMsg;
          } else if (typeof errJson === 'string') {
            errMsg = errJson;
          }
        } catch { /* ignore */ }
        setError(errMsg);
        setLoading(false);
        return;
      }
      setSuccess(isEdit ? 'Card type updated!' : 'Card type created!');
    } catch {
      setError(isEdit ? 'Could not update card type' : 'Could not create card type');
    } finally {
      setLoading(false);
    }
  };

  // In all field lists for layout, preview, hidden, filter out 'tags'
  const filteredFieldsList = fieldsList.filter(f => f.toLowerCase() !== 'tags');
  const filteredLayout = {
    front: layout.front.filter(f => f.toLowerCase() !== 'tags'),
    back: layout.back.filter(f => f.toLowerCase() !== 'tags'),
    preview: previewFields.filter(f => f.toLowerCase() !== 'tags'),
    hidden: hiddenFields.filter(f => f.toLowerCase() !== 'tags'),
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full relative">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 text-xl"
          aria-label="Close"
        >×</button>
        <h2 className="text-2xl font-semibold mb-4">{isEdit ? 'Edit Card Type' : 'Create Card Type'}</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <label className="block">
            Name <span className="text-red-500">*</span>
            <input name="name" value={form.name} onChange={handleChange} required className="w-full border rounded px-2 py-1 mt-1" disabled={isEdit} />
          </label>
          <label className="block">
            Description
            <input name="description" value={form.description} onChange={handleChange} className="w-full border rounded px-2 py-1 mt-1" />
          </label>
          <label className="block">
            Fields (comma-separated) <span className="text-red-500">*</span>
            <input name="fields" value={form.fields} onChange={handleChange} placeholder="problem,difficulty,solution" required className="w-full border rounded px-2 py-1 mt-1" disabled={isEdit && !!editCardType.cardsExist} />
            {isEdit && !!editCardType.cardsExist && (
              <div className="text-xs text-yellow-600 mt-1">Fields cannot be changed after cards have been created for this type.</div>
            )}
          </label>
          {/* Layout editor */}
          {filteredFieldsList.length > 0 && (
            <>
              <div className="my-4">
                <div className="flex gap-4">
                  <div
                    className="flex-1 border rounded p-2 min-h-[80px] bg-gray-50"
                    onDrop={() => handleDrop('front')}
                    onDragOver={handleDragOver}
                  >
                    <div className="font-semibold mb-1">Front of Card</div>
                    {filteredLayout.front.map(f => (
                      <div
                        key={f}
                        draggable
                        onDragStart={() => handleDragStart(f, 'front')}
                        className="bg-indigo-100 text-indigo-700 px-2 py-1 rounded mb-1 cursor-move"
                      >
                        {f}
                      </div>
                    ))}
                  </div>
                  <div
                    className="flex-1 border rounded p-2 min-h-[80px] bg-gray-50"
                    onDrop={() => handleDrop('back')}
                    onDragOver={handleDragOver}
                  >
                    <div className="font-semibold mb-1">Back of Card</div>
                    {filteredLayout.back.map(f => (
                      <div
                        key={f}
                        draggable
                        onDragStart={() => handleDragStart(f, 'back')}
                        className="bg-indigo-100 text-indigo-700 px-2 py-1 rounded mb-1 cursor-move"
                      >
                        {f}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="text-xs text-gray-500 mt-2">Drag fields to arrange which appear on the front or back of the card.</div>
              </div>
              {/* Deck preview field selector */}
              <div className="my-4">
                <div className="font-semibold mb-1 flex items-center gap-1">
                  Deck Preview Fields <span className="text-red-500">*</span>
                  <span className="ml-1 text-xs text-gray-500">(shown in deck overview)</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {filteredFieldsList.map(f => (
                    <label key={f} className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filteredLayout.preview.includes(f)}
                        onChange={() => handlePreviewToggle(f)}
                        required={filteredLayout.preview.length === 0} // Only require if none selected
                      />
                      <span>{f}</span>
                    </label>
                  ))}
                </div>
                <div className="text-xs text-gray-500 mt-2">Select <span className="font-semibold">at least one</span> field to show for each card in the deck overview. These fields will be visible in the card preview grid.</div>
              </div>
              {/* Hidden fields selector */}
              {filteredFieldsList.length > 0 && (
                <div className="my-4">
                  <div className="font-semibold mb-1">Hidden Fields</div>
                  <div className="flex flex-wrap gap-2">
                    {filteredFieldsList.map(f => (
                      <label key={f} className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded cursor-pointer">
                        <input
                          type="checkbox"
                          checked={filteredLayout.hidden.includes(f)}
                          onChange={() => handleHiddenToggle(f)}
                        />
                        <span>{f}</span>
                      </label>
                    ))}
                  </div>
                  <div className="text-xs text-gray-500 mt-2">Hidden fields will not be shown by default and can be revealed in the card detail view.</div>
                </div>
              )}
            </>
          )}
          <button type="submit" className="rounded bg-green-600 text-white px-4 py-2 mt-2" disabled={loading}>{loading ? (isEdit ? 'Saving...' : 'Creating...') : (isEdit ? 'Save Changes' : 'Create')}</button>
          {error && <div className="text-red-600 mt-2 bg-red-50 px-2 py-1 rounded">{error}</div>}
          {success && <div className="text-green-600 mt-2 bg-green-50 px-2 py-1 rounded">{success}</div>}
        </form>
      </div>
    </div>
  );
}
