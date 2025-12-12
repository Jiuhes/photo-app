import useAccessibility from '@/hooks/useAccessibility';
import { Image, ImageProps } from 'expo-image';

interface Props extends ImageProps {
    alt: string;
    decorative?: boolean;
}

export default function AccessibleImage({
    alt,
    decorative = false,
    style,
    ...props
}: Props) {
    const { isScreenReaderEnabled } = useAccessibility();

    if (decorative) {
        return (
            <Image
                accessible={false}
                style={style}
                {...props}
            />
        );
    }

    return (
        <Image
            accessible={true}
            accessibilityLabel={alt}
            accessibilityRole="image"
            style={style}
            {...props}
        />
    );
}
