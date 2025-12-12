import { getStoredPhotos } from '@/services/photoStore';
import { Image } from 'expo-image';
import * as MediaLibrary from 'expo-media-library';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import {
    Gesture,
    GestureDetector,
} from 'react-native-gesture-handler';
import Animated, {
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');
const AnimatedImage = Animated.createAnimatedComponent(Image) as any;

interface PhotoDetail extends MediaLibrary.Asset {
    creationTime: number;
    filename: string;
    width: number;
    height: number;
}

export default function PhotoViewScreen() {
    const insets = useSafeAreaInsets();
    const params = useLocalSearchParams<{ ids: string; index: string }>();
    const [photos, setPhotos] = useState<PhotoDetail[]>([]);
    const [currentIndex, setCurrentIndex] = useState(parseInt(params.index || '0'));
    const [loading, setLoading] = useState(true);
    const flatListRef = useRef<FlatList>(null);

    const scale = useSharedValue(1);
    const savedScale = useSharedValue(1);
    const translateY = useSharedValue(0);
    const opacity = useSharedValue(1);

    useEffect(() => {
        loadPhotos();
    }, []);

    const loadPhotos = async () => {
        const stored = getStoredPhotos();

        if (stored && stored.length > 0) {
            setPhotos(stored as unknown as PhotoDetail[]);
        } else {
            const ids: string[] = JSON.parse(params.ids || '[]');
            if (ids.length > 0) {
                const details: PhotoDetail[] = [];
                for (const id of ids) {
                    const info = await MediaLibrary.getAssetInfoAsync(id);
                    details.push(info as PhotoDetail);
                }
                setPhotos(details);
            }
        }
        setLoading(false);

        setTimeout(() => {
            flatListRef.current?.scrollToIndex({
                index: parseInt(params.index || '0'),
                animated: false,
            });
        }, 100);
    };

    const goBack = () => {
        router.back();
    };

    const pinchGesture = Gesture.Pinch()
        .onUpdate((e) => {
            scale.value = savedScale.value * e.scale;
        })
        .onEnd(() => {
            if (scale.value < 1) {
                scale.value = withSpring(1);
                savedScale.value = 1;
            } else if (scale.value > 4) {
                scale.value = withSpring(4);
                savedScale.value = 4;
            } else {
                savedScale.value = scale.value;
            }
        });

    const panGesture = Gesture.Pan()
        .onUpdate((e) => {
            if (scale.value === 1) {
                translateY.value = e.translationY;
                opacity.value = 1 - Math.abs(e.translationY) / 300;
            }
        })
        .onEnd((e) => {
            if (Math.abs(e.translationY) > 100 && scale.value === 1) {
                opacity.value = withSpring(0);
                runOnJS(goBack)();
            } else {
                translateY.value = withSpring(0);
                opacity.value = withSpring(1);
            }
        });

    const doubleTapGesture = Gesture.Tap()
        .numberOfTaps(2)
        .onEnd(() => {
            if (scale.value > 1) {
                scale.value = withSpring(1);
                savedScale.value = 1;
            } else {
                scale.value = withSpring(2.5);
                savedScale.value = 2.5;
            }
        });

    const composedGesture = Gesture.Simultaneous(
        pinchGesture,
        Gesture.Race(panGesture, doubleTapGesture)
    );

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [
            { scale: scale.value },
            { translateY: translateY.value },
        ],
    }));

    const backgroundStyle = useAnimatedStyle(() => ({
        backgroundColor: `rgba(0, 0, 0, ${opacity.value})`,
    }));

    const currentPhoto = photos[currentIndex];

    const formatDate = (timestamp: number) => {
        const date = new Date(timestamp);
        return date.toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
        if (viewableItems.length > 0) {
            setCurrentIndex(viewableItems[0].index);
            scale.value = 1;
            savedScale.value = 1;
        }
    }).current;

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#7C3AED" />
            </View>
        );
    }

    return (
        <Animated.View style={[styles.container, backgroundStyle]}>
            <View style={[styles.header, { paddingTop: insets.top }]}>
                <TouchableOpacity style={styles.backButton} onPress={goBack}>
                    <Text style={styles.backText}>✕</Text>
                </TouchableOpacity>
                <Text style={styles.counter}>
                    {currentIndex + 1} / {photos.length}
                </Text>
                <View style={styles.placeholder} />
            </View>

            <GestureDetector gesture={composedGesture}>
                <Animated.View style={[styles.imageContainer, animatedStyle]}>
                    <FlatList
                        ref={flatListRef}
                        data={photos}
                        horizontal
                        pagingEnabled
                        showsHorizontalScrollIndicator={false}
                        keyExtractor={(item) => item.id}
                        onViewableItemsChanged={onViewableItemsChanged}
                        viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
                        getItemLayout={(_, index) => ({
                            length: width,
                            offset: width * index,
                            index,
                        })}
                        renderItem={({ item }) => (
                            <View style={styles.photoWrapper}>
                                <AnimatedImage
                                    source={{ uri: item.uri }}
                                    style={styles.fullImage}
                                    contentFit="contain"
                                    sharedTransitionTag={`image-${item.id}`}
                                />
                            </View>
                        )}
                    />
                </Animated.View>
            </GestureDetector>

            {currentPhoto && (
                <View style={[styles.infoBar, { paddingBottom: insets.bottom + 10 }]}>
                    <Text style={styles.filename} numberOfLines={1}>
                        {currentPhoto.filename}
                    </Text>
                    <Text style={styles.details}>
                        {currentPhoto.width} × {currentPhoto.height} • {formatDate(currentPhoto.creationTime)}
                    </Text>
                </View>
            )}
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    loadingContainer: {
        flex: 1,
        backgroundColor: '#000',
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 15,
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.15)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    backText: {
        color: '#fff',
        fontSize: 20,
        fontWeight: '300',
    },
    counter: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '500',
    },
    placeholder: {
        width: 44,
    },
    imageContainer: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
    photoWrapper: {
        width,
        height,
        justifyContent: 'center',
        alignItems: 'center',
    },
    fullImage: {
        width: width,
        height: height * 0.8,
    },
    infoBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 20,
        paddingTop: 15,
    },
    filename: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 5,
    },
    details: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 13,
    },
});
