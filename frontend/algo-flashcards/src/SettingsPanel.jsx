import React from 'react';
import { useSettings } from './SettingsContext';

export default function SettingsPanel() {
  const { settings, setSettings } = useSettings();

  return (
    <div className="settings-panel p-6 bg-white rounded-lg shadow max-w-md mx-auto mt-8">
      <h2 className="text-xl font-bold mb-4">Settings</h2>
      <div className="mb-4">
        <label className="block mb-1 font-medium">Theme</label>
        <select
          value={settings.theme}
          onChange={e => setSettings(s => ({ ...s, theme: e.target.value }))}
          className="w-full border rounded p-2"
        >
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
      </div>
      <div className="mb-4">
        <label className="block mb-1 font-medium">Font Size</label>
        <input
          type="range"
          min={14}
          max={32}
          value={settings.fontSize}
          onChange={e => setSettings(s => ({ ...s, fontSize: Number(e.target.value) }))}
          className="w-full"
        />
        <div className="text-sm mt-1">{settings.fontSize}px</div>
      </div>
      <div className="mb-4">
        <label className="block mb-1 font-medium">Card Flip Animation</label>
        <input
          type="checkbox"
          checked={settings.animation}
          onChange={e => setSettings(s => ({ ...s, animation: e.target.checked }))}
        /> Enable animation
      </div>
    </div>
  );
}
