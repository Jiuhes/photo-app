import FavoritesPage from '@/components/FavoritesPage';
import GestureTutorial from '@/components/GestureTutorial';
import GroupedPhotos from '@/components/GroupedPhotos';
import MasonryGrid from '@/components/MasonryGrid';
import PerformanceMonitor from '@/components/PerformanceMonitor';
import SkeletonLoader from '@/components/SkeletonLoader';
import SlideshowMode from '@/components/SlideshowMode';
import TinderCards from '@/components/TinderCards';
import { exportBackup } from '@/services/backup';
import { setStoredPhotos } from '@/services/photoStore';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { deleteAsync, documentDirectory, getInfoAsync, readAsStringAsync, writeAsStringAsync } from 'expo-file-system/legacy';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';

import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    UIManager,
    View
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
    Easing,
    LinearTransition,
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withRepeat,
    withTiming
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';


type ViewMode = 'masonry' | 'tinder' | 'grouped';

interface ExifData {
    Model?: string | null;
    DeviceModel?: string | null;
    FNumber?: string | null;
    ExposureTime?: string | null;
    ISOSpeedRatings?: string | null;
}

interface PhotoAsset extends MediaLibrary.Asset {
    exif?: ExifData;
    thumbnailUri?: string;
}

interface AppSettings {
    lastAlbumId?: string | null;
    lastViewMode?: ViewMode;
    sortMode?: 'time' | 'random';
    showExif?: boolean;

    photoCount?: number;
    showPerfMonitor?: boolean;
    openLastAlbum?: boolean;
}

