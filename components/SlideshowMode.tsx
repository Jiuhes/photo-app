import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { useEffect, useRef, useState } from 'react';
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
    Easing,
    FadeIn,
    FadeOut,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

interface PhotoAsset {
    id: string;
    uri: string;
    exif?: {
        Model?: string | null;
        DeviceModel?: string | null;
    };
}

interface Props {
    photos: PhotoAsset[];
    visible: boolean;
    onClose: () => void;
    intervalMs?: number;
}

export default function SlideshowMode({ photos, visible, onClose, intervalMs = 4000 }: Props) {
    const insets = useSafeAreaInsets();
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const [showControls, setShowControls] = useState(true);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const controlsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const progress = useSharedValue(0);
    const imageOpacity = useSharedValue(1);

    const startTimer = () => {
        if (timerRef.current) clearInterval(timerRef.current);
        progress.value = 0;
        progress.value = withTiming(1, { duration: intervalMs, easing: Easing.linear });

        timerRef.current = setInterval(() => {
            imageOpacity.value = withTiming(0, { duration: 300 }, () => {
                setCurrentIndex(prev => (prev + 1) % photos.length);
            });
        }, intervalMs);
    };

    const stopTimer = () => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
    };

    useEffect(() => {
        if (visible && !isPaused && photos.length > 0) {
            startTimer();
        } else {
            stopTimer();
        }
        return () => stopTimer();
    }, [visible, isPaused, photos.length]);

    useEffect(() => {
        imageOpacity.value = withTiming(1, { duration: 500 });
        if (!isPaused) {
            progress.value = 0;
            progress.value = withTiming(1, { duration: intervalMs, easing: Easing.linear });
        }
    }, [currentIndex]);

    const hideControlsAfterDelay = () => {
        if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
        controlsTimerRef.current = setTimeout(() => {
            if (!isPaused) setShowControls(false);
        }, 3000);
    };

    const handleScreenTap = () => {
        setShowControls(true);
        hideControlsAfterDelay();
    };

    const handlePrevious = () => {
        setCurrentIndex(prev => (prev - 1 + photos.length) % photos.length);
    };

    const handleNext = () => {
        setCurrentIndex(prev => (prev + 1) % photos.length);
    };

    const togglePause = () => {
        setIsPaused(prev => !prev);
        setShowControls(true);
    };

    const progressStyle = useAnimatedStyle(() => ({
        width: `${progress.value * 100}%`,
    }));

    const imageStyle = useAnimatedStyle(() => ({
        opacity: imageOpacity.value,
    }));

    if (!visible || photos.length === 0) return null;

    const photo = photos[currentIndex];

    return (
        <Animated.View
            entering={FadeIn.duration(300)}
            exiting={FadeOut.duration(200)}
            style={styles.container}
        >
            <TouchableOpacity
                activeOpacity={1}
                onPress={handleScreenTap}
                style={styles.imageContainer}
            >
                <Animated.View style={[styles.imageFill, imageStyle]}>
                    <Image
                        source={{ uri: photo.uri }}
                        style={styles.image}
                        contentFit="cover"
                        transition={0}
                    />
                </Animated.View>
            </TouchableOpacity>

            {showControls && (
                <Animated.View
                    entering={FadeIn.duration(200)}
                    exiting={FadeOut.duration(200)}
                    style={styles.overlay}
                >
                    <View style={[styles.topBar, { paddingTop: insets.top + 10 }]}>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <Ionicons name="close" size={28} color="#fff" />
                        </TouchableOpacity>
                        <View style={styles.counter}>
                            <Text style={styles.counterText}>
                                {currentIndex + 1} / {photos.length}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.progressContainer}>
                        <View style={styles.progressBg}>
                            <Animated.View style={[styles.progressFill, progressStyle]} />
                        </View>
                    </View>

                    <BlurView intensity={60} tint="dark" style={[styles.bottomBar, { paddingBottom: insets.bottom + 20 }]}>
                        <TouchableOpacity onPress={handlePrevious} style={styles.navBtn}>
                            <Ionicons name="play-skip-back" size={24} color="#fff" />
                        </TouchableOpacity>

                        <TouchableOpacity onPress={togglePause} style={styles.playBtn}>
                            <Ionicons
                                name={isPaused ? 'play' : 'pause'}
                                size={32}
                                color="#fff"
                            />
                        </TouchableOpacity>

                        <TouchableOpacity onPress={handleNext} style={styles.navBtn}>
                            <Ionicons name="play-skip-forward" size={24} color="#fff" />
                        </TouchableOpacity>
                    </BlurView>

                    <View style={styles.deviceInfo}>
                        <Text style={styles.deviceText}>
                            {photo.exif?.Model || photo.exif?.DeviceModel || ''}
                        </Text>
                    </View>
                </Animated.View>
            )}
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#000',
        zIndex: 600,
    },
    imageContainer: {
        flex: 1,
    },
    imageFill: {
        flex: 1,
    },
    image: {
        width: '100%',
        height: '100%',
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
    },
    topBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    closeBtn: {
        padding: 8,
    },
    counter: {
        backgroundColor: 'rgba(0,0,0,0.5)',
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 15,
    },
    counterText: {
        color: '#fff',
        fontSize: 14,
    },
    progressContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
    },
    progressBg: {
        height: 3,
        backgroundColor: 'rgba(255,255,255,0.2)',
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#fff',
    },
    bottomBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 30,
        paddingVertical: 20,
    },
    navBtn: {
        padding: 12,
    },
    playBtn: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    deviceInfo: {
        position: 'absolute',
        bottom: 120,
        left: 0,
        right: 0,
        alignItems: 'center',
    },
    deviceText: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 14,
    },
});
