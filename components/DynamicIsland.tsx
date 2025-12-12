import { BlurView } from 'expo-blur';
import { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withSpring
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Props {
    children: ReactNode;
    position?: 'top' | 'bottom';
    onSwipeUp?: () => void;
    onSwipeDown?: () => void;
}

export default function DynamicIsland({
    children,
    position = 'bottom',
    onSwipeUp,
    onSwipeDown,
}: Props) {
    const insets = useSafeAreaInsets();
    const translateY = useSharedValue(0);

    const gesture = Gesture.Pan()
        .onUpdate((e) => {
            translateY.value = e.translationY * 0.2;
        })
        .onEnd((e) => {
            if (position === 'bottom') {
                if (e.translationY < -50 && onSwipeUp) {
                    runOnJS(onSwipeUp)();
                } else if (e.translationY > 50 && onSwipeDown) {
                    runOnJS(onSwipeDown)();
                }
            } else {
                if (e.translationY > 50 && onSwipeDown) {
                    runOnJS(onSwipeDown)();
                } else if (e.translationY < -50 && onSwipeUp) {
                    runOnJS(onSwipeUp)();
                }
            }
            translateY.value = withSpring(0, { damping: 14 });
        });

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: translateY.value }],
    }));

    const containerStyle = [
        styles.container,
        position === 'bottom'
            ? { bottom: insets.bottom + 20 }
            : { top: insets.top + 50 },
    ];

    return (
        <Animated.View style={[containerStyle, animatedStyle]}>
            <View style={styles.outerGlow} />
            <View style={styles.innerGlow} />
            <GestureDetector gesture={gesture}>
                <BlurView intensity={60} tint="dark" style={styles.blur}>
                    <View style={styles.content}>{children}</View>
                </BlurView>
            </GestureDetector>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        alignSelf: 'center',
        zIndex: 999,
    },
    outerGlow: {
        position: 'absolute',
        top: -3,
        left: -3,
        right: -3,
        bottom: -3,
        borderRadius: 32,
        backgroundColor: 'rgba(255,255,255,0.04)',
    },
    innerGlow: {
        position: 'absolute',
        top: -1,
        left: -1,
        right: -1,
        bottom: -1,
        borderRadius: 28,
        backgroundColor: 'rgba(255,255,255,0.06)',
    },
    blur: {
        borderRadius: 26,
        overflow: 'hidden',
        paddingVertical: 8,
        paddingHorizontal: 10,
        borderWidth: 0.5,
        borderColor: 'rgba(255,255,255,0.12)',
        backgroundColor: 'rgba(0,0,0,0.3)',
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
});
