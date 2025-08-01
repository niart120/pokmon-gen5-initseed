import React from 'react';
import { useAppStore } from './store/app-store';
import { AppHeader, AppFooter, MainContent } from './components/layout';
import { initializeApplication } from './lib/initialization/app-initializer';
import { runDevelopmentVerification } from './lib/initialization/development-verification';
import { featureFlags } from './lib/core/feature-flags';

function App() {
  const { targetSeeds } = useAppStore();

  // Initialize application on mount (only once)
  React.useEffect(() => {
    const initializeApp = async () => {
      const initResult = await initializeApplication();
      
      // Run development verification (only in development)
      await runDevelopmentVerification(initResult);
    };

    initializeApp();
  }, []); // Empty dependency array - run only once
  
  // Development: Global access to feature flags
  React.useEffect(() => {
    if (import.meta.env.DEV) {
      (window as any).featureFlags = featureFlags;
    }
  }, []);

  return (
    <div className="h-screen bg-background flex flex-col">
      <AppHeader />
      <MainContent />
      <AppFooter />
    </div>
  );
}

export default App;