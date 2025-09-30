// Performance monitoring utilities

export const measurePerformance = async <T>(
  fn: () => Promise<T>,
  label: string
): Promise<T> => {
  const start = performance.now();
  
  try {
    const result = await fn();
    const end = performance.now();
    const duration = end - start;
    
    console.log(`⏱️ ${label} completed in ${duration.toFixed(2)}ms`);
    
    // Performance thresholds
    if (duration > 3000) {
      console.warn(`⚠️ ${label} took longer than 3s (${duration.toFixed(2)}ms)`);
    }
    
    return result;
  } catch (error) {
    const end = performance.now();
    const duration = end - start;
    console.error(`❌ ${label} failed after ${duration.toFixed(2)}ms`, error);
    throw error;
  }
};

export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

// Memory usage tracking
export const getMemoryUsage = (): {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  percentage: number;
} | null => {
  if (!('memory' in performance)) {
    console.warn('Performance.memory not available');
    return null;
  }

  const memory = (performance as any).memory;
  const usedMB = memory.usedJSHeapSize / 1048576;
  const totalMB = memory.jsHeapSizeLimit / 1048576;
  const percentage = (usedMB / totalMB) * 100;

  return {
    usedJSHeapSize: Math.round(usedMB * 100) / 100,
    totalJSHeapSize: Math.round(totalMB * 100) / 100,
    percentage: Math.round(percentage * 100) / 100,
  };
};

export const logMemoryUsage = (label: string) => {
  const memoryInfo = getMemoryUsage();
  
  if (memoryInfo) {
    console.log(
      `🧠 ${label} - Memory: ${memoryInfo.usedJSHeapSize}MB / ${memoryInfo.totalJSHeapSize}MB (${memoryInfo.percentage}%)`
    );
    
    if (memoryInfo.percentage > 90) {
      console.warn(`⚠️ High memory usage detected: ${memoryInfo.percentage}%`);
    }
  }
};
