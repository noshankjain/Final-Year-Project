import React from 'react';

const ClinicalForm = ({ values, onChange }) => {
  
  const handleChange = (field) => (e) => {
    const type = e.target.type;
    let val = e.target.value;
    if (type === 'checkbox') {
      val = e.target.checked;
    } else if (type === 'number' || type === 'range') {
      val = Number(val);
    }
    onChange(field, val);
  };

  const Switch = ({ label, field, checked }) => (
    <div className="flex items-center justify-between p-4 surface rounded-xl">
      <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{label}</span>
      <label className="relative inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          className="sr-only peer"
          checked={checked || false}
          onChange={handleChange(field)}
        />
        <div
          className="w-11 h-6 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all"
          style={{
            background: checked ? 'var(--accent)' : 'var(--surface-overlay)',
            transition: 'background 0.2s ease',
          }}
        />
      </label>
    </div>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      
      <div className="space-y-2">
        <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Patient Age</label>
        <input 
          type="number" 
          className="input-field" 
          placeholder="e.g. 45" 
          value={values.age || ''} 
          onChange={handleChange('age')}
          min="0" max="120"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Tumor Size (mm)</label>
        <input 
          type="number" 
          className="input-field" 
          placeholder="e.g. 24.5" 
          value={values.tumor_size || ''} 
          onChange={handleChange('tumor_size')}
          step="0.1" min="0"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Positive Lymph Nodes</label>
        <input 
          type="number" 
          className="input-field" 
          placeholder="e.g. 2" 
          value={values.lymph_nodes || ''} 
          onChange={handleChange('lymph_nodes')}
          min="0"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Histological Grade</label>
        <select 
          className="input-field appearance-none" 
          value={values.grade || ''} 
          onChange={handleChange('grade')}
        >
          <option value="" disabled>Select Grade</option>
          <option value="1">Grade 1 (Well differentiated)</option>
          <option value="2">Grade 2 (Moderately differentiated)</option>
          <option value="3">Grade 3 (Poorly differentiated)</option>
        </select>
      </div>

      <div className="space-y-2 md:col-span-2">
        <div className="flex justify-between">
          <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Ki-67 Proliferation Index</label>
          <span className="text-sm font-bold font-mono" style={{ color: 'var(--accent)' }}>{values.ki67 || 0}%</span>
        </div>
        <input 
          type="range" 
          className="w-full h-2 rounded-lg appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, var(--accent) ${values.ki67 || 0}%, var(--surface-overlay) ${values.ki67 || 0}%)`,
            accentColor: 'var(--accent)',
          }}
          value={values.ki67 || 0} 
          onChange={handleChange('ki67')}
          min="0" max="100"
        />
      </div>

      <Switch label="ER Status (Estrogen Receptor)" field="er_status" checked={values.er_status} />
      <Switch label="PR Status (Progesterone Receptor)" field="pr_status" checked={values.pr_status} />
      <Switch label="HER2 Status" field="her2_status" checked={values.her2_status} />
      
      <Switch label="TP53 Mutation Detected" field="tp53_mutation" checked={values.tp53_mutation} />
      <Switch label="BRCA1 Mutation Detected" field="brca1_mutation" checked={values.brca1_mutation} />

    </div>
  );
};

export default ClinicalForm;
