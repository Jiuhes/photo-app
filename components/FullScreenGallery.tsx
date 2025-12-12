import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Dimensions, FlatList, StyleSheet, Text, TouchableOpacity, View, ViewToken } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { preloadAdjacentImages } from '../services/imagePreloader';
import PhotoInfoSheet from './PhotoInfoSheet';

const { width, height } = Dimensions.get('window');

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
    initialIndex?: number;
    formatFNumber: (f: string | null | undefined) => string;
    formatExposure: (time: string | null | undefined) => string;
    formatISO: (iso: string | null | undefined) => string;
    onLoadMore?: () => void;
    isLoading?: boolean;
    onClose?: () => void;
}

function ZoomableImage({ uri }: { uri: string }) {
    const scale = useSharedValue(1);
    const savedScale = useSharedValue(1);
    const translateX = useSharedValue(0);
    const translateY = useSharedValue(0);
    const savedTranslateX = useSharedValue(0);
    const savedTranslateY = useSharedValue(0);
    const isZoomed = useSharedValue(false);

    const resetZoom = () => {
        'worklet';
        scale.value = withSpring(1);
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
        savedScale.value = 1;
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
        isZoomed.value = false;
    };

    const pinchGesture = Gesture.Pinch()
        .onUpdate(e => {
            scale.value = Math.max(0.5, Math.min(savedScale.value * e.scale, 4));
        })
        .onEnd(() => {
            if (scale.value < 1) {
                resetZoom();
            } else {
                savedScale.value = scale.value;
                isZoomed.value = scale.value > 1;
            }
        });

    const panGesture = Gesture.Pan()
        .minPointers(1)
        .maxPointers(2)
        .onUpdate(e => {
            if (scale.value > 1) {
                const maxX = (width * (scale.value - 1)) / 2;
                const maxY = (height * (scale.value - 1)) / 2;
                translateX.value = Math.max(-maxX, Math.min(maxX, savedTranslateX.value + e.translationX));
                translateY.value = Math.max(-maxY, Math.min(maxY, savedTranslateY.value + e.translationY));
            }
        })
        .onEnd(() => {
            savedTranslateX.value = translateX.value;
            savedTranslateY.value = translateY.value;
        });

    const doubleTapGesture = Gesture.Tap()
        .numberOfTaps(2)
        .onEnd(e => {
            if (scale.value > 1) {
                resetZoom();
            } else {
                const targetScale = 2.5;
                scale.value = withSpring(targetScale);
                savedScale.value = targetScale;
                isZoomed.value = true;

                const focalX = e.x - width / 2;
                const focalY = e.y - height / 2;
                translateX.value = withSpring(-focalX * (targetScale - 1) / targetScale);
                translateY.value = withSpring(-focalY * (targetScale - 1) / targetScale);
            }
        });

    const composedGesture = Gesture.Simultaneous(
        pinchGesture,
        Gesture.Race(doubleTapGesture, panGesture)
    );

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [
            { translateX: translateX.value },
            { translateY: translateY.value },
            { scale: scale.value },
        ],
    }));

    return (
        <GestureDetector gesture={composedGesture}>
            <Animated.View style={[styles.imageContainer, animatedStyle]}>
                <Image
                    source={{ uri }}
                    style={styles.image}
                    contentFit="contain"
                    cachePolicy="memory-disk"
                />
            </Animated.View>
        </GestureDetector>
    );
}

