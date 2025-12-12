import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming,
} from 'react-native-reanimated';

interface Props {
    refreshing: boolean;
    progress?: number;
}

export default function RefreshControl({ refreshing, progress = 0 }: Props) {
    const rotation = useSharedValue(0);
    const scale = useSharedValue(0);

    useEffect(() => {
        if (refreshing) {
            scale.value = withTiming(1, { duration: 200 });
            rotation.value = withRepeat(
                withTiming(360, { duration: 1000, easing: Easing.linear }),
                -1
            );
        } else {
            scale.value = withTiming(0, { duration: 200 });
            rotation.value = 0;
        }
    }, [refreshing]);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [
            { scale: scale.value },
            { rotate: `${rotation.value}deg` },
        ],
        opacity: scale.value,
    }));

    if (!refreshing && progress === 0) return null;

    return (
        <View style={styles.container}>
            <Animated.View style={[styles.spinner, animatedStyle]}>
                <View style={styles.spinnerInner}>
                    <Text style={styles.spinnerText}>↻</Text>
                </View>
            </Animated.View>
            {progress > 0 && progress < 1 && (
                <Text style={styles.progressText}>{Math.round(progress * 100)}%</Text>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 60,
        alignSelf: 'center',
        alignItems: 'center',
        zIndex: 100,
    },
    spinner: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.15)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    spinnerInner: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    spinnerText: {
        fontSize: 20,
        color: '#fff',
    },
    progressText: {
        color: '#fff',
        fontSize: 12,
        marginTop: 8,
        fontWeight: '600',
    },
});
