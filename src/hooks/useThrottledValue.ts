import { useRef, useEffect, useState, useMemo } from 'react';

/**
 * 通用的 requestAnimationFrame 节流 hook
 * 自动适应浏览器的刷新率，提供最佳的渲染性能
 */
export function useRAFThrottle<T>(value: T): T {
  const [throttledValue, setThrottledValue] = useState<T>(value);
  const rafRef = useRef<number>();
  const pendingValueRef = useRef<T>(value);

  useEffect(() => {
    pendingValueRef.current = value;
    
    // 如果已经有待处理的RAF，直接返回
    if (rafRef.current) {
      return;
    }

    rafRef.current = requestAnimationFrame(() => {
      setThrottledValue(pendingValueRef.current);
      rafRef.current = undefined;
    });

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = undefined;
      }
    };
  }, [value]);

  return throttledValue;
}

/**
 * 智能防抖 hook - 根据更新频率自动调整策略
 * 高频更新时使用RAF，低频更新时直接更新
 */
export function useSmartThrottle<T>(value: T): T {
  const [throttledValue, setThrottledValue] = useState<T>(value);
  const lastUpdateTime = useRef<number>(0);
  const updateCount = useRef<number>(0);
  const rafRef = useRef<number>();
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  // 计算更新频率并选择合适的策略
  const updateStrategy = useMemo(() => {
    const now = Date.now();
    const timeSinceLastUpdate = now - lastUpdateTime.current;
    
    // 如果更新间隔小于100ms，认为是高频更新
    if (timeSinceLastUpdate < 100) {
      updateCount.current++;
      return updateCount.current > 3 ? 'raf' : 'immediate';
    } else {
      updateCount.current = 0;
      return 'immediate';
    }
  }, [value]);

  useEffect(() => {
    // 清理之前的定时器
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = undefined;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = undefined;
    }

    if (updateStrategy === 'immediate') {
      setThrottledValue(value);
      lastUpdateTime.current = Date.now();
    } else {
      // 高频更新时使用RAF
      rafRef.current = requestAnimationFrame(() => {
        setThrottledValue(value);
        lastUpdateTime.current = Date.now();
        rafRef.current = undefined;
      });
    }

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [value, updateStrategy]);

  return throttledValue;
}

/**
 * 专门用于流式文本的优化 hook
 * 使用RAF确保与浏览器渲染同步
 */
export function useStreamingText(text: string): string {
  return useRAFThrottle(text);
}