export default function FullScreenGallery({
    photos,
    initialIndex = 0,
    formatFNumber,
    formatExposure,
    formatISO,
    onLoadMore,
    isLoading,
    onClose,
}: Props) {
    const insets = useSafeAreaInsets();
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const [showInfo, setShowInfo] = useState(false);

    const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: ViewToken[] }) => {
        if (viewableItems.length > 0 && viewableItems[0].index !== null) {
            const newIndex = viewableItems[0].index;
            setCurrentIndex(newIndex);

            preloadAdjacentImages(photos, newIndex, 2);

            if (newIndex >= photos.length - 3 && onLoadMore) {
                onLoadMore();
            }
        }
    }, [photos, onLoadMore]);

    const renderItem = useCallback(({ item }: { item: PhotoAsset }) => (
        <View style={styles.page}>
            <ZoomableImage uri={item.uri} />
        </View>
    ), []);

    if (photos.length === 0) {
        return (
            <View style={styles.empty}>
                <Text style={styles.emptyText}>没有照片</Text>
            </View>
        );
    }

    const photo = photos[currentIndex];

    return (
        <View style={styles.root}>
            <FlatList
                data={photos}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                initialScrollIndex={initialIndex}
                getItemLayout={(_, index) => ({
                    length: width,
                    offset: width * index,
                    index,
                })}
                onViewableItemsChanged={onViewableItemsChanged}
                viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
                removeClippedSubviews
            />

            <View style={[styles.top, { paddingTop: insets.top + 15 }]}>
                <View style={styles.counter}>
                    <Text style={styles.counterNum}>{currentIndex + 1}</Text>
                    <Text style={styles.counterSlash}>/</Text>
                    <Text style={styles.counterTotal}>{photos.length}</Text>
                    {isLoading && <ActivityIndicator size="small" color="#fff" style={{ marginLeft: 10 }} />}
                </View>
            </View>

            <BlurView intensity={50} tint="dark" style={[styles.info, { paddingBottom: insets.bottom + 80 }]}>
                <View style={styles.infoHeader}>
                    <Text style={styles.device}>
                        {photo?.exif?.Model || photo?.exif?.DeviceModel || 'Unknown'}
                    </Text>
                    <TouchableOpacity
                        style={styles.infoBtn}
                        onPress={() => setShowInfo(true)}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="information-circle-outline" size={22} color="rgba(255,255,255,0.7)" />
                    </TouchableOpacity>
                </View>
                <View style={styles.params}>
                    <View style={styles.param}>
                        <Text style={styles.paramVal}>{formatFNumber(photo?.exif?.FNumber)}</Text>
                        <Text style={styles.paramLabel}>光圈</Text>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.param}>
                        <Text style={styles.paramVal}>{formatExposure(photo?.exif?.ExposureTime)}</Text>
                        <Text style={styles.paramLabel}>快门</Text>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.param}>
                        <Text style={styles.paramVal}>{formatISO(photo?.exif?.ISOSpeedRatings)}</Text>
                        <Text style={styles.paramLabel}>ISO</Text>
                    </View>
                </View>
            </BlurView>

            {photo && (
                <PhotoInfoSheet
                    photo={photo}
                    visible={showInfo}
                    onClose={() => setShowInfo(false)}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#000' },
    empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyText: { color: '#666', fontSize: 16 },
    page: { width, height, justifyContent: 'center', alignItems: 'center' },
    imageContainer: { width, height },
    image: { width: '100%', height: '100%' },
    top: { position: 'absolute', top: 0, left: 0, right: 0, alignItems: 'center' },
    counter: { flexDirection: 'row', alignItems: 'baseline', backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
    counterNum: { color: '#fff', fontSize: 18, fontWeight: '700' },
    counterSlash: { color: 'rgba(255,255,255,0.4)', fontSize: 14, marginHorizontal: 4 },
    counterTotal: { color: 'rgba(255,255,255,0.5)', fontSize: 14 },
    info: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, alignItems: 'center' },
    infoHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
    device: { color: '#fff', fontSize: 15, fontWeight: '600' },
    infoBtn: { padding: 4 },
    params: { flexDirection: 'row', alignItems: 'center' },
    param: { alignItems: 'center', paddingHorizontal: 18 },
    paramVal: { color: '#fff', fontSize: 15, fontWeight: '600' },
    paramLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 10, marginTop: 2 },
    divider: { width: 1, height: 24, backgroundColor: 'rgba(255,255,255,0.2)' },
});
