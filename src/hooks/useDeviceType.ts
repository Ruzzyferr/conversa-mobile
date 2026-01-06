import { useState, useEffect } from 'react';
import { Dimensions, ScaledSize } from 'react-native';

export type DeviceType = 'phone' | 'tablet';

interface DeviceInfo {
    deviceType: DeviceType;
    isTablet: boolean;
    isPhone: boolean;
    screenWidth: number;
    screenHeight: number;
    contentMaxWidth: number;
}

const getDeviceInfo = (dimensions: ScaledSize): DeviceInfo => {
    const { width, height } = dimensions;
    const shortSide = Math.min(width, height);

    // Consider devices with short side >= 600dp as tablets
    const isTablet = shortSide >= 600;

    return {
        deviceType: isTablet ? 'tablet' : 'phone',
        isTablet,
        isPhone: !isTablet,
        screenWidth: width,
        screenHeight: height,
        // On tablets, limit content width for better readability
        // Use 550px for main content, 700px for full-width content
        contentMaxWidth: isTablet ? 550 : width,
    };
};

export function useDeviceType(): DeviceInfo {
    const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>(() =>
        getDeviceInfo(Dimensions.get('window'))
    );

    useEffect(() => {
        const subscription = Dimensions.addEventListener('change', ({ window }) => {
            setDeviceInfo(getDeviceInfo(window));
        });

        return () => subscription?.remove();
    }, []);

    return deviceInfo;
}

// Static check for initial render
export function isTabletDevice(): boolean {
    const { width, height } = Dimensions.get('window');
    const shortSide = Math.min(width, height);
    return shortSide >= 600;
}

// Get responsive value based on device type
export function getResponsiveValue<T>(phoneValue: T, tabletValue: T): T {
    return isTabletDevice() ? tabletValue : phoneValue;
}
