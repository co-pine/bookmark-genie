import React, { ReactNode, useMemo } from 'react';
import { useRAFThrottle } from '@/hooks/useThrottledValue';

interface OptimizedRendererProps {
  children: ReactNode;
  content: string;
  fallback?: ReactNode;
}

/**
 * 通用的渲染优化组件
 * 使用RAF节流和React.memo来优化高频更新的内容渲染
 */
const OptimizedRenderer: React.FC<OptimizedRendererProps> = React.memo(({ 
  children, 
  content, 
  fallback 
}) => {
  // 使用RAF节流优化内容更新
  const optimizedContent = useRAFThrottle(content);
  
  // 使用useMemo缓存渲染结果，避免不必要的重新计算
  const renderedContent = useMemo(() => {
    if (!optimizedContent && fallback) {
      return fallback;
    }
    return children;
  }, [optimizedContent, children, fallback]);

  return <>{renderedContent}</>;
});

OptimizedRenderer.displayName = 'OptimizedRenderer';

export default OptimizedRenderer;