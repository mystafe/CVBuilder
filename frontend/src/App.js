import React, { useState, useEffect } from 'react';
import MultiStepForm from './components/MultiStepForm';
import ThemeSwitcher from './components/ThemeSwitcher';
import LanguageSwitcher from './components/LanguageSwitcher';

function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <div className="flex justify-end space-x-2 p-4">
        <LanguageSwitcher />
        <ThemeSwitcher theme={theme} setTheme={setTheme} />
      </div>
      <MultiStepForm />
    </div>
  );
}

export default App;
