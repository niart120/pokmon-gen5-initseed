import { useSyncExternalStore, useMemo, useCallback, useRef } from 'react';

const MOBILE_BREAKPOINT = 768;

/**
 * モバイル検出フック
 * MediaQuery API を使用してモバイルデバイスを検出
 */
export function useIsMobile() {
  return useSyncExternalStore(
    // subscribe: MediaQueryの変更を監視
    (callback) => {
      const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
      mql.addEventListener('change', callback);
      return () => mql.removeEventListener('change', callback);
    },
    // getSnapshot: 現在のモバイル状態を取得
    () => window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`).matches,
    // getServerSnapshot: SSR用の初期値
    () => false
  );
}

/**
 * レスポンシブレイアウト検出フック
 * ウィンドウサイズに応じてスタックレイアウトとUIスケールを決定
 */
export function useResponsiveLayout() {
  // RAF（RequestAnimationFrame）ベースのスロットリング
  const rafIdRef = useRef<number | undefined>(undefined);
  
  // subscribe関数を安定化
  const subscribe = useCallback((callback: () => void) => {
    const handleResize = () => {
      // RAF で次のフレームまで遅延させてパフォーマンス最適化
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
      
      rafIdRef.current = requestAnimationFrame(() => {
        callback();
      });
    };
    
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);
  
  // getSnapshot関数を安定化 - パフォーマンスを考慮した実装
  const getSnapshot = useCallback(() => {
    // DOM読み取りは必要最小限に
    const currentWidth = typeof window !== 'undefined' ? window.innerWidth : 1920;
    const currentHeight = typeof window !== 'undefined' ? window.innerHeight : 1080;
    
    // 細かいサイズ変更を無視してパフォーマンス向上（10px単位で丸める）
    const roundedWidth = Math.round(currentWidth / 10) * 10;
    const roundedHeight = Math.round(currentHeight / 10) * 10;
    
    return `${roundedWidth}x${roundedHeight}`;
  }, []);
  
  // SSR用スナップショット
  const getServerSnapshot = useCallback(() => "1920x1080", []);

  // ウィンドウサイズの監視
  const sizeString = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // レスポンシブ状態の計算（メモ化で重複計算防止）
  return useMemo(() => {
    const [widthStr, heightStr] = sizeString.split('x');
    const width = parseInt(widthStr, 10);
    const height = parseInt(heightStr, 10);
    
    // スタックレイアウト判定
    const isStack = width < MOBILE_BREAKPOINT || (height > width && width < 1024);
    
    // UIスケール計算
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
    
    return { isStack, uiScale };
  }, [sizeString]);
}

// 後方互換性のためのエイリアス
export const useIsStackLayout = useResponsiveLayout;
