import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
    interpolate,
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');
const CARD_WIDTH = width - 40;
const CARD_HEIGHT = height * 0.55;
const SWIPE_THRESHOLD = width * 0.25;

interface PhotoAsset {
    id: string;
    uri: string;
    exif?: {
        Model?: string | null;
        DeviceModel?: string | null;
        FNumber?: string | null;
        ExposureTime?: string | null;
        ISOSpeedRatings?: string | null;
    };
}

interface Props {
    photos: PhotoAsset[];
    formatFNumber: (f: string | null | undefined) => string;
    formatExposure: (time: string | null | undefined) => string;
    formatISO: (iso: string | null | undefined) => string;
    onLoadMore?: () => void;
    isLoading?: boolean;
}

export default function TinderCards({ photos, formatFNumber, formatExposure, formatISO, onLoadMore, isLoading }: Props) {
    const insets = useSafeAreaInsets();
    const [displayIndex, setDisplayIndex] = useState(0);
    const [stats, setStats] = useState({ left: 0, right: 0 });

    const x = useSharedValue(0);
    const y = useSharedValue(0);
    const isOut = useSharedValue(0);

    useEffect(() => {
        x.value = 0;
        y.value = 0;
        isOut.value = 0;
    }, [displayIndex]);

    const onComplete = (dir: 'left' | 'right') => {
        setStats(s => ({ ...s, [dir]: s[dir] + 1 }));

        const nextIndex = displayIndex + 1;
        if (nextIndex >= photos.length - 3 && onLoadMore) {
            onLoadMore();
        }

        setDisplayIndex(nextIndex < photos.length ? nextIndex : 0);
    };

    const gesture = Gesture.Pan()
        .onUpdate(e => {
            x.value = e.translationX;
            y.value = e.translationY * 0.3;
        })
        .onEnd(e => {
            if (e.translationX > SWIPE_THRESHOLD) {
                isOut.value = 1;
                x.value = withTiming(width * 1.5, { duration: 200 });
                y.value = withTiming(0, { duration: 200 }, () => {
                    runOnJS(onComplete)('right');
                });
            } else if (e.translationX < -SWIPE_THRESHOLD) {
                isOut.value = 1;
                x.value = withTiming(-width * 1.5, { duration: 200 });
                y.value = withTiming(0, { duration: 200 }, () => {
                    runOnJS(onComplete)('left');
                });
            } else {
                x.value = withTiming(0, { duration: 150 });
                y.value = withTiming(0, { duration: 150 });
            }
        });

    const topStyle = useAnimatedStyle(() => {
        if (isOut.value === 1) {
            return {
                transform: [
                    { translateX: x.value },
                    { translateY: y.value },
                    { rotate: `${interpolate(x.value, [-width, width], [-15, 15])}deg` },
                ],
                opacity: 1,
            };
        }
        return {
            transform: [
                { translateX: x.value },
                { translateY: y.value },
                { rotate: `${interpolate(x.value, [-width, width], [-15, 15])}deg` },
            ],
            opacity: 1,
        };
    });

    const likeStyle = useAnimatedStyle(() => ({
        opacity: interpolate(x.value, [0, 100], [0, 1]),
    }));

    const nopeStyle = useAnimatedStyle(() => ({
        opacity: interpolate(x.value, [-100, 0], [1, 0]),
    }));

    const backStyle = useAnimatedStyle(() => ({
        transform: [{ scale: 1 }],
    }));

    if (photos.length === 0) {
        return (
            <View style={styles.empty}>
                <Text style={styles.emptyText}>没有照片</Text>
            </View>
        );
    }

    const current = photos[displayIndex];
    const nextPhoto = photos[(displayIndex + 1) % photos.length];

    return (
        <View style={styles.root}>
            <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
                <View style={styles.badge}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Ionicons name="thumbs-down" size={14} color="rgba(255,255,255,0.7)" />
                        <Text style={styles.badgeText}>{stats.left}</Text>
                    </View>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={styles.count}>{displayIndex + 1} / {photos.length}</Text>
                    {isLoading && <ActivityIndicator size="small" color="#fff" style={{ marginLeft: 8 }} />}
                </View>
                <View style={styles.badge}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Text style={styles.badgeText}>{stats.right}</Text>
                        <Ionicons name="thumbs-up" size={14} color="rgba(255,255,255,0.7)" />
                    </View>
                </View>
            </View>

            <View style={styles.cards}>
                <Animated.View style={[styles.card, styles.back, backStyle]}>
                    <Image
                        source={{ uri: nextPhoto.uri }}
                        style={styles.img}
                        contentFit="contain"
                        cachePolicy="memory-disk"
                    />
                    <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={styles.info}>
                        <Text style={styles.device} numberOfLines={1}>
                            {nextPhoto.exif?.Model || nextPhoto.exif?.DeviceModel || 'Unknown'}
                        </Text>
                    </LinearGradient>
                </Animated.View>

                <GestureDetector gesture={gesture}>
                    <Animated.View style={[styles.card, styles.top, topStyle]}>
                        <Image
                            source={{ uri: current.uri }}
                            style={styles.img}
                            contentFit="contain"
                            cachePolicy="memory-disk"
                        />

                        <Animated.View style={[styles.label, styles.like, likeStyle]}>
                            <Text style={styles.labelText}>LIKE</Text>
                        </Animated.View>

                        <Animated.View style={[styles.label, styles.nope, nopeStyle]}>
                            <Text style={[styles.labelText, { color: 'rgba(255,255,255,0.6)' }]}>NOPE</Text>
                        </Animated.View>

                        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={styles.info}>
                            <Text style={styles.device} numberOfLines={1}>
                                {current.exif?.Model || current.exif?.DeviceModel || 'Unknown'}
                            </Text>
                            <Text style={styles.params}>
                                {formatFNumber(current.exif?.FNumber)} · {formatExposure(current.exif?.ExposureTime)} · {formatISO(current.exif?.ISOSpeedRatings)}
                            </Text>
                        </LinearGradient>
                    </Animated.View>
                </GestureDetector>
            </View>

            <View style={[styles.footer, { paddingBottom: insets.bottom + 80 }]}>
                <View style={styles.buttonRow}>
                    <Pressable
                        style={({ pressed }) => [
                            styles.actionBtn,
                            styles.nopeBtn,
                            pressed && styles.actionBtnPressed,
                        ]}
                        onPress={() => {
                            isOut.value = 1;
                            x.value = withTiming(-width * 1.5, { duration: 300 });
                            y.value = withTiming(0, { duration: 300 }, () => {
                                runOnJS(onComplete)('left');
                            });
                        }}
                    >
                        <Ionicons name="close" size={32} color="rgba(255,255,255,0.8)" />
                    </Pressable>
                    <Pressable
                        style={({ pressed }) => [
                            styles.actionBtn,
                            styles.likeBtn,
                            pressed && styles.actionBtnPressed,
                        ]}
                        onPress={() => {
                            isOut.value = 1;
                            x.value = withTiming(width * 1.5, { duration: 300 });
                            y.value = withTiming(0, { duration: 300 }, () => {
                                runOnJS(onComplete)('right');
                            });
                        }}
                    >
                        <Ionicons name="heart" size={28} color="#fff" />
                    </Pressable>
                </View>
                <Text style={styles.hint}>左滑跳过 · 右滑喜欢</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#000' },
    empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyText: { color: '#666', fontSize: 16 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20 },
    badge: { backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
    badgeText: { color: '#fff', fontSize: 14, fontWeight: '600' },
    count: { color: 'rgba(255,255,255,0.5)', fontSize: 14 },
    cards: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    card: { width: CARD_WIDTH, height: CARD_HEIGHT, borderRadius: 20, overflow: 'hidden', position: 'absolute', backgroundColor: '#111' },
    back: { zIndex: 1 },
    top: { zIndex: 2 },
    img: { width: '100%', height: '100%' },
    label: { position: 'absolute', top: 30, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 3, borderRadius: 6 },
    like: { left: 20, borderColor: '#fff', transform: [{ rotate: '-15deg' }] },
    nope: { right: 20, borderColor: 'rgba(255,255,255,0.5)', transform: [{ rotate: '15deg' }] },
    labelText: { fontSize: 22, fontWeight: '900', color: '#fff' },
    info: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, paddingTop: 40 },
    device: { color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 4 },
    params: { color: 'rgba(255,255,255,0.7)', fontSize: 13 },
    footer: { alignItems: 'center', paddingTop: 15 },
    buttonRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 40, marginBottom: 16 },
    actionBtn: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center' },
    actionBtnPressed: { transform: [{ scale: 0.9 }] },
    nopeBtn: { backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)' },
    likeBtn: { backgroundColor: '#ff4b6e' },
    hint: { color: 'rgba(255,255,255,0.3)', fontSize: 12 },
});
