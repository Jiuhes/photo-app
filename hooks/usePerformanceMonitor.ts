import { useEffect, useRef } from 'react';

interface PerformanceMetrics {
    renderCount: number;
    averageRenderTime: number;
    lastRenderTime: number;
}

export default function usePerformanceMonitor(componentName: string) {
    const renderCount = useRef(0);
    const renderTimes = useRef<number[]>([]);
    const startTime = useRef<number>(0);

    useEffect(() => {
        startTime.current = performance.now();
        renderCount.current += 1;

        return () => {
            const endTime = performance.now();
            const renderTime = endTime - startTime.current;
            renderTimes.current.push(renderTime);

            if (renderTimes.current.length > 10) {
                renderTimes.current.shift();
            }

            if (__DEV__ && renderCount.current % 10 === 0) {
                const avgTime = renderTimes.current.reduce((a, b) => a + b, 0) / renderTimes.current.length;
                console.log(`[Performance] ${componentName}:`, {
                    renders: renderCount.current,
                    avgRenderTime: avgTime.toFixed(2) + 'ms',
                    lastRenderTime: renderTime.toFixed(2) + 'ms',
                });
            }
        };
    });

    const getMetrics = (): PerformanceMetrics => ({
        renderCount: renderCount.current,
        averageRenderTime: renderTimes.current.reduce((a, b) => a + b, 0) / renderTimes.current.length,
        lastRenderTime: renderTimes.current[renderTimes.current.length - 1] || 0,
    });

    return { getMetrics };
}
