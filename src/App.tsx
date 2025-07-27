import React from 'react';
import { useAppStore } from './store/app-store';
import { AppHeader, AppFooter, MainContent } from './components/layout';
import { initializeApplication } from './lib/initialization/app-initializer';
import { runDevelopmentVerification } from './lib/initialization/development-verification';

function App() {
  const { targetSeeds } = useAppStore();

  // Initialize application on mount
  React.useEffect(() => {
    const initializeApp = async () => {
      const initResult = await initializeApplication();
      
      // Run development verification (only in development)
      await runDevelopmentVerification(initResult);

      // Debug: Show target seeds on load
      console.log('📋 Target seeds loaded:', targetSeeds.seeds.map(s => '0x' + s.toString(16).padStart(8, '0')));
    };

    initializeApp();
  }, [targetSeeds.seeds]);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <MainContent />
      <AppFooter />
    </div>
  );
}

export default App;