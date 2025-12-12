import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
    ActionSheetIOS,
    Alert,
    Dimensions,
    NativeScrollEvent,
    NativeSyntheticEvent,
    Platform,
    RefreshControl,
    ScrollView,
    Share,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { addFavorite, isFavorite, removeFavorite } from '../services/favorites';
import { setStoredPhotos } from '../services/photoStore';
// import FullScreenGallery from './FullScreenGallery'; // Remove this

const AnimatedImage = Animated.createAnimatedComponent(Image) as any;

const { width } = Dimensions.get('window');
const COLUMN_GAP = 10;
const NUM_COLUMNS = 2;
const COLUMN_WIDTH = (width - 40 - COLUMN_GAP) / NUM_COLUMNS;

interface PhotoAsset {
    id: string;
    uri: string;
    width: number;
    height: number;
    exif?: {
        Model?: string | null;
        DeviceModel?: string | null;
        FNumber?: string | null;
        ExposureTime?: string | null;
        ISOSpeedRatings?: string | null;
    };
    thumbnailUri?: string;
}

interface Props {
    photos: PhotoAsset[];
    formatFNumber: (f: string | null | undefined) => string;
    formatExposure: (time: string | null | undefined) => string;
    formatISO: (iso: string | null | undefined) => string;
    showExif?: boolean;
    onLoadMore?: () => void;
    onRefresh?: () => void;
    onDelete?: (photo: PhotoAsset) => void;
    onBatchDelete?: (photos: PhotoAsset[]) => void;
    onSelectionModeChange?: (isSelectionMode: boolean) => void;
    isLoading?: boolean;
    isRefreshing?: boolean;
}

