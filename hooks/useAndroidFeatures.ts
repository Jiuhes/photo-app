import { useEffect, useState } from 'react';
import { BackHandler, Platform, ToastAndroid } from 'react-native';

export default function useAndroidFeatures() {
    const [isAndroid] = useState(Platform.OS === 'android');
    const [androidVersion] = useState(
        typeof Platform.Version === 'number' ? Platform.Version : 0
    );

    const showToast = (message: string, duration: 'SHORT' | 'LONG' = 'SHORT') => {
        if (isAndroid) {
            ToastAndroid.show(
                message,
                duration === 'SHORT' ? ToastAndroid.SHORT : ToastAndroid.LONG
            );
        }
    };

    const useBackHandler = (handler: () => boolean) => {
        useEffect(() => {
            if (!isAndroid) return;

            const backHandler = BackHandler.addEventListener('hardwareBackPress', handler);

            return () => backHandler.remove();
        }, [handler]);
    };

    const supportsEdgeToEdge = () => {
        return isAndroid && androidVersion >= 29;
    };

    const supportsMaterialYou = () => {
        return isAndroid && androidVersion >= 31;
    };

    const supportsPredictiveBack = () => {
        return isAndroid && androidVersion >= 33;
    };

    return {
        isAndroid,
        androidVersion,
        showToast,
        useBackHandler,
        supportsEdgeToEdge,
        supportsMaterialYou,
        supportsPredictiveBack,
    };
}
