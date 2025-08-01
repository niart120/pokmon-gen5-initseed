/**
 * レスポンシブUIスケーリング用のサイズクラス生成ユーティリティ
 * 1080p/100%環境を基準（スケール=1.0）として、
 * 他の解像度環境に適応的にスケーリングを適用
 */

export interface ResponsiveSizes {
  // レイアウト
  columnWidth: string;
  gap: string;
  cardPadding: string;
  
  // テキスト
  textBase: string;
  textSmall: string;
  textLarge: string;
  
  // インタラクティブ要素
  buttonHeight: string;
  buttonPadding: string;
  
  // テーブル
  tableHeaderHeight: string;
  tableCellPadding: string;
}

/**
 * UIスケール値に応じたレスポンシブサイズクラスを取得
 * @param scale UIスケール値（1.0が基準）
 * @returns レスポンシブサイズクラスのオブジェクト
 */
export function getResponsiveSizes(scale: number): ResponsiveSizes {
  // 基準サイズ (1080p/100%環境用 - scale = 1.0)
  const baseSizes: ResponsiveSizes = {
    // カラム幅: 192px (1080p用に最適化、3カラム合計588px)
    columnWidth: 'sm:min-w-48',
    
    // ギャップ: 4px (gap-1)
    gap: 'gap-1',
    
    // パディング: 8px (p-2)
    cardPadding: 'p-2',
    
    // フォントサイズ
    textBase: 'text-[11px]',
    textSmall: 'text-[10px]',
    textLarge: 'text-xs',
    
    // ボタンサイズ
    buttonHeight: 'h-6',
    buttonPadding: 'px-2 py-0.5',
    
    // テーブル
    tableHeaderHeight: 'h-7',
    tableCellPadding: 'px-1 py-0.5',
  };
  
  // スケール適用後のサイズ
  if (scale <= 0.9) {
    // 小型画面 (1366px以下)
    return {
      columnWidth: 'sm:min-w-40',     // 160px
      gap: 'gap-1',
      cardPadding: 'p-2',
      textBase: 'text-[10px]',
      textSmall: 'text-[9px]',
      textLarge: 'text-xs',
      buttonHeight: 'h-6',
      buttonPadding: 'px-2 py-0.5',
      tableHeaderHeight: 'h-7',
      tableCellPadding: 'px-1 py-0.5',
    };
  } else if (scale <= 1.1) {
    // 基準サイズ (1080p/100%)
    return baseSizes;
  } else if (scale <= 1.4) {
    // 大型画面 (4K/150%等)
    return {
      columnWidth: 'sm:min-w-56',     // 224px (少し控えめ)
      gap: 'gap-2',
      cardPadding: 'p-4',
      textBase: 'text-sm',
      textSmall: 'text-xs',
      textLarge: 'text-base',
      buttonHeight: 'h-8',
      buttonPadding: 'px-3 py-1.5',
      tableHeaderHeight: 'h-9',
      tableCellPadding: 'px-2 py-1.5',
    };
  } else {
    // 超大型画面 (4K/100%等)
    return {
      columnWidth: 'sm:min-w-64',     // 256px
      gap: 'gap-3',
      cardPadding: 'p-5',
      textBase: 'text-base',
      textSmall: 'text-sm',
      textLarge: 'text-lg',
      buttonHeight: 'h-9',
      buttonPadding: 'px-4 py-2',
      tableHeaderHeight: 'h-10',
      tableCellPadding: 'px-2.5 py-2',
    };
  }
}

/**
 * スケール値に基づくサイズ分類を取得
 * @param scale UIスケール値
 * @returns サイズカテゴリ
 */
export function getSizeCategory(scale: number): 'xs' | 'sm' | 'base' | 'lg' | 'xl' {
  if (scale <= 0.9) return 'xs';
  if (scale <= 1.1) return 'base';
  if (scale <= 1.4) return 'lg';
  return 'xl';
}
