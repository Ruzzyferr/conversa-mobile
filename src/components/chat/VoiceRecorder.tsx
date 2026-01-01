import React, { useState, useRef, useEffect, useCallback } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Pressable,
    Modal,
    Platform,
    Linking,
    Dimensions,
} from "react-native";
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withRepeat,
    withTiming,
    withSequence,
    interpolate,
    Extrapolation,
    cancelAnimation,
    runOnJS,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Audio } from "expo-av";
import { MaterialIcons } from "@expo/vector-icons";
import { colors } from "@/src/theme/colors";
import { spacing } from "@/src/theme/spacing";

const SCREEN_WIDTH = Dimensions.get("window").width;
const CANCEL_THRESHOLD = -80; // Sola 80px kaydırınca iptal

type RecordingState = "idle" | "recording" | "preview";

type VoiceRecorderProps = {
    onSend: (uri: string) => Promise<void>;
    onCancel: () => void;
    onRecordingStateChange?: (isActive: boolean) => void;
    disabled?: boolean;
};

const NUM_BARS = 20;
const BAR_WIDTH = 3;
const BAR_GAP = 2;
const MAX_BAR_HEIGHT = 24;
const MIN_BAR_HEIGHT = 4;

// Separate component for each bar to comply with hooks rules
type WaveformBarProps = {
    barHeight: { value: number };
    isRecording: boolean;
};

function WaveformBar({ barHeight, isRecording }: WaveformBarProps) {
    const animatedBarStyle = useAnimatedStyle(() => ({
        height: barHeight.value,
    }));

    return (
        <Animated.View
            style={[
                styles.bar,
                animatedBarStyle,
                isRecording && styles.barRecording,
            ]}
        />
    );
}

