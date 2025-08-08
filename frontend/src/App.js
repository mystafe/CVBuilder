import React from 'react';
import ThemeSwitcher from './components/ThemeSwitcher';
import LanguageSwitcher from './components/LanguageSwitcher';
import CVBuilder from './components/CVBuilder';
import ErrorBoundary from './components/ErrorBoundary';
import ErrorScreen from './components/ErrorScreen';
import { useTheme } from './hooks/useTheme';

function App() {
  const [theme, setTheme] = useTheme();

  return (
    <ErrorBoundary fallback={<ErrorScreen />}>
      <div className="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
        <div className="flex justify-end space-x-2 p-4">
          <LanguageSwitcher />
          <ThemeSwitcher theme={theme} setTheme={setTheme} />
        </div>
        <CVBuilder />
      </div>
    </ErrorBoundary>
  );
}

export default App;
