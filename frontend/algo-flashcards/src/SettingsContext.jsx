import React, { createContext, useContext, useState, useEffect } from 'react';

const defaultSettings = {
  theme: 'light', // or 'dark'
  fontSize: 18,
  animation: true,
};

const SettingsContext = createContext({
  settings: defaultSettings,
  setSettings: () => {},
});

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('userSettings');
    return saved ? JSON.parse(saved) : defaultSettings;
  });

  useEffect(() => {
    localStorage.setItem('userSettings', JSON.stringify(settings));
  }, [settings]);

  return (
    <SettingsContext.Provider value={{ settings, setSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
