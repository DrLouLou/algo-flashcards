import { useState, useEffect } from 'react';
import { HiPlus, HiTrash, HiEye, HiEyeOff, HiDuplicate, HiCog } from 'react-icons/hi';
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
  
  // Enhanced field management
  const [newFieldName, setNewFieldName] = useState('');

  const [draggedOver, setDraggedOver] = useState(null);
  
  // Common field suggestions
  const fieldSuggestions = [
    'problem', 'solution', 'difficulty', 'category', 'hint', 'pseudo', 'complexity',
    'example', 'approach', 'timeComplexity', 'spaceComplexity', 'notes', 'tags'
  ];

  // Enhanced field management functions
  const addField = (fieldName) => {
    if (!fieldName.trim() || fieldsList.includes(fieldName.trim())) return;
    const newField = fieldName.trim();
    setFieldsList(prev => [...prev, newField]);
    setForm(f => ({ ...f, fields: f.fields ? `${f.fields},${newField}` : newField }));
    setLayout(l => ({ ...l, front: [...l.front, newField] })); // Add to front by default
    setNewFieldName('');
  };

  const removeField = (fieldName) => {
    setFieldsList(prev => prev.filter(f => f !== fieldName));
    setForm(f => ({ ...f, fields: f.fields.split(',').filter(x => x.trim() !== fieldName).join(',') }));
    setLayout(l => ({
      front: l.front.filter(f => f !== fieldName),
      back: l.back.filter(f => f !== fieldName),
      preview: l.preview.filter(f => f !== fieldName),
      hidden: l.hidden.filter(f => f !== fieldName)
    }));
    setPreviewFields(prev => prev.filter(f => f !== fieldName));
    setHiddenFields(prev => prev.filter(f => f !== fieldName));
  };

  // Enhanced drag handlers with visual feedback
  const handleDragStart = (field, from) => {
    setDragged({ field, from });
  };

  const handleDragOver = (e, section) => {
    e.preventDefault();
    setDraggedOver(section);
  };

  const handleDragLeave = () => {
    setDraggedOver(null);
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
    setDraggedOver(null);
  };

  // ...existing code...
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-sky-500 to-indigo-600 text-white px-8 py-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">{isEdit ? 'Edit Card Type' : 'Create New Card Type'}</h2>
            <p className="text-sky-100 mt-1">Design how your flashcards will look and function</p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-sky-100 transition-colors p-2 rounded-xl hover:bg-white/10"
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-8 max-h-[calc(90vh-120px)] overflow-y-auto">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Basic Information */}
            <div className="bg-gray-50 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <HiCog className="w-5 h-5 text-sky-600" />
                Basic Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    required
                    disabled={isEdit}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-base disabled:bg-gray-100 disabled:cursor-not-allowed transition-all"
                    placeholder="e.g., Algorithm Problems"
                  />
                  {isEdit && (
                    <p className="text-xs text-gray-500 mt-1">Name cannot be changed after creation</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <input
                    name="description"
                    value={form.description}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-base transition-all"
                    placeholder="Brief description of this card type"
                  />
                </div>
              </div>
            </div>

            {/* Enhanced Field Management */}
            <div className="bg-gray-50 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <HiPlus className="w-5 h-5 text-sky-600" />
                Card Fields
              </h3>
              
              {/* Field Suggestions */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quick Add Common Fields
                </label>
                <div className="flex flex-wrap gap-2">
                  {fieldSuggestions.filter(f => !fieldsList.includes(f)).map(field => (
                    <button
                      key={field}
                      type="button"
                      onClick={() => addField(field)}
                      className="px-3 py-1 bg-sky-100 text-sky-700 rounded-full text-sm hover:bg-sky-200 transition-colors"
                    >
                      + {field}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Field Input */}
              <div className="mb-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newFieldName}
                    onChange={(e) => setNewFieldName(e.target.value)}
                    placeholder="Enter custom field name..."
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-base"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addField(newFieldName);
                      }
                    }}
                    disabled={isEdit && !!editCardType.cardsExist}
                  />
                  <button
                    type="button"
                    onClick={() => addField(newFieldName)}
                    disabled={!newFieldName.trim() || fieldsList.includes(newFieldName.trim())}
                    className="px-4 py-2 bg-sky-600 text-white rounded-xl hover:bg-sky-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                  >
                    Add Field
                  </button>
                </div>
                {isEdit && !!editCardType.cardsExist && (
                  <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    Fields cannot be changed after cards have been created for this type
                  </p>
                )}
              </div>

              {/* Current Fields */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Current Fields ({fieldsList.length})
                </label>
                <div className="flex flex-wrap gap-2 min-h-[40px] p-3 border border-gray-200 rounded-xl bg-white">
                  {fieldsList.length === 0 ? (
                    <p className="text-gray-500 text-sm">No fields added yet. Add fields using the buttons above.</p>
                  ) : (
                    fieldsList.map(field => (
                      <div key={field} className="flex items-center gap-2 bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full">
                        <span className="text-sm font-medium">{field}</span>
                        <button
                          type="button"
                          onClick={() => removeField(field)}
                          className="text-indigo-500 hover:text-indigo-700 transition-colors"
                          disabled={isEdit && !!editCardType.cardsExist}
                        >
                          <HiTrash className="w-3 h-3" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Layout Designer */}
            {filteredFieldsList.length > 0 && (
              <div className="bg-gray-50 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <HiDuplicate className="w-5 h-5 text-sky-600" />
                  Card Layout Designer
                </h3>
                <p className="text-sm text-gray-600 mb-6">Drag fields between sections to design your card layout</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Front Section */}
                  <div
                    className={`border-2 border-dashed rounded-xl p-4 min-h-[120px] transition-all ${
                      draggedOver === 'front' ? 'border-sky-400 bg-sky-50' : 'border-gray-300 bg-white'
                    }`}
                    onDrop={() => handleDrop('front')}
                    onDragOver={(e) => handleDragOver(e, 'front')}
                    onDragLeave={handleDragLeave}
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="font-semibold text-gray-700">Front of Card</span>
                    </div>
                    <div className="space-y-2">
                      {filteredLayout.front.map(field => (
                        <div
                          key={field}
                          draggable
                          onDragStart={() => handleDragStart(field, 'front')}
                          className="bg-green-100 text-green-700 px-3 py-2 rounded-lg cursor-move hover:bg-green-200 transition-colors flex items-center justify-between"
                        >
                          <span className="font-medium">{field}</span>
                          <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 6L8.59 7.41 11.17 10l-2.58 2.59L10 14l4-4z"/>
                          </svg>
                        </div>
                      ))}
                      {filteredLayout.front.length === 0 && (
                        <p className="text-gray-500 text-sm text-center py-4">Drop fields here for the front of the card</p>
                      )}
                    </div>
                  </div>

                  {/* Back Section */}
                  <div
                    className={`border-2 border-dashed rounded-xl p-4 min-h-[120px] transition-all ${
                      draggedOver === 'back' ? 'border-sky-400 bg-sky-50' : 'border-gray-300 bg-white'
                    }`}
                    onDrop={() => handleDrop('back')}
                    onDragOver={(e) => handleDragOver(e, 'back')}
                    onDragLeave={handleDragLeave}
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <span className="font-semibold text-gray-700">Back of Card</span>
                    </div>
                    <div className="space-y-2">
                      {filteredLayout.back.map(field => (
                        <div
                          key={field}
                          draggable
                          onDragStart={() => handleDragStart(field, 'back')}
                          className="bg-blue-100 text-blue-700 px-3 py-2 rounded-lg cursor-move hover:bg-blue-200 transition-colors flex items-center justify-between"
                        >
                          <span className="font-medium">{field}</span>
                          <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 6L8.59 7.41 11.17 10l-2.58 2.59L10 14l4-4z"/>
                          </svg>
                        </div>
                      ))}
                      {filteredLayout.back.length === 0 && (
                        <p className="text-gray-500 text-sm text-center py-4">Drop fields here for the back of the card</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Preview Fields */}
            {filteredFieldsList.length > 0 && (
              <div className="bg-gray-50 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <HiEye className="w-5 h-5 text-sky-600" />
                  Deck Preview Fields <span className="text-red-500">*</span>
                </h3>
                <p className="text-sm text-gray-600 mb-4">Select at least one field to show in the deck overview</p>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {filteredFieldsList.map(field => (
                    <label key={field} className="flex items-center gap-2 bg-white px-4 py-3 rounded-lg border border-gray-200 hover:border-sky-300 cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        checked={filteredLayout.preview.includes(field)}
                        onChange={() => handlePreviewToggle(field)}
                        className="w-4 h-4 text-sky-600 border-gray-300 rounded focus:ring-sky-500"
                      />
                      <span className="text-sm font-medium text-gray-700">{field}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Hidden Fields */}
            {filteredFieldsList.length > 0 && (
              <div className="bg-gray-50 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <HiEyeOff className="w-5 h-5 text-sky-600" />
                  Hidden Fields
                </h3>
                <p className="text-sm text-gray-600 mb-4">These fields will be hidden by default and can be revealed in the card detail view</p>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {filteredFieldsList.map(field => (
                    <label key={field} className="flex items-center gap-2 bg-white px-4 py-3 rounded-lg border border-gray-200 hover:border-amber-300 cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        checked={filteredLayout.hidden.includes(field)}
                        onChange={() => handleHiddenToggle(field)}
                        className="w-4 h-4 text-amber-600 border-gray-300 rounded focus:ring-amber-500"
                      />
                      <span className="text-sm font-medium text-gray-700">{field}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between pt-6 border-t border-gray-200">
              <div className="flex-1">
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
                    {error}
                  </div>
                )}
                {success && (
                  <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl">
                    {success}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3 ml-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-3 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || fieldsList.length === 0}
                  className="px-8 py-3 bg-sky-600 text-white rounded-xl hover:bg-sky-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium shadow-lg hover:shadow-xl"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      {isEdit ? 'Saving...' : 'Creating...'}
                    </span>
                  ) : (
                    isEdit ? 'Save Changes' : 'Create Card Type'
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
