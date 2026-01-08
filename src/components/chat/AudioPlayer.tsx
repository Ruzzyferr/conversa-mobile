import React, { useState, useRef, useEffect } from "react";
import { View, TouchableOpacity, Text, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { colors } from "@/src/theme/colors";

type AudioPlayerProps = {
  audioUrl: string;
  isMyMessage: boolean;
};

export const AudioPlayer = ({ audioUrl, isMyMessage }: AudioPlayerProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const playerRef = useRef<any>(null);
  const intervalRef = useRef<any>(null);

  // Generate random waveform bars once
  const waveBars = useRef(
    Array.from({ length: 20 }, () => Math.floor(Math.random() * 20) + 4)
  ).current;

  // Prepare source
  const baseUrl = process.env.EXPO_PUBLIC_API_URL || "http://localhost:4000";
  const fullUrl = audioUrl.startsWith("http")
    ? audioUrl
    : `${baseUrl}${audioUrl}`;

  // Initialize player on mount
  useEffect(() => {
    let mounted = true;

    const initPlayer = async () => {
      try {
        const { createAudioPlayer, AudioModule } = await import("expo-audio");

        // Set audio mode for playback
        await AudioModule.setAudioModeAsync({
          playsInSilentMode: true,
          allowsRecording: false,
        });

        const player = createAudioPlayer({ uri: fullUrl });

        if (mounted) {
          playerRef.current = player;

          // Wait for player to load
          const checkLoaded = setInterval(() => {
            if (player.isLoaded) {
              setIsLoaded(true);
              setDuration(player.duration * 1000);
              clearInterval(checkLoaded);
            }
          }, 100);

          // Clear after 5 seconds if not loaded
          setTimeout(() => clearInterval(checkLoaded), 5000);
        }
      } catch (error) {
        console.error("Failed to init audio player:", error);
      }
    };

    initPlayer();

    return () => {
      mounted = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (playerRef.current) {
        try {
          playerRef.current.remove();
        } catch (e) { }
        playerRef.current = null;
      }
    };
  }, [fullUrl]);

  // Position polling
  useEffect(() => {
    if (isPlaying && playerRef.current) {
      intervalRef.current = setInterval(() => {
        if (playerRef.current) {
          setPosition(playerRef.current.currentTime * 1000);
          setIsPlaying(playerRef.current.playing);

          // Check if playback finished
          if (!playerRef.current.playing && position > 0) {
            setIsPlaying(false);
          }
        }
      }, 100);
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying]);

  const playPause = async () => {
    const player = playerRef.current;
    if (!player) {
      console.log("Player not initialized yet");
      return;
    }

    try {
      if (player.playing) {
        player.pause();
        setIsPlaying(false);
      } else {
        // If finished, seek to start
        if (player.currentTime >= player.duration - 0.1) {
          player.seekTo(0);
        }
        player.volume = 1;
        player.play();
        setIsPlaying(true);
      }
    } catch (error) {
      console.error("Playback error:", error);
    }
  };

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <View style={[styles.audioPlayerContainer, !isMyMessage && styles.audioPlayerContainerOther]}>
      <TouchableOpacity
        onPress={playPause}
        style={[styles.audioPlayButton, isMyMessage ? styles.audioPlayButtonMy : styles.audioPlayButtonOther]}
      >
        <MaterialIcons
          name={isPlaying ? "pause" : "play-arrow"}
          size={24}
          color={isMyMessage ? colors.primary : colors.text}
        />
      </TouchableOpacity>

      <View style={styles.audioContent}>
        {/* Simulated Waveform */}
        <View style={styles.audioWaveformContainer}>
          {waveBars.map((height, index) => {
            // Simple progress visualization based on index
            const progress = duration > 0 ? position / duration : 0;
            const isPlayed = index / waveBars.length < progress;

            return (
              <View
                key={index}
                style={[
                  styles.waveBar,
                  {
                    height,
                    backgroundColor: isPlayed
                      ? (isMyMessage ? "rgba(255,255,255,0.9)" : colors.primary)
                      : (isMyMessage ? "rgba(255,255,255,0.4)" : colors.primary + "40")
                  }
                ]}
              />
            );
          })}
        </View>
        <Text style={[styles.audioTime, isMyMessage ? styles.audioTimeMy : styles.audioTimeOther]}>
          {formatTime(position || duration)}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  audioPlayerContainer: {
    flexDirection: "row",
    alignItems: "center",
    minWidth: 180,
    paddingVertical: 4,
  },
  audioPlayerContainerOther: {},
  audioPlayButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  audioPlayButtonMy: {
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  audioPlayButtonOther: {
    backgroundColor: colors.primary + "20",
  },
  audioContent: {
    flex: 1,
  },
  audioWaveformContainer: {
    flexDirection: "row",
    alignItems: "center",
    height: 24,
    gap: 2,
  },
  waveBar: {
    width: 3,
    borderRadius: 1.5,
  },
  audioTime: {
    fontSize: 11,
    marginTop: 2,
  },
  audioTimeMy: {
    color: "rgba(255,255,255,0.7)",
  },
  audioTimeOther: {
    color: colors.textSecondaryDark,
  },
});
