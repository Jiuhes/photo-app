import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

interface Props {
    visible: boolean;
}

export default function PerformanceMonitor({ visible }: Props) {
    const [fps, setFps] = useState(60);
    const [memory, setMemory] = useState(0);
    const [renders, setRenders] = useState(0);

    const opacity = useSharedValue(0);

    useEffect(() => {
        opacity.value = withSpring(visible ? 1 : 0);
    }, [visible]);

    useEffect(() => {
        if (!visible) return;

        let frameCount = 0;
        let lastTime = performance.now();
        let animationId: number;

        const measureFPS = () => {
            frameCount++;
            const currentTime = performance.now();

            if (currentTime - lastTime >= 1000) {
                setFps(Math.round(frameCount * 1000 / (currentTime - lastTime)));
                frameCount = 0;
                lastTime = currentTime;
                setRenders(prev => prev + 1);
            }

            animationId = requestAnimationFrame(measureFPS);
        };

        animationId = requestAnimationFrame(measureFPS);

        const memoryInterval = setInterval(() => {
            if ((performance as any).memory) {
                const used = (performance as any).memory.usedJSHeapSize / 1024 / 1024;
                setMemory(Math.round(used));
            }
        }, 2000);

        return () => {
            cancelAnimationFrame(animationId);
            clearInterval(memoryInterval);
        };
    }, [visible]);

    const animatedStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
        transform: [{ scale: opacity.value }],
    }));

    if (!visible) return null;

    const fpsColor = fps >= 55 ? '#51cf66' : fps >= 30 ? '#fcc419' : '#ff6b6b';

    return (
        <Animated.View style={[styles.container, animatedStyle]}>
            <View style={styles.row}>
                <View style={styles.item}>
                    <Text style={[styles.value, { color: fpsColor }]}>{fps}</Text>
                    <Text style={styles.label}>FPS</Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.item}>
                    <Text style={styles.value}>{memory || '—'}</Text>
                    <Text style={styles.label}>MB</Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.item}>
                    <Text style={styles.value}>{renders}</Text>
                    <Text style={styles.label}>刷新</Text>
                </View>
            </View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 50,
        right: 10,
        backgroundColor: 'rgba(0,0,0,0.8)',
        borderRadius: 12,
        padding: 10,
        zIndex: 9999,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    item: {
        alignItems: 'center',
        paddingHorizontal: 10,
    },
    value: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
        fontVariant: ['tabular-nums'],
    },
    label: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 9,
        marginTop: 2,
    },
    divider: {
        width: 1,
        height: 20,
        backgroundColor: 'rgba(255,255,255,0.2)',
    },
});