const { width, height } = Dimensions.get('window');
const GRID_SIZE = 2;
const PHOTO_SIZE = (width - 60) / GRID_SIZE;

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function RandomPhotoScreen() {
    const insets = useSafeAreaInsets();
    const [allAssets, setAllAssets] = useState<MediaLibrary.Asset[]>([]);
    const [randomPhotos, setRandomPhotos] = useState<PhotoAsset[]>([]);
    const [selectedPhoto, setSelectedPhoto] = useState<PhotoAsset | null>(null);
    const [loading, setLoading] = useState(true);
    const [scanning, setScanning] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('准备中...');
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [isFallbackMode, setIsFallbackMode] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [viewMode, setViewMode] = useState<ViewMode>('masonry');
    const [albums, setAlbums] = useState<MediaLibrary.Album[]>([]);
    const [albumCovers, setAlbumCovers] = useState<Record<string, string>>({});
    const [selectedAlbum, setSelectedAlbum] = useState<MediaLibrary.Album | null>(null);
    const [usedIds, setUsedIds] = useState<Set<string>>(new Set());
    const loadingMoreRef = useRef(false);
    const exifCacheRef = useRef<Map<string, ExifData>>(new Map());
    const scanRequestId = useRef(0);
    const [sortMode, setSortMode] = useState<'time' | 'random'>('time');
    const [pageNumber, setPageNumber] = useState(0);

    // Settings
    const [settings, setSettings] = useState<AppSettings>({
        showExif: true,
        photoCount: 50,
        openLastAlbum: false,
    });
    const [showSettings, setShowSettings] = useState(false);
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [showFavorites, setShowFavorites] = useState(false);
    const [showSlideshow, setShowSlideshow] = useState(false);
    const [showPerfMonitor, setShowPerfMonitor] = useState(false);
    const [islandMode, setIslandMode] = useState<'compact' | 'expanded' | 'albums'>('compact');

    const loadSettings = async () => {
        try {
            const SETTINGS_FILE = documentDirectory + 'app_settings.json';
            const info = await getInfoAsync(SETTINGS_FILE);
            if (info.exists) {
                const content = await readAsStringAsync(SETTINGS_FILE);
                const loaded = JSON.parse(content);
                setSettings(prev => ({ ...prev, ...loaded }));

                if (loaded.sortMode) {
                    setSortMode(loaded.sortMode);
                }

                // Apply ViewMode immediately
                if (loaded.lastViewMode) {
                    setViewMode(loaded.lastViewMode);
                }

                if (loaded.showPerfMonitor) {
                    setShowPerfMonitor(loaded.showPerfMonitor);
                }
            }
        } catch (e) {
            console.log('Load settings failed', e);
        }
    };

    const saveSettings = async (newSettings: Partial<AppSettings>) => {
        try {
            const SETTINGS_FILE = documentDirectory + 'app_settings.json';
            const current = await getInfoAsync(SETTINGS_FILE).then((info: any) =>
                info.exists ? readAsStringAsync(SETTINGS_FILE).then(JSON.parse) : {}
            ).catch(() => ({}));

            const merged = { ...current, ...newSettings };
            await writeAsStringAsync(SETTINGS_FILE, JSON.stringify(merged));
            setSettings(prev => ({ ...prev, ...merged }));
        } catch (e) {
            console.log('Save settings failed', e);
        }
    };

    const opacity = useSharedValue(1);
    const refreshRotation = useSharedValue(0);

    const refreshStyle = useAnimatedStyle(() => {
        return {
            transform: [{ rotate: `${refreshRotation.value}deg` }],
        };
    });



    const islandY = useSharedValue(100);

    const islandAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: islandY.value }],
    }));

    const toggleIslandExpand = () => {
        setIslandMode(prev => prev === 'compact' ? 'expanded' : 'compact');
    };

    const handleRefresh = () => {
        refreshRotation.value = withRepeat(withTiming(360, { duration: 1000, easing: Easing.linear }), -1);

        setTimeout(() => {
            clearAndReload();
            refreshRotation.value = 0;
        }, 500);
    };

    useEffect(() => {
        islandY.value = withDelay(300, withTiming(0, { duration: 350, easing: Easing.out(Easing.cubic) }));

        loadSettings();
        checkPermissions();
    }, []);

    // Apply saved album choice when albums are ready
    useEffect(() => {
        if (settings.openLastAlbum && settings.lastAlbumId && albums.length > 0 && !selectedAlbum) {
            const target = albums.find(a => a.id === settings.lastAlbumId);
            if (target) {
                setSelectedAlbum(target);
                scanAllPhotos(target); // Assuming scanAllPhotos can take album
            }
        }
    }, [albums, settings.lastAlbumId, settings.openLastAlbum]);

    const checkPermissions = async () => {
        if (Platform.OS === 'web') {
            setLoading(false);
            setErrorMsg('Web 版不支持');
            return;
        }

        try {
            const { status } = await MediaLibrary.requestPermissionsAsync();
            if (status === 'granted') {
                scanAllPhotos();
            } else {
                setLoading(false);
                setErrorMsg('无法自动扫描相册');
                setIsFallbackMode(true);
            }
        } catch (e) {
            setLoading(false);
            setErrorMsg('无法访问媒体库 (Expo Go 限制)');
            setIsFallbackMode(true);
        }
    };

    const pickPhotosFallback = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsMultipleSelection: true,
                quality: 1,
                exif: true,
            });

            if (!result.canceled && result.assets.length > 0) {
                const mappedAssets: PhotoAsset[] = result.assets.map(asset => ({
                    id: asset.assetId || asset.uri,
                    uri: asset.uri,
                    exif: asset.exif as ExifData,
                    filename: asset.fileName || 'unknown',
                    width: asset.width,
                    height: asset.height,
                    creationTime: 0,
                    modificationTime: 0,
                    duration: 0,
                    mediaType: MediaLibrary.MediaType.photo,
                }));

                setAllAssets(mappedAssets);
                setRandomPhotos(mappedAssets.slice(0, settings.photoCount || 50));
                setErrorMsg(null);
                setIsFallbackMode(false);
                setLoading(false);
            }
        } catch (e) {
            console.error(e);
            setErrorMsg('选择照片失败');
        }
    };

    const scanAllPhotos = async (album?: MediaLibrary.Album | null) => {
        const currentScanId = ++scanRequestId.current;
        setScanning(true);
        setLoadingMessage('正在扫描相册...');

        try {
            // Only scan albums if we don't have them yet or if forcing refresh
            if (albums.length === 0) {
                const albumList = await MediaLibrary.getAlbumsAsync();

                // If scanned a new request in between, ignore setting albums? 
                // No, albums list is global and valid regardless, keeping it is fine.
                if (currentScanId === scanRequestId.current) {
                    setAlbums(albumList);
                } else {
                    // But if we are aborted, maybe we shouldn't set state? 
                    // Set albums is safe.
                    setAlbums(albumList);
                }

                const covers: Record<string, string> = {};
                for (const a of albumList.slice(0, 30)) {
                    try {
                        const { assets: coverAssets } = await MediaLibrary.getAssetsAsync({
                            album: a,
                            first: 1,
                            mediaType: MediaLibrary.MediaType.photo,
                            sortBy: MediaLibrary.SortBy.creationTime,
                        });
                        if (coverAssets.length > 0) {
                            covers[a.id] = coverAssets[0].uri;
                        }
                    } catch { }
                }
                if (currentScanId === scanRequestId.current) {
                    setAlbumCovers(covers);
                }
            }

            let assets: MediaLibrary.Asset[] = [];
            let hasNextPage = true;
            let after: MediaLibrary.AssetRef | undefined;

            while (hasNextPage) {
                if (currentScanId !== scanRequestId.current) break; // Abort if new scan started

                const query: MediaLibrary.AssetsOptions = {
                    first: 500,
                    after,
                    mediaType: MediaLibrary.MediaType.photo,
                    sortBy: MediaLibrary.SortBy.creationTime,
                };
                if (album) {
                    query.album = album;
                }
                const { assets: pageAssets, hasNextPage: pageHasNext, endCursor } = await MediaLibrary.getAssetsAsync(query);

                assets = [...assets, ...pageAssets];
                hasNextPage = pageHasNext;
                after = endCursor;
                setLoadingMessage(`已发现 ${assets.length} 张照片...`);

                if (assets.length > 3000) hasNextPage = false;
            }

            // Final check before committing
            if (currentScanId !== scanRequestId.current) return;

            setAllAssets(assets);
            setScanning(false);

            if (assets.length > 0) {
                // Initial load
                // We need to wait for state update of allAssets if we use it inside pickPhotos, but we pass assets directly
                pickPhotos(assets, true, sortMode);
            } else {
                setLoading(false);
                setErrorMsg('相册中没有找到照片');
            }
        } catch (e) {
            if (currentScanId !== scanRequestId.current) return;
            console.error(e);
            setScanning(false);
            setLoading(false);
            setErrorMsg('扫描相册失败');
            setIsFallbackMode(true);
        }
    };

    const selectAlbum = async (album: MediaLibrary.Album | null) => {
        const currentScanId = ++scanRequestId.current;
        setSelectedAlbum(album);
        setIslandMode('compact');
        saveSettings({ lastAlbumId: album ? album.id : null });
        setRandomPhotos([]);
        setUsedIds(new Set());

        // Use setLoading(true) to trigger SkeletonLoader, NOT setScanning(true)
        setLoading(true);

        try {
            let assets: MediaLibrary.Asset[] = [];
            let hasNextPage = true;
            let after: MediaLibrary.AssetRef | undefined;

            while (hasNextPage) {
                if (currentScanId !== scanRequestId.current) break;

                const query: MediaLibrary.AssetsOptions = {
                    first: 500,
                    after,
                    mediaType: MediaLibrary.MediaType.photo,
                    sortBy: MediaLibrary.SortBy.creationTime,
                };
                if (album) {
                    query.album = album;
                }
                const { assets: pageAssets, hasNextPage: pageHasNext, endCursor } = await MediaLibrary.getAssetsAsync(query);

                assets = [...assets, ...pageAssets];
                hasNextPage = pageHasNext;
                after = endCursor;
                // No scanning message update here to avoid full screen loader text change

                if (assets.length > 3000) hasNextPage = false;
            }

            if (currentScanId !== scanRequestId.current) return;

            setAllAssets(assets);

            if (assets.length > 0) {
                pickPhotos(assets, true, sortMode);
            } else {
                setLoading(false);
                // Maybe show empty state toast?
            }
        } catch (e) {
            if (currentScanId === scanRequestId.current) {
                setLoading(false);
            }
            console.error("Failed to load album", e);
        }
    };

    const pickPhotos = async (assets: MediaLibrary.Asset[] = allAssets, reset: boolean = false, currentSortMode: 'time' | 'random' = sortMode) => {
        if (assets.length === 0) return;

        const isLoadMore = !reset && randomPhotos.length > 0;

        // If switching sort mode (implied by reset=true usually), we might want to reset pageNumber
        let nextPage = pageNumber;
        if (reset) {
            nextPage = 0;
            setPageNumber(0);
        }

        if (!isLoadMore) {
            setLoading(true);
            setLoadingMessage(currentSortMode === 'random' ? '随机抽取中...' : '加载中...');
            opacity.value = withTiming(0, { duration: 200 });
        }

        let picked: PhotoAsset[] = [];

        const count = settings.photoCount || 50;
        if (currentSortMode === 'time') {
            const start = nextPage * count;
            const end = start + count;
            const candidates = assets.slice(start, end);
            picked = candidates.map(c => ({ ...c, thumbnailUri: c.uri, exif: {} as ExifData }));
            if (picked.length > 0) {
                setPageNumber(nextPage + 1);
            }
        } else {
            const currentUsedIds = reset ? new Set<string>() : new Set(usedIds);
            let attempts = 0;
            const maxAttempts = assets.length * 2;

            while (picked.length < count && attempts < maxAttempts) {
                attempts++;
                const randomIndex = Math.floor(Math.random() * assets.length);
                const candidate = assets[randomIndex];
                if (currentUsedIds.has(candidate.id)) continue;
                currentUsedIds.add(candidate.id);
                picked.push({ ...candidate, thumbnailUri: candidate.uri, exif: {} as ExifData });
            }
            setUsedIds(currentUsedIds);
        }

        if (isLoadMore) {
            setRandomPhotos(prev => [...prev, ...picked]);
        } else {
            setRandomPhotos(picked);
            setLoading(false);
            opacity.value = withTiming(1, { duration: 500 });
        }

        loadExifInBackground(picked);
    };

    const loadExifInBackground = async (photos: PhotoAsset[]) => {
        const BATCH_SIZE = 5;
        for (let i = 0; i < photos.length; i += BATCH_SIZE) {
            const batch = photos.slice(i, i + BATCH_SIZE).filter(p => !exifCacheRef.current.has(p.id));
            if (batch.length === 0) continue;

            const results = await Promise.all(
                batch.map(async (photo) => {
                    try {
                        const info = await MediaLibrary.getAssetInfoAsync(photo.id);
                        const exif = (info.exif || {}) as ExifData;
                        return { id: photo.id, exif };
                    } catch {
                        return null;
                    }
                })
            );

            const valid = results.filter(r => r !== null) as { id: string; exif: ExifData }[];
            valid.forEach(r => exifCacheRef.current.set(r.id, r.exif));

            if (valid.length > 0) {
                setRandomPhotos(prev => prev.map(p => {
                    const found = valid.find(r => r.id === p.id);
                    return found ? { ...p, exif: found.exif } : p;
                }));
            }

            await new Promise(resolve => setTimeout(resolve, 100));
        }
    };

    const clearAndReload = () => {
        setRandomPhotos([]);
        setUsedIds(new Set());
        setPageNumber(0);
        // Reload with current sort mode
        pickPhotos(allAssets, true, sortMode);
    };

    const openPhotoDetail = (photo: PhotoAsset) => {
        setSelectedPhoto(photo);
        setModalVisible(true);
    };

    const formatExposure = (time: string | null | undefined) => {
        if (!time) return '--';
        const t = parseFloat(time);
        return t < 1 ? `1/${Math.round(1 / t)}` : `${t}s`;
    };

    const formatFNumber = (f: string | null | undefined) => f ? `f/${parseFloat(f).toFixed(1)}` : '--';
    const formatISO = (iso: string | null | undefined) => iso ? `ISO ${iso}` : '--';

    const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

    if (errorMsg) {
        return (
            <View style={styles.centerContainer}>
                <Ionicons name="warning" size={80} color="#ff9800" />
                <Text style={styles.errorText}>{errorMsg}</Text>
                {isFallbackMode && (
                    <TouchableOpacity style={[styles.button, { backgroundColor: '#333', marginBottom: 15 }]} onPress={pickPhotosFallback}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Ionicons name="folder-open" size={18} color="#fff" />
                            <Text style={styles.buttonText}>选择图库</Text>
                        </View>
                    </TouchableOpacity>
                )}
                <TouchableOpacity style={styles.button} onPress={() => { setErrorMsg(null); checkPermissions(); }}>
                    <Text style={styles.buttonText}>重试</Text>
                </TouchableOpacity>
            </View>
        );
    }

    if (scanning) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#fff" />
                <Text style={styles.loadingText}>{loadingMessage}</Text>
            </View>
        );
    }

    const modeButtons: { mode: ViewMode; icon: string; label: string }[] = [
        { mode: 'masonry', icon: 'grid', label: '瀑布' },
        { mode: 'tinder', icon: 'layers', label: '卡片' },
        { mode: 'grouped', icon: 'calendar', label: '分组' },
    ];

    const islandGesture = Gesture.Pan()
        .activeOffsetY([-20, 20]) // Require explicit vertical movement to start
        .failOffsetX([-15, 15])   // Fail if horizontal movement is detected first
        .onUpdate((e) => {
            islandY.value = e.translationY * 0.15;
        })
        .onEnd((e) => {
            if (e.translationY < -30 && islandMode === 'compact') {
                runOnJS(setIslandMode)('albums');
            } else if (e.translationY > 30 && islandMode !== 'compact') {
                runOnJS(setIslandMode)('compact');
            }
            islandY.value = withTiming(0, { duration: 200, easing: Easing.out(Easing.cubic) });
        });

    const switchMode = (mode: ViewMode) => {
        if (viewMode !== mode) {
            setViewMode(mode);
            saveSettings({ lastViewMode: mode });
        }
    };


    const renderContent = () => {
        if (loading) {
            return (
                <View style={{ paddingTop: insets.top + 10 }}>
                    <SkeletonLoader count={10} />
                </View>
            );
        }

        switch (viewMode) {
            case 'tinder':
                return (
                    <TinderCards
                        photos={randomPhotos}
                        formatFNumber={formatFNumber}
                        formatExposure={formatExposure}
                        formatISO={formatISO}
                        onLoadMore={() => {
                            if (!loadingMoreRef.current && allAssets.length > 0) {
                                loadingMoreRef.current = true;
                                pickPhotos(allAssets, false, sortMode).finally(() => { loadingMoreRef.current = false; });
                            }
                        }}
                        isLoading={false}
                    />
                );
            default:
                return (
                    <MasonryGrid
                        photos={randomPhotos}
                        formatFNumber={formatFNumber}
                        formatExposure={formatExposure}
                        formatISO={formatISO}
                        showExif={settings.showExif !== false}
                        onLoadMore={() => {
                            if (!loadingMoreRef.current && allAssets.length > 0) {
                                loadingMoreRef.current = true;
                                pickPhotos(allAssets, false, sortMode).finally(() => { loadingMoreRef.current = false; });
                            }
                        }}
                        onRefresh={clearAndReload}
                        onSelectionModeChange={setIsSelectionMode}
                        isLoading={false}
                        isRefreshing={loading}
                    />
                );
            case 'grouped':
                return (
                    <GroupedPhotos
                        photos={randomPhotos}
                        onPhotoPress={(photo) => {
                            setStoredPhotos(randomPhotos as any[]);
                            const index = randomPhotos.findIndex(p => p.id === photo.id);
                            router.push({
                                pathname: '/photo',
                                params: {
                                    index: index.toString(),
                                    ids: JSON.stringify(randomPhotos.map(p => p.id))
                                }
                            });
                        }}
                    />
                );
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar style="light" />

            {renderContent()}

            <GestureTutorial onComplete={() => { }} />

            <PerformanceMonitor visible={showPerfMonitor} />

            {!isSelectionMode && (
                <Animated.View
                    style={[
                        styles.dynamicIsland,
                        { bottom: insets.bottom + 20 },
                        islandAnimatedStyle,
                        islandMode !== 'compact' && { width: width - 40 }
                    ]}
                    layout={LinearTransition.duration(300).easing(Easing.out(Easing.cubic))}
                >
                    <View style={styles.islandOuterGlow} />
                    <View style={styles.islandInnerGlow} />
                    <BlurView intensity={70} tint="dark" style={[styles.islandBlur, islandMode !== 'compact' && styles.islandBlurExpanded]}>
                        <GestureDetector gesture={islandGesture}>
                            <View style={islandMode !== 'compact' ? styles.islandContentExpanded : styles.islandContent}>
                                {islandMode === 'compact' ? (
                                    <>
                                        <View style={styles.modeSection}>
                                            <View style={styles.modePill}>
                                                {modeButtons.map((btn) => (
                                                    <TouchableOpacity
                                                        key={btn.mode}
                                                        style={[
                                                            styles.modeItem,
                                                            viewMode === btn.mode && styles.modeItemActive
                                                        ]}
                                                        onPress={() => switchMode(btn.mode)}
                                                        activeOpacity={0.7}
                                                    >
                                                        <Ionicons
                                                            name={btn.icon as any}
                                                            size={15}
                                                            color={viewMode === btn.mode ? '#fff' : 'rgba(255,255,255,0.35)'}
                                                        />
                                                    </TouchableOpacity>
                                                ))}
                                            </View>
                                        </View>

                                        <View style={styles.centerSection}>
                                            <View style={styles.sortPill}>
                                                <TouchableOpacity
                                                    style={[styles.sortItem, sortMode === 'time' && styles.sortItemActive]}
                                                    onPress={() => {
                                                        if (sortMode !== 'time') {
                                                            setSortMode('time');
                                                            saveSettings({ sortMode: 'time' });
                                                            setRandomPhotos([]);
                                                            setPageNumber(0);
                                                            setTimeout(() => pickPhotos(allAssets, true, 'time'), 50);
                                                        }
                                                    }}
                                                    activeOpacity={0.7}
                                                >
                                                    <Ionicons name="time-outline" size={13} color={sortMode === 'time' ? '#fff' : 'rgba(255,255,255,0.35)'} />
                                                </TouchableOpacity>
                                                <View style={styles.sortDivider} />
                                                <TouchableOpacity
                                                    style={[styles.sortItem, sortMode === 'random' && styles.sortItemActive]}
                                                    onPress={() => {
                                                        if (sortMode !== 'random') {
                                                            setSortMode('random');
                                                            saveSettings({ sortMode: 'random' });
                                                            setRandomPhotos([]);
                                                            setUsedIds(new Set());
                                                            setTimeout(() => pickPhotos(allAssets, true, 'random'), 50);
                                                        }
                                                    }}
                                                    activeOpacity={0.7}
                                                >
                                                    <Ionicons name="shuffle-outline" size={13} color={sortMode === 'random' ? '#fff' : 'rgba(255,255,255,0.35)'} />
                                                </TouchableOpacity>
                                            </View>
                                        </View>

                                        <View style={styles.actionSection}>
                                            <TouchableOpacity style={styles.actionBtn} onPress={handleRefresh} activeOpacity={0.6}>
                                                <Animated.View style={refreshStyle}>
                                                    <Ionicons name="refresh" size={17} color="rgba(255,255,255,0.85)" />
                                                </Animated.View>
                                            </TouchableOpacity>

                                            <TouchableOpacity
                                                style={[styles.actionBtn, styles.actionBtnHighlight]}
                                                onPress={() => setIslandMode('albums')}
                                                activeOpacity={0.6}
                                            >
                                                <Ionicons name="folder-open" size={17} color="rgba(255,255,255,0.85)" />
                                            </TouchableOpacity>

                                            <TouchableOpacity style={styles.actionBtn} onPress={toggleIslandExpand} activeOpacity={0.6}>
                                                <Ionicons name="apps" size={17} color="rgba(255,255,255,0.85)" />
                                            </TouchableOpacity>
                                        </View>
                                    </>
                                ) : (
                                    <View style={styles.expandedContent}>
                                        <View style={styles.expandedHeader}>
                                            <Text style={styles.expandedTitle}>{islandMode === 'albums' ? '切换相册' : '控制中心'}</Text>
                                            <TouchableOpacity style={styles.expandedCloseBtn} onPress={() => setIslandMode('compact')}>
                                                <Ionicons name="close" size={18} color="rgba(255,255,255,0.6)" />
                                            </TouchableOpacity>
                                        </View>

                                        {islandMode === 'expanded' ? (
                                            <View style={{ gap: 12 }}>
                                                {/* Main Action Row */}
                                                <View style={styles.expandedRow}>
                                                    <TouchableOpacity
                                                        style={[styles.expandedQuickBtn, { backgroundColor: 'rgba(255, 107, 129, 0.15)' }]}
                                                        onPress={() => { setIslandMode('compact'); setShowFavorites(true); }}
                                                    >
                                                        <View style={[styles.expandedQuickIcon, { backgroundColor: 'rgba(255, 107, 129, 0.3)' }]}>
                                                            <Ionicons name="heart" size={20} color="#ff6b81" />
                                                        </View>
                                                        <Text style={styles.expandedQuickLabel}>收藏</Text>
                                                    </TouchableOpacity>

                                                    <TouchableOpacity
                                                        style={[styles.expandedQuickBtn, { backgroundColor: 'rgba(102, 126, 234, 0.15)' }]}
                                                        onPress={() => { setIslandMode('compact'); setShowSlideshow(true); }}
                                                    >
                                                        <View style={[styles.expandedQuickIcon, { backgroundColor: 'rgba(102, 126, 234, 0.3)' }]}>
                                                            <Ionicons name="play-circle" size={20} color="#667eea" />
                                                        </View>
                                                        <Text style={styles.expandedQuickLabel}>幻灯片</Text>
                                                    </TouchableOpacity>

                                                    <TouchableOpacity
                                                        style={[styles.expandedQuickBtn, { backgroundColor: 'rgba(99, 102, 241, 0.15)' }]}
                                                        onPress={() => { setIslandMode('compact'); setShowSettings(true); }}
                                                    >
                                                        <View style={[styles.expandedQuickIcon, { backgroundColor: 'rgba(99, 102, 241, 0.3)' }]}>
                                                            <Ionicons name="settings" size={20} color="#6366f1" />
                                                        </View>
                                                        <Text style={styles.expandedQuickLabel}>设置</Text>
                                                    </TouchableOpacity>
                                                </View>

                                                {/* Toggles Row */}
                                                <View style={styles.expandedRow}>
                                                    <TouchableOpacity
                                                        style={[styles.expandedToggleBtn, settings.showExif && styles.expandedToggleBtnActive]}
                                                        onPress={() => {
                                                            const newVal = !settings.showExif;
                                                            setSettings(s => ({ ...s, showExif: newVal }));
                                                            saveSettings({ showExif: newVal });
                                                        }}
                                                    >
                                                        <Ionicons name="camera" size={16} color={settings.showExif ? '#fff' : 'rgba(255,255,255,0.5)'} />
                                                        <Text style={[styles.expandedToggleLabel, settings.showExif && styles.expandedToggleLabelActive]}>参数</Text>
                                                    </TouchableOpacity>

                                                    <TouchableOpacity
                                                        style={[styles.expandedToggleBtn, showPerfMonitor && styles.expandedToggleBtnActive]}
                                                        onPress={() => {
                                                            const newVal = !showPerfMonitor;
                                                            setShowPerfMonitor(newVal);
                                                            saveSettings({ showPerfMonitor: newVal });
                                                        }}
                                                    >
                                                        <Ionicons name="speedometer" size={16} color={showPerfMonitor ? '#fff' : 'rgba(255,255,255,0.5)'} />
                                                        <Text style={[styles.expandedToggleLabel, showPerfMonitor && styles.expandedToggleLabelActive]}>性能</Text>
                                                    </TouchableOpacity>

                                                    <TouchableOpacity
                                                        style={[styles.expandedToggleBtn, settings.openLastAlbum && styles.expandedToggleBtnActive]}
                                                        onPress={() => {
                                                            const newVal = !settings.openLastAlbum;
                                                            setSettings(s => ({ ...s, openLastAlbum: newVal }));
                                                            saveSettings({ openLastAlbum: newVal });
                                                        }}
                                                    >
                                                        <Ionicons name="albums" size={16} color={settings.openLastAlbum ? '#fff' : 'rgba(255,255,255,0.5)'} />
                                                        <Text style={[styles.expandedToggleLabel, settings.openLastAlbum && styles.expandedToggleLabelActive]}>记忆</Text>
                                                    </TouchableOpacity>
                                                </View>
                                            </View>

                                        ) : (
                                            <View style={{ flex: 1 }} onStartShouldSetResponder={() => true}>
                                                <ScrollView
                                                    horizontal
                                                    showsHorizontalScrollIndicator={false}
                                                    contentContainerStyle={{ gap: 12, paddingHorizontal: 4, paddingBottom: 4 }}
                                                >
                                                    <TouchableOpacity
                                                        style={styles.islandAlbumItem}
                                                        onPress={() => selectAlbum(null)}
                                                        activeOpacity={0.7}
                                                    >
                                                        <View style={[styles.islandAlbumCover, !selectedAlbum && styles.islandAlbumCoverSelected]}>
                                                            {allAssets[0] ? (
                                                                <Image
                                                                    source={{ uri: allAssets[0].uri }}
                                                                    style={{ width: '100%', height: '100%' }}
                                                                    contentFit="cover"
                                                                />
                                                            ) : (
                                                                <Ionicons name="images" size={22} color="rgba(255,255,255,0.5)" />
                                                            )}
                                                        </View>
                                                        <Text style={[styles.islandAlbumName, !selectedAlbum && styles.islandAlbumNameActive]} numberOfLines={1}>
                                                            全部
                                                        </Text>
                                                    </TouchableOpacity>

                                                    {albums.filter(a => a.assetCount > 0).slice(0, 15).map((album) => (
                                                        <TouchableOpacity
                                                            key={album.id}
                                                            style={styles.islandAlbumItem}
                                                            onPress={() => selectAlbum(album)}
                                                            activeOpacity={0.7}
                                                        >
                                                            <View style={[styles.islandAlbumCover, selectedAlbum?.id === album.id && styles.islandAlbumCoverSelected]}>
                                                                {albumCovers[album.id] ? (
                                                                    <Image
                                                                        source={{ uri: albumCovers[album.id] }}
                                                                        style={{ width: '100%', height: '100%' }}
                                                                        contentFit="cover"
                                                                    />
                                                                ) : (
                                                                    <Ionicons name="folder" size={22} color="rgba(255,255,255,0.5)" />
                                                                )}
                                                            </View>
                                                            <Text style={[styles.islandAlbumName, selectedAlbum?.id === album.id && styles.islandAlbumNameActive]} numberOfLines={1}>
                                                                {album.title}
                                                            </Text>
                                                        </TouchableOpacity>
                                                    ))}
                                                </ScrollView>
                                            </View>
                                        )}
                                    </View>
                                )}
                            </View>
                        </GestureDetector>
                    </BlurView>
                </Animated.View>
            )}

            <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
                <View style={styles.modalContainer}>
                    <TouchableOpacity style={styles.modalClose} onPress={() => setModalVisible(false)}>
                        <Ionicons name="close" size={32} color="#fff" />
                    </TouchableOpacity>

                    {selectedPhoto && (
                        <>
                            <Image source={{ uri: selectedPhoto.uri }} style={styles.modalImage} contentFit="contain" />
                            <BlurView intensity={40} tint="dark" style={[styles.modalInfo, { paddingBottom: insets.bottom + 20 }]}>
                                <Text style={styles.modalModel}>
                                    {selectedPhoto.exif?.Model || selectedPhoto.exif?.DeviceModel || 'Unknown Camera'}
                                </Text>
                                <View style={styles.paramRow}>
                                    <Text style={styles.paramText}>{formatFNumber(selectedPhoto.exif?.FNumber)}</Text>
                                    <Text style={styles.paramDivider}>|</Text>
                                    <Text style={styles.paramText}>{formatExposure(selectedPhoto.exif?.ExposureTime)}</Text>
                                    <Text style={styles.paramDivider}>|</Text>
                                    <Text style={styles.paramText}>{formatISO(selectedPhoto.exif?.ISOSpeedRatings)}</Text>
                                </View>
                            </BlurView>
                        </>
                    )}
                </View>
            </Modal>

            <Modal visible={showSettings} transparent animationType="fade" onRequestClose={() => setShowSettings(false)}>
                <BlurView intensity={40} tint="dark" style={styles.settingsOverlay}>
                    <View style={styles.settingsPanel}>
                        <View style={styles.settingsHeader}>
                            <View style={styles.settingsHeaderLeft}>
                                <View style={styles.settingsIconWrap}>
                                    <Ionicons name="settings" size={20} color="#fff" />
                                </View>
                                <Text style={styles.settingsTitle}>设置</Text>
                            </View>
                            <TouchableOpacity
                                style={styles.settingsCloseBtn}
                                onPress={() => setShowSettings(false)}
                            >
                                <Ionicons name="close" size={20} color="rgba(255,255,255,0.6)" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.settingsContent}>
                            {/* Simplified Settings Content */}
                            <View style={styles.settingsSection}>
                                <Text style={styles.settingsSectionTitle}>加载数量</Text>
                                <View style={styles.countSelectorNew}>
                                    {[30, 50, 100].map(n => (
                                        <TouchableOpacity
                                            key={n}
                                            style={[styles.countBtnNew, settings.photoCount === n && styles.countBtnNewActive]}
                                            onPress={() => {
                                                setSettings(s => ({ ...s, photoCount: n }));
                                                saveSettings({ photoCount: n });
                                            }}
                                            activeOpacity={0.7}
                                        >
                                            <Text style={[styles.countTextNew, settings.photoCount === n && styles.countTextNewActive]}>{n}</Text>
                                            <Text style={[styles.countLabelNew, settings.photoCount === n && styles.countLabelNewActive]}>张</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            <View style={styles.settingsSection}>
                                <Text style={styles.settingsSectionTitle}>数据管理</Text>
                                <TouchableOpacity
                                    style={styles.settingsCard}
                                    onPress={async () => {
                                        await exportBackup();
                                    }}
                                    activeOpacity={0.7}
                                    accessibilityRole="button"
                                    accessibilityLabel="导出数据备份"
                                >
                                    <View style={styles.settingsCardLeft}>
                                        <View style={[styles.settingsCardIcon, { backgroundColor: 'rgba(255, 159, 67, 0.2)' }]}>
                                            <Ionicons name="cloud-download" size={18} color="#ff9f43" />
                                        </View>
                                        <View>
                                            <Text style={styles.settingsCardTitle}>导出备份</Text>
                                            <Text style={styles.settingsCardDesc}>备份收藏和设置数据</Text>
                                        </View>
                                    </View>
                                    <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.3)" />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <TouchableOpacity
                            style={styles.dangerBtn}
                            onPress={async () => {
                                try {
                                    const SETTINGS_FILE = documentDirectory + 'app_settings.json';
                                    await deleteAsync(SETTINGS_FILE);
                                    setSettings({ showExif: true, photoCount: 50 });
                                    exifCacheRef.current.clear();
                                    Alert.alert('已重置', '所有缓存和设置已清除');
                                } catch { }
                            }}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="refresh-circle" size={18} color="#ff6b6b" />
                            <Text style={styles.dangerBtnText}>重置所有设置</Text>
                        </TouchableOpacity>
                    </View>
                </BlurView>
            </Modal>



            <FavoritesPage
                visible={showFavorites}
                onClose={() => setShowFavorites(false)}
            />

            <SlideshowMode
                photos={randomPhotos}
                visible={showSlideshow}
                onClose={() => setShowSlideshow(false)}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    centerContainer: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center', padding: 40 },
    emoji: { fontSize: 80, marginBottom: 20 },
    errorText: { color: '#fff', fontSize: 16, textAlign: 'center', marginBottom: 30 },
    loadingText: { color: '#fff', fontSize: 14, marginTop: 20 },
    button: { backgroundColor: '#4CAF50', paddingHorizontal: 30, paddingVertical: 15, borderRadius: 25, marginTop: 10 },
    buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },

    dynamicIsland: {
        position: 'absolute',
        alignSelf: 'center',
        zIndex: 999,
    },
    islandOuterGlow: {
        position: 'absolute',
        top: -3,
        left: -3,
        right: -3,
        bottom: -3,
        borderRadius: 32,
        backgroundColor: 'rgba(255,255,255,0.04)',
    },
    islandInnerGlow: {
        position: 'absolute',
        top: -1,
        left: -1,
        right: -1,
        bottom: -1,
        borderRadius: 28,
        backgroundColor: 'rgba(255,255,255,0.06)',
    },
    islandBlur: {
        borderRadius: 26,
        overflow: 'hidden',
        paddingVertical: 8,
        paddingHorizontal: 10,
        borderWidth: 0.5,
        borderColor: 'rgba(255,255,255,0.12)',
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    islandContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    modeSection: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    modePill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.06)',
        borderRadius: 20,
        padding: 3,
        gap: 2,
    },
    modeItem: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modeItemActive: {
        backgroundColor: 'rgba(255,255,255,0.18)',
        shadowColor: '#fff',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
    },
    centerSection: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    sortPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.06)',
        borderRadius: 14,
        padding: 2,
    },
    sortItem: {
        width: 28,
        height: 28,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sortItemActive: {
        backgroundColor: 'rgba(255,255,255,0.15)',
    },
    sortDivider: {
        width: 1,
        height: 14,
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    actionSection: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    actionBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.06)',
    },
    actionBtnHighlight: {
        backgroundColor: 'rgba(99, 102, 241, 0.25)',
    },
    actionBtnActive: {
        backgroundColor: 'rgba(99, 102, 241, 0.5)',
    },

    islandBlurExpanded: {
        borderRadius: 24,
        padding: 16,
    },
    islandContentExpanded: {
        flex: 1,
    },
    expandedContent: {
        flex: 1,
        gap: 12,
    },
    expandedHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    expandedTitle: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '700',
        letterSpacing: 0.3,
    },
    expandedCloseBtn: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: 'rgba(255,255,255,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    expandedRow: {
        flexDirection: 'row',
        gap: 8,
    },
    expandedCard: {
        flex: 1,
        backgroundColor: 'rgba(255,255,255,0.06)',
        borderRadius: 14,
        padding: 12,
    },
    expandedCardLabel: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 11,
        fontWeight: '600',
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    expandedModes: {
        flexDirection: 'row',
        gap: 8,
    },
    expandedModeBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 8,
        borderRadius: 10,
        backgroundColor: 'rgba(255,255,255,0.06)',
    },
    expandedModeBtnActive: {
        backgroundColor: 'rgba(99, 102, 241, 0.3)',
    },
    expandedModeText: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 12,
        fontWeight: '600',
    },
    expandedModeTextActive: {
        color: '#fff',
    },
    expandedQuickBtn: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 14,
        gap: 6,
    },
    expandedQuickIcon: {
        width: 36,
        height: 36,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    expandedQuickLabel: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 11,
        fontWeight: '600',
    },
    expandedSettingCard: {
        flex: 1,
        backgroundColor: 'rgba(255,255,255,0.06)',
        borderRadius: 14,
        padding: 12,
        gap: 10,
    },
    expandedSettingRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    expandedSettingLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    expandedSettingText: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 13,
        fontWeight: '500',
    },
    miniToggle: {
        width: 40,
        height: 24,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.15)',
        padding: 2,
        justifyContent: 'center',
    },
    miniToggleOn: {
        backgroundColor: '#34C759',
    },
    miniToggleThumb: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: '#fff',
    },
    miniToggleThumbOn: {
        marginLeft: 16,
    },
    expandedMoreBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: 'rgba(255,255,255,0.06)',
        borderRadius: 14,
        padding: 12,
    },
    expandedMoreText: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 13,
        fontWeight: '500',
        flex: 1,
    },
    expandedToggleBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderRadius: 12,
        paddingVertical: 10,
        gap: 6,
    },
    expandedToggleBtnActive: {
        backgroundColor: 'rgba(255,255,255,0.2)',
    },
    expandedToggleLabel: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 12,
        fontWeight: '600',
    },
    expandedToggleLabelActive: {
        color: '#fff',
    },

    modal: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)' },
    modalImage: { width: '100%', height: '100%' },
    modalClose: {
        position: 'absolute',
        top: 60,
        right: 20,
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
    },
    modalContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center' },
    closeText: { color: '#fff', fontSize: 20, fontWeight: '300' },
    modalInfo: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingVertical: 20,
        paddingHorizontal: 20,
    },
    modalModel: { color: '#fff', fontSize: 16, fontWeight: '600', marginBottom: 8 },
    paramRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
    paramText: { color: '#fff', fontSize: 13, fontWeight: '500' },
    paramDivider: { color: 'rgba(255,255,255,0.3)', fontSize: 13 },

    settingsOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    settingsPanel: {
        backgroundColor: 'rgba(28, 28, 30, 0.95)',
        borderRadius: 28,
        width: '100%',
        maxWidth: 360,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        overflow: 'hidden',
    },
    settingsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.06)',
    },
    settingsHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    settingsIconWrap: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: 'rgba(255,255,255,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    settingsTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
        letterSpacing: 0.3,
    },
    settingsCloseBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.08)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    settingsContent: {
        padding: 16,
        gap: 16,
    },
    settingsSection: {
        gap: 8,
    },
    settingsSectionTitle: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 12,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        marginLeft: 4,
        marginBottom: 4,
    },
    settingsCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'rgba(255,255,255,0.06)',
        borderRadius: 16,
        padding: 14,
    },
    settingsCardLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    settingsCardIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    settingsCardTitle: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '600',
        marginBottom: 2,
    },
    settingsCardDesc: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 12,
    },
    toggle: {
        width: 52,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.15)',
        padding: 2,
        justifyContent: 'center',
    },
    toggleOn: {
        backgroundColor: '#34C759',
    },
    toggleThumb: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#fff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 4,
    },
    toggleThumbOn: {
        marginLeft: 20,
    },
    countSelectorNew: {
        flexDirection: 'row',
        gap: 10,
    },
    countBtnNew: {
        flex: 1,
        paddingVertical: 16,
        paddingHorizontal: 12,
        borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.06)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    countBtnNewActive: {
        backgroundColor: 'rgba(52, 199, 89, 0.2)',
        borderWidth: 1,
        borderColor: 'rgba(52, 199, 89, 0.4)',
    },
    countTextNew: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 22,
        fontWeight: '700',
    },
    countTextNewActive: {
        color: '#34C759',
    },
    countLabelNew: {
        color: 'rgba(255,255,255,0.3)',
        fontSize: 12,
        marginTop: 2,
    },
    countLabelNewActive: {
        color: 'rgba(52, 199, 89, 0.7)',
    },
    dangerBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginHorizontal: 16,
        marginBottom: 16,
        marginTop: 4,
        paddingVertical: 14,
        borderRadius: 14,
        backgroundColor: 'rgba(255, 107, 107, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(255, 107, 107, 0.2)',
    },
    dangerBtnText: {
        color: '#ff6b6b',
        fontSize: 14,
        fontWeight: '600',
    },

    settingsItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    settingsItemText: { color: '#fff', fontSize: 15, flex: 1 },
    settingsClose: { color: 'rgba(255,255,255,0.5)', fontSize: 20 },
    countSelector: { flexDirection: 'row', gap: 8 },
    countBtn: {
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 8,
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    countBtnActive: { backgroundColor: '#4CAF50' },
    countText: { color: 'rgba(255,255,255,0.6)', fontSize: 14, fontWeight: '600' },
    countTextActive: { color: '#fff' },

    modeButton: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    modeButtonActive: { backgroundColor: 'rgba(255,255,255,0.3)' },
    modeLabel: { color: '#fff', fontSize: 13, fontWeight: '600' },
    actionButtons: { flexDirection: 'row', gap: 8, alignItems: 'center' },
    iconButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.15)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconButtonText: { fontSize: 16 },
    modalCloseText: { color: '#fff', fontSize: 24, fontWeight: '300' },
    exifPanel: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingVertical: 20,
        paddingHorizontal: 20,
    },
    exifRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
    exifLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 13 },
    exifValue: { color: '#fff', fontSize: 15, fontWeight: '600' },
    exifParams: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    islandModeIcon: { fontSize: 14, color: 'rgba(255,255,255,0.6)' },
    islandModeIconActive: { color: '#fff' },

    islandAlbumItem: {
        alignItems: 'center',
        marginRight: 10,
        width: 60,
    },
    islandAlbumCover: {
        width: 50,
        height: 50,
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: 'rgba(255,255,255,0.1)',
        marginBottom: 6,
    },
    islandAlbumCoverSelected: {
        borderWidth: 2,
        borderColor: '#fff',
    },
    islandAlbumName: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 10,
        textAlign: 'center',
    },
    islandAlbumNameActive: {
        color: '#fff',
        fontWeight: '600',
    },
});
