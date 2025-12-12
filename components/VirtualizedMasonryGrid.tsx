import { Image } from 'expo-image';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Dimensions, NativeScrollEvent, NativeSyntheticEvent, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

const { width, height } = Dimensions.get('window');
const COLUMN_GAP = 10;
const NUM_COLUMNS = 2;
const COLUMN_WIDTH = (width - 40 - COLUMN_GAP) / NUM_COLUMNS;
const BUFFER_SIZE = height * 2;

interface PhotoAsset {
    id: string;
    uri: string;
    width: number;
    height: number;
    exif?: any;
    thumbnailUri?: string;
}

interface Props {
    photos: PhotoAsset[];
    onPhotoPress?: (photo: PhotoAsset) => void;
    onLoadMore?: () => void;
    isLoading?: boolean;
}

export default function VirtualizedMasonryGrid({ photos, onPhotoPress, onLoadMore, isLoading }: Props) {
    const [scrollY, setScrollY] = useState(0);
    const isLoadingRef = useRef(false);

    const columns = useMemo(() => {
        const left: { photo: PhotoAsset; height: number; y: number }[] = [];
        const right: { photo: PhotoAsset; height: number; y: number }[] = [];
        let leftHeight = 0;
        let rightHeight = 0;

        photos.forEach((photo, index) => {
            const ratio = photo.height / photo.width || 1.2;
            const h = COLUMN_WIDTH * Math.min(Math.max(ratio, 0.8), 1.8);

            if (index % 2 === 0) {
                left.push({ photo, height: h, y: leftHeight });
                leftHeight += h + COLUMN_GAP;
            } else {
                right.push({ photo, height: h, y: rightHeight });
                rightHeight += h + COLUMN_GAP;
            }
        });

        return { left, right, totalHeight: Math.max(leftHeight, rightHeight) };
    }, [photos]);

    const visibleItems = useMemo(() => {
        const viewportTop = scrollY - BUFFER_SIZE;
        const viewportBottom = scrollY + height + BUFFER_SIZE;

        const visibleLeft = columns.left.filter(
            item => item.y + item.height >= viewportTop && item.y <= viewportBottom
        );
        const visibleRight = columns.right.filter(
            item => item.y + item.height >= viewportTop && item.y <= viewportBottom
        );

        return { left: visibleLeft, right: visibleRight };
    }, [scrollY, columns]);

    const handleScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
        const offsetY = e.nativeEvent.contentOffset.y;
        setScrollY(offsetY);

        const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
        const isNearBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 500;

        if (isNearBottom && !isLoadingRef.current && onLoadMore) {
            isLoadingRef.current = true;
            onLoadMore();
            setTimeout(() => {
                isLoadingRef.current = false;
            }, 1000);
        }
    }, [onLoadMore]);

    const renderColumn = (items: typeof visibleItems.left) => (
        <View style={styles.column}>
            {items.map(({ photo, height, y }) => (
                <TouchableOpacity
                    key={photo.id}
                    style={[
                        styles.photoContainer,
                        {
                            height,
                            position: 'absolute',
                            top: y,
                            width: COLUMN_WIDTH,
                        },
                    ]}
                    onPress={() => onPhotoPress?.(photo)}
                    activeOpacity={0.9}
                >
                    <Image
                        source={{ uri: photo.thumbnailUri || photo.uri }}
                        style={styles.photo}
                        contentFit="cover"
                        cachePolicy="memory-disk"
                        transition={200}
                    />
                </TouchableOpacity>
            ))}
        </View>
    );

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={{ height: columns.totalHeight }}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            showsVerticalScrollIndicator={false}
        >
            <View style={styles.masonry}>
                {renderColumn(visibleItems.left)}
                {renderColumn(visibleItems.right)}
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    masonry: { flexDirection: 'row', gap: COLUMN_GAP, paddingHorizontal: 20, paddingTop: 20 },
    column: { flex: 1, position: 'relative' },
    photoContainer: { borderRadius: 12, overflow: 'hidden', marginBottom: COLUMN_GAP },
    photo: { width: '100%', height: '100%' },
});
