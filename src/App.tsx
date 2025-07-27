import React from 'react';
import { useAppStore } from './store/app-store';
import { AppHeader, AppFooter, MainContent } from './components/layout';
import { initializeApplication } from './lib/initialization/app-initializer';
import { runDevelopmentVerification } from './lib/initialization/development-verification';

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

  // Debug: Show target seeds when they change (separate effect)
  React.useEffect(() => {
    console.log('📋 Target seeds loaded:', targetSeeds.seeds.map(s => '0x' + s.toString(16).padStart(8, '0')));
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