export default function MasonryGrid({ photos, formatFNumber, formatExposure, formatISO, showExif = true, onLoadMore, onRefresh, onDelete, onBatchDelete, onSelectionModeChange, isLoading, isRefreshing = false }: Props) {
    const insets = useSafeAreaInsets();
    const [selectedPhoto, setSelectedPhoto] = useState<PhotoAsset | null>(null);
    const [modalVisible, setModalVisible] = useState(false);
    const isLoadingRef = useRef(false);
    const [selectionMode, setSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const columns = useMemo(() => {
        const left: { photo: PhotoAsset; height: number }[] = [];
        const right: { photo: PhotoAsset; height: number }[] = [];

        photos.forEach((photo, index) => {
            const ratio = photo.height / photo.width || 1.2;
            const h = COLUMN_WIDTH * Math.min(Math.max(ratio, 0.8), 1.8);
            if (index % 2 === 0) {
                left.push({ photo, height: h });
            } else {
                right.push({ photo, height: h });
            }
        });
        return { left, right };
    }, [photos]);

    const openDetail = (photo: PhotoAsset) => {
        if (selectionMode) {
            toggleSelection(photo.id);
            return;
        }
        setStoredPhotos(photos as any[]);
        const index = photos.findIndex(p => p.id === photo.id);
        router.push({
            pathname: '/photo',
            params: {
                index: index.toString(),
                ids: JSON.stringify(photos.map(p => p.id))
            }
        });
    };

    const toggleSelection = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            if (next.size === 0) {
                setSelectionMode(false);
                onSelectionModeChange?.(false);
            }
            return next;
        });
    };

    const enterSelectionMode = (photo: PhotoAsset) => {
        setSelectionMode(true);
        setSelectedIds(new Set([photo.id]));
        onSelectionModeChange?.(true);
    };

    const exitSelectionMode = () => {
        setSelectionMode(false);
        setSelectedIds(new Set());
        onSelectionModeChange?.(false);
    };

    const handleBatchShare = () => {
        const selected = photos.filter(p => selectedIds.has(p.id));
        if (selected.length > 0) {
            Share.share({ url: selected[0].uri });
        }
    };

    const handleBatchDelete = () => {
        const selected = photos.filter(p => selectedIds.has(p.id));
        if (selected.length > 0 && onBatchDelete) {
            Alert.alert(
                '确认删除',
                `确定要删除这 ${selected.length} 张照片吗？`,
                [
                    { text: '取消', style: 'cancel' },
                    {
                        text: '删除',
                        style: 'destructive',
                        onPress: () => {
                            onBatchDelete(selected);
                            exitSelectionMode();
                        },
                    },
                ]
            );
        }
    };

    const handleLongPress = async (photo: PhotoAsset) => {
        const isFav = await isFavorite(photo.id);
        const favOption = isFav ? '取消收藏' : '收藏';
        const options = [favOption, '分享', '删除', '取消'];
        const destructiveIndex = 2;
        const cancelIndex = 3;

        const handleAction = async (buttonIndex: number) => {
            if (buttonIndex === 0) {
                if (isFav) {
                    await removeFavorite(photo.id);
                    Alert.alert('已取消收藏');
                } else {
                    await addFavorite(photo.id, photo.uri);
                    Alert.alert('已收藏');
                }
            } else if (buttonIndex === 1) {
                Share.share({ url: photo.uri });
            } else if (buttonIndex === 2 && onDelete) {
                onDelete(photo);
            }
        };

        if (Platform.OS === 'ios') {
            ActionSheetIOS.showActionSheetWithOptions(
                {
                    options,
                    destructiveButtonIndex: destructiveIndex,
                    cancelButtonIndex: cancelIndex,
                },
                handleAction
            );
        } else {
            Alert.alert(
                '操作',
                '',
                [
                    { text: favOption, onPress: () => handleAction(0) },
                    { text: '分享', onPress: () => handleAction(1) },
                    { text: '删除', style: 'destructive', onPress: () => handleAction(2) },
                    { text: '取消', style: 'cancel' },
                ]
            );
        }
    };

    const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
        const progress = (contentOffset.y + layoutMeasurement.height) / contentSize.height;
        if (progress > 0.7 && onLoadMore && !isLoadingRef.current) {
            isLoadingRef.current = true;
            onLoadMore();
            setTimeout(() => { isLoadingRef.current = false; }, 500);
        }
    }, [onLoadMore]);

    const renderColumn = (items: { photo: PhotoAsset; height: number }[]) => (
        <View style={styles.column}>
            {items.map(({ photo, height }) => {
                const model = photo.exif?.Model || photo.exif?.DeviceModel;
                const isSelected = selectedIds.has(photo.id);
                return (
                    <View key={photo.id} style={[styles.card, { height }]}>
                        <TouchableOpacity
                            activeOpacity={0.9}
                            onPress={() => openDetail(photo)}
                            onLongPress={() => selectionMode ? toggleSelection(photo.id) : enterSelectionMode(photo)}
                            delayLongPress={400}
                            style={styles.cardTouchable}
                        >
                            <AnimatedImage
                                source={{ uri: photo.uri }}
                                style={styles.image}
                                contentFit="cover"
                                recyclingKey={photo.id}
                                sharedTransitionTag={`image-${photo.id}`}
                            />
                            {showExif && model && !selectionMode && (
                                <LinearGradient colors={['transparent', 'rgba(0,0,0,0.7)']} style={styles.cardGradient}>
                                    <Text style={styles.cardModel} numberOfLines={1}>{model}</Text>
                                </LinearGradient>
                            )}
                            {selectionMode && (
                                <View style={[styles.selectionOverlay, isSelected && styles.selectionOverlayActive]}>
                                    <View style={[styles.checkbox, isSelected && styles.checkboxActive]}>
                                        {isSelected && <Ionicons name="checkmark" size={16} color="#fff" />}
                                    </View>
                                </View>
                            )}
                        </TouchableOpacity>
                    </View>
                );
            })}
        </View>
    );

    return (
        <View style={styles.container}>
            <ScrollView
                contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 10, paddingBottom: insets.bottom + 100 }]}
                showsVerticalScrollIndicator={false}
                onScroll={handleScroll}
                scrollEventThrottle={16}
                removeClippedSubviews={true}
                refreshControl={
                    onRefresh ? (
                        <RefreshControl
                            refreshing={isRefreshing}
                            onRefresh={onRefresh}
                            tintColor="#fff"
                            colors={['#fff']}
                            progressBackgroundColor="#333"
                        />
                    ) : undefined
                }
            >
                <View style={styles.columnsContainer}>
                    {renderColumn(columns.left)}
                    {renderColumn(columns.right)}
                </View>
            </ScrollView>



            {selectionMode && (
                <BlurView intensity={80} tint="dark" style={[styles.selectionToolbar, { paddingBottom: insets.bottom + 20 }]}>
                    <TouchableOpacity style={styles.toolbarBtn} onPress={exitSelectionMode}>
                        <Ionicons name="close-circle" size={28} color="rgba(255,255,255,0.7)" />
                        <Text style={styles.toolbarText}>取消</Text>
                    </TouchableOpacity>
                    <View style={{ alignItems: 'center' }}>
                        <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>
                            已选择 {selectedIds.size} 张
                        </Text>
                    </View>
                    <TouchableOpacity style={styles.toolbarBtn} onPress={handleBatchShare}>
                        <Ionicons name="share-outline" size={28} color="rgba(255,255,255,0.7)" />
                        <Text style={styles.toolbarText}>分享</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.toolbarBtn} onPress={handleBatchDelete}>
                        <Ionicons name="trash-outline" size={28} color="#f87171" />
                        <Text style={styles.toolbarTextDanger}>删除</Text>
                    </TouchableOpacity>
                </BlurView>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    scrollContent: {
        paddingHorizontal: 20,
    },
    columnsContainer: {
        flexDirection: 'row',
        gap: COLUMN_GAP,
    },
    column: {
        flex: 1,
    },
    card: {
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: '#1a1a1a',
        marginBottom: COLUMN_GAP,
    },
    cardTouchable: {
        flex: 1,
    },
    image: {
        width: '100%',
        height: '100%',
    },
    cardGradient: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 10,
        paddingTop: 25,
    },
    cardModel: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '600',
    },
    modalContainer: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.95)',
        justifyContent: 'center',
    },
    modalClose: {
        position: 'absolute',
        top: 50,
        right: 20,
        zIndex: 10,
        padding: 10,
    },
    closeText: {
        color: '#fff',
        fontSize: 24,
    },
    modalImage: {
        width: '100%',
        height: '70%',
    },
    modalInfo: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 20,
        alignItems: 'center',
    },
    modalDevice: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 10,
    },
    paramRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    paramText: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 14,
    },
    paramDivider: {
        color: 'rgba(255,255,255,0.3)',
        marginHorizontal: 10,
    },
    loadingFooter: {
        paddingVertical: 20,
        alignItems: 'center',
    },
    loadingText: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 14,
    },
    selectionOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.1)',
        justifyContent: 'flex-start',
        alignItems: 'flex-end',
        padding: 8,
    },
    selectionOverlayActive: {
        backgroundColor: 'rgba(99,102,241,0.2)',
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.6)',
        backgroundColor: 'rgba(0,0,0,0.3)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkboxActive: {
        backgroundColor: '#6366f1',
        borderColor: '#6366f1',
    },
    selectionToolbar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingVertical: 16,
    },
    toolbarBtn: {
        alignItems: 'center',
        gap: 4,
    },
    toolbarText: {
        color: '#fff',
        fontSize: 12,
    },
    toolbarTextDanger: {
        color: '#f87171',
        fontSize: 12,
    },
});
