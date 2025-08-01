import { createRoot } from 'react-dom/client'
import { ErrorBoundary } from "react-error-boundary";

import App from './App.tsx'
import { ErrorFallback } from './ErrorFallback.tsx'

import "./main.css"
import "./styles/theme.css"
import "./index.css"

// 一時的にコンソールエラーを制限（Maximum update depth exceeded対策）
if (process.env.NODE_ENV === 'development') {
  const originalError = console.error;
  let errorCount = 0;
  console.error = (...args) => {
    const message = args.join(' ');
    if (message.includes('Maximum update depth exceeded')) {
      if (errorCount < 3) { // 最初の3回だけ表示
        originalError.apply(console, ['⚠️ [LIMITED] ' + message]);
        errorCount++;
      }
      return;
    }
    originalError.apply(console, args);
  };
}

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary FallbackComponent={ErrorFallback}>
    <App />
   </ErrorBoundary>
)
