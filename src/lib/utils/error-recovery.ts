/**
 * LocalStorageをクリアしてアプリケーションを初期状態に戻す
 * データ移行エラーやstore初期化エラーからの復旧に使用
 */
export function resetApplicationState(): void {
  localStorage.clear();
  sessionStorage.clear();
  window.location.reload();
}
