import { useState, useLayoutEffect } from 'react';

const MOBILE_BREAKPOINT = 768;

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState<boolean | undefined>(undefined);

  useLayoutEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    mql.addEventListener("change", onChange);
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isMobile;
}

export function useIsStackLayout() {
  console.log('🚀 useIsStackLayout Hook called - NEW IMPLEMENTATION');
  
  const [dimensions, setDimensions] = useState<{isStack: boolean; uiScale: number}>(() => {
    if (typeof window === 'undefined') {
      console.log('⚠️ SSR mode detected');
      return { isStack: false, uiScale: 1 };
    }
    
    const width = window.innerWidth;
    const height = window.innerHeight;
    const isStack = width < MOBILE_BREAKPOINT || (height > width && width < 1024);
    
    let uiScale = 1.0;
    if (width <= 1366) {
      uiScale = 0.85;
    } else if (width <= 1920) {
      uiScale = 1.0;
    } else if (width <= 2048) {
      uiScale = 1.1;
    } else if (width <= 2560) {
      uiScale = 1.33;
    } else if (width <= 3840) {
      uiScale = 1.5;
    } else {
      uiScale = Math.min(2.0, width / 1920);
    }
    
    console.log('🎯 Initial calculation:', { width, height, isStack, uiScale });
    return { isStack, uiScale };
  });
  
  useLayoutEffect(() => {
    console.log('📱 useLayoutEffect started');
    
    function updateDimensions() {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const isStack = width < MOBILE_BREAKPOINT || (height > width && width < 1024);
      
      let uiScale = 1.0;
      if (width <= 1366) {
        uiScale = 0.85;
      } else if (width <= 1920) {
        uiScale = 1.0;
      } else if (width <= 2048) {
        uiScale = 1.1;
      } else if (width <= 2560) {
        uiScale = 1.33;
      } else if (width <= 3840) {
        uiScale = 1.5;
      } else {
        uiScale = Math.min(2.0, width / 1920);
      }
      
      console.log('📱 Update:', { width, height, isStack, uiScale });
      setDimensions({ isStack, uiScale });
    }
    
    window.addEventListener('resize', updateDimensions);
    window.addEventListener('orientationchange', updateDimensions);
    updateDimensions();
    
    return () => {
      window.removeEventListener('resize', updateDimensions);
      window.removeEventListener('orientationchange', updateDimensions);
    };
  }, []);
  
  console.log('🎁 Hook returning:', dimensions);
  return dimensions;
}
