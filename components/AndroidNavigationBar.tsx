import { useEffect, useState } from 'react';
import { Dimensions, Platform, StatusBar, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Props {
    backgroundColor?: string;
    translucent?: boolean;
}

export default function AndroidNavigationBar({ backgroundColor = '#000000', translucent = true }: Props) {
    const insets = useSafeAreaInsets();
    const [navBarHeight, setNavBarHeight] = useState(0);

    useEffect(() => {
        if (Platform.OS === 'android') {
            const { height } = Dimensions.get('window');
            const screenHeight = Dimensions.get('screen').height;
            const statusBarHeight = StatusBar.currentHeight || 0;
            const calculatedNavBarHeight = screenHeight - height - statusBarHeight;
            setNavBarHeight(calculatedNavBarHeight);

            if (Platform.Version >= 21) {
                StatusBar.setTranslucent(translucent);
                StatusBar.setBackgroundColor(translucent ? 'transparent' : backgroundColor);
            }
        }
    }, [backgroundColor, translucent]);

    if (Platform.OS !== 'android' || !translucent) {
        return null;
    }

    return (
        <View
            style={[
                styles.navigationBar,
                {
                    height: Math.max(insets.bottom, navBarHeight),
                    backgroundColor,
                },
            ]}
        />
    );
}

const styles = StyleSheet.create({
    navigationBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
    },
});
