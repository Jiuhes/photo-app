import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { documentDirectory, getInfoAsync, writeAsStringAsync } from 'expo-file-system/legacy';
import { useEffect, useState } from 'react';
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
    FadeIn,
    FadeOut,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withRepeat,
    withSequence,
    withTiming
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');
const TUTORIAL_FILE = documentDirectory + 'tutorial_shown.json';

interface TutorialStep {
    icon: string;
    title: string;
    description: string;
    animation: 'swipe' | 'pinch' | 'longpress' | 'tap';
}

const STEPS: TutorialStep[] = [
    {
        icon: 'swap-horizontal',
        title: '左右滑动',
        description: '在卡片模式下左右滑动切换照片',
        animation: 'swipe',
    },
    {
        icon: 'expand',
        title: '双指缩放',
        description: '在全屏模式下双指捏合缩放照片',
        animation: 'pinch',
    },
    {
        icon: 'hand-left',
        title: '长按操作',
        description: '长按照片弹出收藏、分享等选项',
        animation: 'longpress',
    },
    {
        icon: 'finger-print',
        title: '双击放大',
        description: '在全屏模式下双击快速放大照片',
        animation: 'tap',
    },
];

function SwipeAnimation() {
    const x = useSharedValue(0);

    useEffect(() => {
        x.value = withRepeat(
            withSequence(
                withTiming(-30, { duration: 500 }),
                withTiming(30, { duration: 500 }),
                withTiming(0, { duration: 300 })
            ),
            -1,
            false
        );
    }, []);

    const style = useAnimatedStyle(() => ({
        transform: [{ translateX: x.value }],
    }));

    return (
        <Animated.View style={[styles.gestureDemo, style]}>
            <View style={styles.demoCard} />
        </Animated.View>
    );
}

function PinchAnimation() {
    const scale = useSharedValue(1);

    useEffect(() => {
        scale.value = withRepeat(
            withSequence(
                withTiming(1.3, { duration: 600 }),
                withTiming(1, { duration: 600 })
            ),
            -1,
            false
        );
    }, []);

    const style = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    return (
        <Animated.View style={[styles.gestureDemo, style]}>
            <View style={styles.demoImage} />
        </Animated.View>
    );
}

function LongPressAnimation() {
    const opacity = useSharedValue(0.5);
    const scale = useSharedValue(1);

    useEffect(() => {
        opacity.value = withRepeat(
            withSequence(
                withTiming(1, { duration: 800 }),
                withDelay(400, withTiming(0.5, { duration: 300 }))
            ),
            -1,
            false
        );
        scale.value = withRepeat(
            withSequence(
                withTiming(0.95, { duration: 800 }),
                withDelay(400, withTiming(1, { duration: 300 }))
            ),
            -1,
            false
        );
    }, []);

    const style = useAnimatedStyle(() => ({
        opacity: opacity.value,
        transform: [{ scale: scale.value }],
    }));

    return (
        <Animated.View style={[styles.gestureDemo, style]}>
            <View style={styles.demoCard} />
        </Animated.View>
    );
}

function TapAnimation() {
    const scale = useSharedValue(1);

    useEffect(() => {
        scale.value = withRepeat(
            withSequence(
                withTiming(0.9, { duration: 100 }),
                withTiming(1.5, { duration: 300 }),
                withDelay(500, withTiming(1, { duration: 300 }))
            ),
            -1,
            false
        );
    }, []);

    const style = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    return (
        <Animated.View style={[styles.gestureDemo, style]}>
            <View style={styles.demoImage} />
        </Animated.View>
    );
}

export default function GestureTutorial({ onComplete }: { onComplete: () => void }) {
    const insets = useSafeAreaInsets();
    const [step, setStep] = useState(0);
    const [shouldShow, setShouldShow] = useState(false);

    useEffect(() => {
        checkIfShown();
    }, []);

    const checkIfShown = async () => {
        try {
            const info = await getInfoAsync(TUTORIAL_FILE);
            if (!info.exists) {
                setShouldShow(true);
            }
        } catch {
            setShouldShow(true);
        }
    };

    const handleNext = () => {
        if (step < STEPS.length - 1) {
            setStep(step + 1);
        } else {
            handleComplete();
        }
    };

    const handleComplete = async () => {
        try {
            await writeAsStringAsync(TUTORIAL_FILE, JSON.stringify({ shown: true }));
        } catch { }
        setShouldShow(false);
        onComplete();
    };

    if (!shouldShow) return null;

    const currentStep = STEPS[step];

    const renderAnimation = () => {
        switch (currentStep.animation) {
            case 'swipe':
                return <SwipeAnimation />;
            case 'pinch':
                return <PinchAnimation />;
            case 'longpress':
                return <LongPressAnimation />;
            case 'tap':
                return <TapAnimation />;
        }
    };

    return (
        <Animated.View
            entering={FadeIn.duration(300)}
            exiting={FadeOut.duration(200)}
            style={styles.overlay}
        >
            <BlurView intensity={80} tint="dark" style={styles.blur}>
                <View style={[styles.content, { paddingTop: insets.top + 60, paddingBottom: insets.bottom + 40 }]}>
                    <TouchableOpacity style={styles.skipBtn} onPress={handleComplete}>
                        <Text style={styles.skipText}>跳过</Text>
                    </TouchableOpacity>

                    <View style={styles.animationArea}>
                        {renderAnimation()}
                    </View>

                    <View style={styles.info}>
                        <View style={styles.iconWrap}>
                            <Ionicons name={currentStep.icon as any} size={32} color="#fff" />
                        </View>
                        <Text style={styles.title}>{currentStep.title}</Text>
                        <Text style={styles.description}>{currentStep.description}</Text>
                    </View>

                    <View style={styles.dots}>
                        {STEPS.map((_, idx) => (
                            <View
                                key={idx}
                                style={[styles.dot, idx === step && styles.dotActive]}
                            />
                        ))}
                    </View>

                    <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
                        <Text style={styles.nextText}>
                            {step < STEPS.length - 1 ? '下一步' : '开始使用'}
                        </Text>
                        <Ionicons name="arrow-forward" size={20} color="#fff" />
                    </TouchableOpacity>
                </View>
            </BlurView>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    overlay: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 1000,
    },
    blur: {
        flex: 1,
    },
    content: {
        flex: 1,
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    skipBtn: {
        position: 'absolute',
        top: 60,
        right: 20,
        padding: 10,
    },
    skipText: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 14,
    },
    animationArea: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    gestureDemo: {
        width: 120,
        height: 160,
        justifyContent: 'center',
        alignItems: 'center',
    },
    demoCard: {
        width: 100,
        height: 140,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 12,
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    demoImage: {
        width: 80,
        height: 80,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 8,
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    info: {
        alignItems: 'center',
        marginBottom: 40,
    },
    iconWrap: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: 'rgba(255,255,255,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    title: {
        color: '#fff',
        fontSize: 24,
        fontWeight: '700',
        marginBottom: 12,
    },
    description: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 16,
        textAlign: 'center',
        lineHeight: 24,
    },
    dots: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 30,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: 'rgba(255,255,255,0.2)',
    },
    dotActive: {
        backgroundColor: '#fff',
        width: 24,
    },
    nextBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: 'rgba(255,255,255,0.15)',
        paddingVertical: 14,
        paddingHorizontal: 28,
        borderRadius: 25,
    },
    nextText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});
