/**
 * Wake Lock API utilities for preventing screen sleep on mobile devices
 * Particularly useful during long-running search operations
 */

let wakeLockSentinel: WakeLockSentinel | null = null;

/**
 * Check if Wake Lock API is supported in the current browser
 */
export function isWakeLockSupported(): boolean {
  return 'wakeLock' in navigator;
}

/**
 * Request a wake lock to prevent screen from sleeping
 * @returns Promise that resolves to true if successful, false otherwise
 */
export async function requestWakeLock(): Promise<boolean> {
  if (!isWakeLockSupported()) {
    console.warn('Wake Lock API is not supported in this browser');
    return false;
  }

  try {
    wakeLockSentinel = await navigator.wakeLock!.request('screen');
    
    // Listen for wake lock release (e.g., when tab becomes hidden)
    wakeLockSentinel.addEventListener('release', () => {
      console.log('Wake lock was released');
      wakeLockSentinel = null;
    });

    console.log('Wake lock acquired - screen will stay on');
    return true;
  } catch (error) {
    console.error('Failed to acquire wake lock:', error);
    return false;
  }
}

/**
 * Release the current wake lock if active
 * @returns Promise that resolves to true if successfully released or no lock was active
 */
export async function releaseWakeLock(): Promise<boolean> {
  if (!wakeLockSentinel || wakeLockSentinel.released) {
    return true;
  }

  try {
    await wakeLockSentinel.release();
    wakeLockSentinel = null;
    console.log('Wake lock released - screen can sleep normally');
    return true;
  } catch (error) {
    console.error('Failed to release wake lock:', error);
    return false;
  }
}

/**
 * Get the current wake lock status
 */
export function getWakeLockStatus(): {
  isSupported: boolean;
  isActive: boolean;
} {
  return {
    isSupported: isWakeLockSupported(),
    isActive: wakeLockSentinel !== null && !wakeLockSentinel.released,
  };
}

/**
 * Handle page visibility changes to reacquire wake lock when page becomes visible
 * Call this function to set up automatic wake lock management
 * 
 * @param shouldKeepAwake Function that returns whether wake lock should be maintained
 *                        This should consider both running and paused states for search operations
 */
export function setupAutoWakeLockManagement(shouldKeepAwake: () => boolean): void {
  if (!isWakeLockSupported()) {
    return;
  }

  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState === 'visible' && shouldKeepAwake()) {
      // Reacquire wake lock when page becomes visible
      // This handles cases where wake lock was automatically released when tab became hidden
      await requestWakeLock();
    }
  });
}