export function VoiceRecorder({ onSend, onCancel, onRecordingStateChange, disabled }: VoiceRecorderProps) {
    const insets = useSafeAreaInsets();
    const [recordingState, setRecordingState] = useState<RecordingState>("idle");
    const [audioUri, setAudioUri] = useState<string | null>(null);
    const [duration, setDuration] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [playbackPosition, setPlaybackPosition] = useState(0);
    const [sending, setSending] = useState(false);
    const [showPermissionModal, setShowPermissionModal] = useState(false);

    // Refs
    const recordingRef = useRef<Audio.Recording | null>(null);
    const soundRef = useRef<Audio.Sound | null>(null);
    const durationInterval = useRef<ReturnType<typeof setInterval> | null>(null);

    // Animated values for waveform bars
    const barHeights = useRef(
        Array.from({ length: NUM_BARS }, () => useSharedValue(MIN_BAR_HEIGHT))
    ).current;

    // Recording pulse animation
    const pulseScale = useSharedValue(1);
    const micScale = useSharedValue(1);
    const translateX = useSharedValue(0); // For slide-to-cancel gesture

    // Notify parent of recording state changes
    useEffect(() => {
        onRecordingStateChange?.(recordingState !== "idle");
    }, [recordingState, onRecordingStateChange]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            cleanup();
        };
    }, []);

    const cleanup = useCallback(async () => {
        if (durationInterval.current) {
            clearInterval(durationInterval.current);
            durationInterval.current = null;
        }
        if (recordingRef.current) {
            try {
                await recordingRef.current.stopAndUnloadAsync();
            } catch { }
            recordingRef.current = null;
        }
        if (soundRef.current) {
            try {
                await soundRef.current.unloadAsync();
            } catch { }
            soundRef.current = null;
        }
    }, []);

    const openSettings = () => {
        setShowPermissionModal(false);
        Linking.openSettings();
    };

    const checkPermission = async (): Promise<boolean> => {
        try {
            const { status } = await Audio.getPermissionsAsync();
            return status === "granted";
        } catch (error) {
            console.error("Permission check error:", error);
            return false;
        }
    };

    const requestNativePermission = async (): Promise<boolean> => {
        try {
            const { status } = await Audio.requestPermissionsAsync();
            return status === "granted";
        } catch (error) {
            console.error("Permission request error:", error);
            return false;
        }
    };

    const handleGrantPermission = async () => {
        setShowPermissionModal(false);
        const granted = await requestNativePermission();
        if (granted) {
            await startRecordingInternal();
        }
    };

    const startRecording = async () => {
        const hasPermission = await checkPermission();
        if (hasPermission) {
            await startRecordingInternal();
        } else {
            setShowPermissionModal(true);
        }
    };

    const startRecordingInternal = async () => {
        try {
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
            });

            const { recording } = await Audio.Recording.createAsync(
                Audio.RecordingOptionsPresets.HIGH_QUALITY,
                (status) => {
                    if (status.isRecording && status.metering !== undefined) {
                        updateWaveform(status.metering);
                    }
                },
                100
            );

            recordingRef.current = recording;
            setRecordingState("recording");
            setDuration(0);

            // Start pulse animation on recording dot
            pulseScale.value = withRepeat(
                withSequence(
                    withTiming(1.3, { duration: 500 }),
                    withTiming(1, { duration: 500 })
                ),
                -1,
                false
            );

            // Start mic breathing animation
            micScale.value = withRepeat(
                withSequence(
                    withTiming(1.1, { duration: 800 }),
                    withTiming(1, { duration: 800 })
                ),
                -1,
                false
            );

            // Start duration counter
            durationInterval.current = setInterval(() => {
                setDuration((prev) => prev + 1);
            }, 1000);
        } catch (error) {
            console.error("Failed to start recording:", error);
        }
    };

    const updateWaveform = (metering: number) => {
        const normalizedValue = Math.max(0, Math.min(1, (metering + 60) / 60));
        const barHeight = MIN_BAR_HEIGHT + normalizedValue * (MAX_BAR_HEIGHT - MIN_BAR_HEIGHT);

        for (let i = 0; i < NUM_BARS - 1; i++) {
            barHeights[i].value = barHeights[i + 1].value;
        }
        barHeights[NUM_BARS - 1].value = withSpring(barHeight, {
            damping: 15,
            stiffness: 300,
        });
    };

    const stopRecording = async () => {
        if (!recordingRef.current) return;

        try {
            cancelAnimation(pulseScale);
            cancelAnimation(micScale);
            pulseScale.value = 1;
            micScale.value = 1;

            if (durationInterval.current) {
                clearInterval(durationInterval.current);
                durationInterval.current = null;
            }

            await recordingRef.current.stopAndUnloadAsync();
            const uri = recordingRef.current.getURI();
            recordingRef.current = null;

            if (!uri) {
                console.error("Recording URI is null");
                setRecordingState("idle");
                return;
            }

            setAudioUri(uri);
            setRecordingState("preview");

            await loadSound(uri);
        } catch (error) {
            console.error("Failed to stop recording:", error);
            setRecordingState("idle");
        }
    };

    const loadSound = async (uri: string) => {
        try {
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: false,
                playsInSilentModeIOS: true,
            });

            const { sound } = await Audio.Sound.createAsync(
                { uri },
                { shouldPlay: false },
                (status) => {
                    if (status.isLoaded) {
                        setPlaybackPosition(status.positionMillis || 0);
                        if (status.didJustFinish) {
                            setIsPlaying(false);
                            setPlaybackPosition(0);
                        }
                    }
                }
            );
            soundRef.current = sound;

            const status = await sound.getStatusAsync();
            if (status.isLoaded) {
                setDuration(Math.floor((status.durationMillis || 0) / 1000));
            }
        } catch (error) {
            console.error("Failed to load sound:", error);
        }
    };

    const togglePlayback = async () => {
        if (!soundRef.current) return;

        try {
            if (isPlaying) {
                await soundRef.current.pauseAsync();
                setIsPlaying(false);
            } else {
                await soundRef.current.playFromPositionAsync(0);
                setIsPlaying(true);
            }
        } catch (error) {
            console.error("Playback error:", error);
        }
    };

    const handleDelete = async () => {
        cancelAnimation(pulseScale);
        cancelAnimation(micScale);
        translateX.value = 0; // Reset gesture position
        await cleanup();
        setRecordingState("idle");
        setAudioUri(null);
        setDuration(0);
        setPlaybackPosition(0);
        barHeights.forEach((bar) => {
            bar.value = MIN_BAR_HEIGHT;
        });
        onCancel();
    };

    const handleSend = async () => {
        if (!audioUri) return;

        setSending(true);
        try {
            await onSend(audioUri);
            await cleanup();
            setRecordingState("idle");
            setAudioUri(null);
            setDuration(0);
            barHeights.forEach((bar) => {
                bar.value = MIN_BAR_HEIGHT;
            });
        } catch (error) {
            console.error("Send error:", error);
        } finally {
            setSending(false);
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, "0")}`;
    };

    const pulseAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: pulseScale.value }],
        opacity: interpolate(pulseScale.value, [1, 1.3], [1, 0.6]),
    }));

    const micAnimatedStyle = useAnimatedStyle(() => ({
        transform: [
            { scale: micScale.value },
            { translateX: translateX.value }
        ],
    }));

    // Opacity for cancel text based on slide distance
    const cancelOpacityStyle = useAnimatedStyle(() => ({
        opacity: interpolate(
            translateX.value,
            [CANCEL_THRESHOLD, 0],
            [1, 0.5],
            Extrapolation.CLAMP
        ),
    }));

    // Pan gesture for slide-to-cancel
    const panGesture = Gesture.Pan()
        .onUpdate((event) => {
            // Only allow sliding left (negative values)
            if (event.translationX < 0) {
                translateX.value = Math.max(event.translationX, CANCEL_THRESHOLD - 20);
            }
        })
        .onEnd((event) => {
            if (event.translationX < CANCEL_THRESHOLD) {
                // Cancelled - animate out and delete
                translateX.value = withTiming(-SCREEN_WIDTH, { duration: 200 }, () => {
                    runOnJS(handleDelete)();
                });
            } else {
                // Return to original position
                translateX.value = withSpring(0);
            }
        });

    // Tap gesture for stopping recording
    const tapGesture = Gesture.Tap()
        .onEnd(() => {
            runOnJS(stopRecording)();
        });

    // Idle state - show mic button only
    if (recordingState === "idle") {
        return (
            <>
                <Pressable
                    style={({ pressed }) => [
                        styles.micButton,
                        pressed && styles.micButtonPressed,
                        disabled && styles.micButtonDisabled,
                    ]}
                    onLongPress={startRecording}
                    delayLongPress={200}
                    disabled={disabled}
                >
                    <MaterialIcons
                        name="mic"
                        size={24}
                        color={disabled ? colors.textTertiary : colors.primary}
                    />
                </Pressable>

                {/* Permission Modal */}
                <Modal
                    visible={showPermissionModal}
                    transparent
                    animationType="fade"
                    onRequestClose={() => setShowPermissionModal(false)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalCard}>
                            <View style={styles.modalIconContainer}>
                                <MaterialIcons name="mic" size={48} color={colors.primary} />
                            </View>
                            <Text style={styles.modalTitle}>Mikrofon İzni Gerekli</Text>
                            <Text style={styles.modalText}>
                                Ses mesajı gönderebilmek için mikrofon erişimine ihtiyacımız var.
                            </Text>
                            <View style={styles.modalActions}>
                                <TouchableOpacity
                                    style={styles.modalButtonPrimary}
                                    onPress={handleGrantPermission}
                                >
                                    <Text style={styles.modalButtonPrimaryText}>İzin Ver</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.modalButtonSecondary}
                                    onPress={() => setShowPermissionModal(false)}
                                >
                                    <Text style={styles.modalButtonSecondaryText}>İptal</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>
            </>
        );
    }

    // Recording state - Bumble style with slide-to-cancel
    if (recordingState === "recording") {
        const composedGesture = Gesture.Simultaneous(panGesture, tapGesture);

        return (
            <View style={styles.recordingContainer}>
                {/* Left: Recording dot + duration */}
                <View style={styles.recordingLeft}>
                    <Animated.View style={[styles.recordingDot, pulseAnimatedStyle]} />
                    <Text style={styles.durationText}>{formatTime(duration)}</Text>
                </View>

                {/* Center: Slide to cancel hint */}
                <Animated.View style={[styles.cancelArea, cancelOpacityStyle]}>
                    <MaterialIcons name="chevron-left" size={18} color={colors.textSecondary} />
                    <Text style={styles.cancelText}>İptal için kaydır</Text>
                </Animated.View>

                {/* Right: Draggable mic button */}
                <GestureDetector gesture={composedGesture}>
                    <Animated.View style={[styles.micCircle, micAnimatedStyle]}>
                        <MaterialIcons name="mic" size={22} color="#FFF" />
                    </Animated.View>
                </GestureDetector>
            </View>
        );
    }

    // Preview state
    return (
        <View style={styles.previewContainer}>
            {/* Delete button */}
            <TouchableOpacity
                style={styles.deleteButton}
                onPress={handleDelete}
                disabled={sending}
            >
                <MaterialIcons name="delete" size={22} color={colors.error} />
            </TouchableOpacity>

            {/* Play/Pause button */}
            <TouchableOpacity
                style={styles.playButton}
                onPress={togglePlayback}
                disabled={sending}
            >
                <MaterialIcons
                    name={isPlaying ? "pause" : "play-arrow"}
                    size={24}
                    color={colors.primary}
                />
            </TouchableOpacity>

            {/* Waveform */}
            <View style={styles.waveformContainer}>
                <View style={styles.waveform}>
                    {barHeights.map((barHeight, index) => (
                        <WaveformBar
                            key={index}
                            barHeight={barHeight}
                            isRecording={false}
                        />
                    ))}
                </View>
            </View>

            {/* Duration */}
            <Text style={styles.previewDuration}>{formatTime(duration)}</Text>

            {/* Send button */}
            <TouchableOpacity
                style={[styles.sendButton, sending && styles.sendButtonDisabled]}
                onPress={handleSend}
                disabled={sending}
            >
                <MaterialIcons
                    name="send"
                    size={20}
                    color="#FFF"
                />
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    // Idle state
    micButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.primary + "15",
        justifyContent: "center",
        alignItems: "center",
    },
    micButtonPressed: {
        backgroundColor: colors.primary + "30",
        transform: [{ scale: 1.1 }],
    },
    micButtonDisabled: {
        opacity: 0.5,
    },

    // Recording state - Premium dark theme
    recordingContainer: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: "#1C2033", // Dark theme background
        borderRadius: 28,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        borderWidth: 1,
        borderColor: colors.primary + "30",
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 3,
    },
    recordingLeft: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.sm,
    },
    recordingDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: "#FF5252",
        shadowColor: "#FF5252",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 4,
        elevation: 2,
    },
    durationText: {
        fontSize: 15,
        fontWeight: "600",
        color: colors.text,
        letterSpacing: 0.5,
    },
    cancelArea: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        opacity: 0.7,
    },
    cancelText: {
        fontSize: 13,
        color: colors.textSecondary,
        fontWeight: "500",
    },
    micCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: colors.primary,
        justifyContent: "center",
        alignItems: "center",
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 6,
    },
    // Preview state - Premium dark theme
    previewContainer: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#1C2033", // Dark theme background
        borderRadius: 28,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        gap: spacing.sm,
        borderWidth: 1,
        borderColor: colors.primary + "30",
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 3,
    },
    deleteButton: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: "#FF525215",
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#FF525220",
    },
    playButton: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: colors.primary + "20",
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 1,
        borderColor: colors.primary + "30",
    },
    waveformContainer: {
        flex: 1,
        height: MAX_BAR_HEIGHT,
        justifyContent: "center",
    },
    waveform: {
        flexDirection: "row",
        alignItems: "center",
        height: MAX_BAR_HEIGHT,
        gap: BAR_GAP,
    },
    bar: {
        width: BAR_WIDTH,
        backgroundColor: colors.primary + "40",
        borderRadius: BAR_WIDTH / 2,
    },
    barRecording: {
        backgroundColor: colors.primary,
    },
    previewDuration: {
        fontSize: 14,
        fontWeight: "600",
        color: colors.text,
        minWidth: 40,
        textAlign: "center",
        letterSpacing: 0.5,
    },
    sendButton: {
        width: 46,
        height: 46,
        borderRadius: 23,
        backgroundColor: colors.primary,
        justifyContent: "center",
        alignItems: "center",
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.35,
        shadowRadius: 6,
        elevation: 5,
    },
    sendButtonDisabled: {
        backgroundColor: colors.textTertiary + "50",
        shadowOpacity: 0,
        elevation: 0,
    },

    // Modal styles
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.7)",
        justifyContent: "center",
        alignItems: "center",
        padding: spacing.xl,
    },
    modalCard: {
        backgroundColor: colors.backgroundSecondary,
        borderRadius: 24,
        padding: spacing.xl,
        width: "100%",
        maxWidth: 340,
        alignItems: "center",
    },
    modalIconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: colors.primary + "20",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: spacing.lg,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: "700",
        color: colors.text,
        textAlign: "center",
        marginBottom: spacing.sm,
    },
    modalText: {
        fontSize: 14,
        color: colors.textSecondary,
        textAlign: "center",
        lineHeight: 20,
        marginBottom: spacing.xl,
    },
    modalActions: {
        width: "100%",
        gap: spacing.sm,
    },
    modalButtonPrimary: {
        backgroundColor: colors.primary,
        borderRadius: 12,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.xl,
        alignItems: "center",
    },
    modalButtonPrimaryText: {
        color: "#FFF",
        fontSize: 16,
        fontWeight: "600",
    },
    modalButtonSecondary: {
        backgroundColor: "transparent",
        borderRadius: 12,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.xl,
        alignItems: "center",
    },
    modalButtonSecondaryText: {
        color: colors.textSecondary,
        fontSize: 14,
        fontWeight: "500",
    },
});
