import { useEffect, useState } from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState<boolean | undefined>(undefined)

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    mql.addEventListener("change", onChange)
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return !!isMobile
}

// 縦長画面でも縦スタックレイアウトを使用するためのフック
export function useIsStackLayout() {
  const [isStack, setIsStack] = useState<boolean | undefined>(undefined)

  useEffect(() => {
    const checkStackLayout = () => {
      const width = window.innerWidth
      const height = window.innerHeight
      
      // 以下の条件で縦スタックレイアウトを使用:
      // 1. 幅が768px未満（従来のモバイル判定）
      // 2. 縦長画面（高さ > 幅）かつ幅が1024px未満
      const shouldStack = width < MOBILE_BREAKPOINT || 
                         (height > width && width < 1024)
      
      setIsStack(shouldStack)
    }

    // リサイズ・オリエンテーション変更を監視
    window.addEventListener("resize", checkStackLayout)
    window.addEventListener("orientationchange", checkStackLayout)
    
    checkStackLayout()
    
    return () => {
      window.removeEventListener("resize", checkStackLayout)
      window.removeEventListener("orientationchange", checkStackLayout)
    }
  }, [])

  return !!isStack
}
