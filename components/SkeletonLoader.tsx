import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import Animated, {
    interpolate,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming,
} from 'react-native-reanimated';

const { width } = Dimensions.get('window');
const COLUMN_GAP = 10;
const COLUMN_WIDTH = (width - 40 - COLUMN_GAP) / 2;

interface Props {
    count?: number;
}

function ShimmerCard({ height, delay }: { height: number; delay: number }) {
    const shimmer = useSharedValue(0);

    useEffect(() => {
        const timeout = setTimeout(() => {
            shimmer.value = withRepeat(
                withTiming(1, { duration: 1500 }),
                -1,
                false
            );
        }, delay);
        return () => clearTimeout(timeout);
    }, []);

    const shimmerStyle = useAnimatedStyle(() => ({
        transform: [
            { translateX: interpolate(shimmer.value, [0, 1], [-COLUMN_WIDTH, COLUMN_WIDTH * 2]) },
        ],
    }));

    return (
        <View style={[styles.skeletonCard, { height }]}>
            <Animated.View style={[styles.shimmer, shimmerStyle]}>
                <LinearGradient
                    colors={['transparent', 'rgba(255,255,255,0.08)', 'transparent']}
                    start={{ x: 0, y: 0.5 }}
                    end={{ x: 1, y: 0.5 }}
                    style={styles.shimmerGradient}
                />
            </Animated.View>
        </View>
    );
}

export default function SkeletonLoader({ count = 6 }: Props) {
    const heights = [200, 250, 180, 220, 240, 190, 210, 230];

    const leftCards = Array.from({ length: Math.ceil(count / 2) }, (_, i) => ({
        index: i * 2,
        height: heights[(i * 2) % heights.length],
    }));
    const rightCards = Array.from({ length: Math.floor(count / 2) }, (_, i) => ({
        index: i * 2 + 1,
        height: heights[(i * 2 + 1) % heights.length],
    }));

    return (
        <View style={styles.container}>
            <View style={styles.column}>
                {leftCards.map(({ index, height }) => (
                    <ShimmerCard key={index} height={height} delay={index * 100} />
                ))}
            </View>
            <View style={styles.column}>
                {rightCards.map(({ index, height }) => (
                    <ShimmerCard key={index} height={height} delay={index * 100} />
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        gap: COLUMN_GAP,
    },
    column: {
        flex: 1,
        gap: COLUMN_GAP,
    },
    skeletonCard: {
        width: COLUMN_WIDTH,
        backgroundColor: 'rgba(255,255,255,0.06)',
        borderRadius: 16,
        overflow: 'hidden',
    },
    shimmer: {
        ...StyleSheet.absoluteFillObject,
    },
    shimmerGradient: {
        width: COLUMN_WIDTH,
        height: '100%',
    },
});
