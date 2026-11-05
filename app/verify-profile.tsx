import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  Linking,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { colors } from "@/src/theme/colors";
import { spacing } from "@/src/theme/spacing";
import { typography } from "@/src/theme/typography";
import { SafeAreaView } from "@/src/components/SafeAreaView";
import { PrimaryButton } from "@/src/components/PrimaryButton";
import { StatusModal } from "@/src/components/StatusModal";
import { api } from "@/src/services/api";
import { friendlyApiErrorMessage } from "@/src/services/apiErrors";
import { LEGAL_URLS } from "@/src/config/legal";

/** Reason codes the automatic face check reports (backend lib/faceVerify.ts). */
const KNOWN_REJECT_REASONS = ["no_face_in_selfie", "no_face_in_photos", "no_match", "error", "timeout", "photos_changed"];

function rejectReasonKey(reason: string | null | undefined): string {
  const code = (reason || "").toLowerCase();
  return KNOWN_REJECT_REASONS.includes(code)
    ? `verify_result.reason_${code}`
    : "verify_result.reason_generic";
}

// Pose ids must match the backend's VERIFICATION_POSES list.
const POSE_EMOJI: Record<string, string> = {
  thumbs_up: "👍",
  peace_sign: "✌️",
  wave: "👋",
  ok_sign: "👌",
  point_up: "☝️",
  hand_on_chin: "🤔",
};

type Step = "loading" | "intro" | "capture" | "submitting" | "pending" | "rejected" | "verified";

export default function VerifyProfileScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  const [step, setStep] = useState<Step>("loading");
  const [pose, setPose] = useState<string | null>(null);
  const [selfieUri, setSelfieUri] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [pendingNote, setPendingNote] = useState<string | null>(null);

  const [statusVisible, setStatusVisible] = useState(false);
  const [statusTitle, setStatusTitle] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

  const showError = (title: string, message: string) => {
    setStatusTitle(title);
    setStatusMessage(message);
    setStatusVisible(true);
  };

  /** Reads the server state. Returns the status, or null when offline. */
  const refreshStatus = async (fallback: Step): Promise<string | null> => {
    try {
      const me = await api.getMe();
      if (me.user.isVerified) {
        setStep("verified");
      } else if (me.user.verificationStatus === "PENDING") {
        setStep("pending");
      } else if (me.user.verificationStatus === "REJECTED") {
        // Used to fall through to the intro screen: the user never learned
        // that (or why) the last attempt failed.
        setRejectReason(me.user.verificationRejectReason ?? null);
        setStep("rejected");
      } else {
        setStep("intro");
      }
      return me.user.isVerified ? "APPROVED" : me.user.verificationStatus ?? "NONE";
    } catch {
      setStep(fallback);
      return null;
    }
  };

  useEffect(() => {
    void refreshStatus("intro");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCheckAgain = async () => {
    setChecking(true);
    setPendingNote(null);
    const status = await refreshStatus("pending");
    setChecking(false);
    if (status === "PENDING") setPendingNote(t("verify_result.still_pending"));
    else if (status === null) setPendingNote(t("verify_result.check_failed"));
  };

  const handleStart = async () => {
    try {
      const res = await api.startVerification();
      setPose(res.pose);
      setSelfieUri(null);
      setStep("capture");
    } catch (error: any) {
      // 409: the server still has an attempt marked pending. Re-read the
      // real state instead of leaving the user on a dead screen.
      if (error?.response?.status === 409) {
        const status = await refreshStatus("intro");
        if (status === "PENDING") setPendingNote(t("verify_result.stale_pending"));
        return;
      }
      showError(t("common.error"), t("verify.start_failed"));
    }
  };

  const handleTakeSelfie = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      showError(t("common.error"), t("verify.camera_permission"));
      return;
    }
    // Camera only — no gallery. That is the whole point of pose verification.
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      cameraType: ImagePicker.CameraType.front,
      quality: 0.8,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets[0]) {
      setSelfieUri(result.assets[0].uri);
    }
  };

  const handleSubmit = async () => {
    if (!selfieUri) return;
    setStep("submitting");
    try {
      await api.submitVerificationSelfie(selfieUri);
      setStep("pending");
    } catch (error) {
      setStep("capture");
      showError(t("common.error"), friendlyApiErrorMessage(error) ?? t("verify.submit_failed"));
    }
  };

  const renderIntro = () => (
    <>
      <View style={styles.heroBadge}>
        <MaterialIcons name="verified" size={56} color={colors.primary} />
      </View>
      <Text style={styles.title}>{t("verify.title")}</Text>
      <Text style={styles.subtitle}>{t("verify.subtitle")}</Text>

      <View style={styles.stepsCard}>
        {[1, 2, 3].map((n) => (
          <View key={n} style={styles.stepRow}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>{n}</Text>
            </View>
            <Text style={styles.stepText}>{t(`verify.step${n}`)}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.disclosure}>{t("verify_result.disclosure")}</Text>
      <TouchableOpacity onPress={() => Linking.openURL(LEGAL_URLS.privacy)} accessibilityRole="link">
        <Text style={styles.link}>{t("verify_result.privacy_link")}</Text>
      </TouchableOpacity>

      <PrimaryButton title={t("verify.start_button")} onPress={handleStart} />
    </>
  );

  const renderCapture = () => (
    <>
      <Text style={styles.poseEmoji}>{pose ? POSE_EMOJI[pose] || "🤳" : "🤳"}</Text>
      <Text style={styles.title}>{t(`verify.pose.${pose}`)}</Text>
      <Text style={styles.subtitle}>{t("verify.capture_hint")}</Text>
      <Text style={styles.disclosure}>{t("verify_result.capture_disclosure")}</Text>

      {selfieUri ? (
        <View style={styles.previewWrap}>
          <Image source={{ uri: selfieUri }} style={styles.preview} />
          <TouchableOpacity style={styles.retakeButton} onPress={handleTakeSelfie}>
            <MaterialIcons name="refresh" size={20} color={colors.text} />
            <Text style={styles.retakeText}>{t("verify.retake")}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={styles.cameraButton} onPress={handleTakeSelfie}>
          <MaterialIcons name="photo-camera" size={40} color={colors.textInverse} />
        </TouchableOpacity>
      )}

      {selfieUri && (
        <PrimaryButton title={t("verify.submit_button")} onPress={handleSubmit} />
      )}
    </>
  );

  const renderPending = () => (
    <>
      <Text style={styles.poseEmoji}>⏳</Text>
      <Text style={styles.title}>{t("verify.pending_title")}</Text>
      <Text style={styles.subtitle}>{t("verify.pending_desc")}</Text>
      {pendingNote ? <Text style={styles.disclosure}>{pendingNote}</Text> : null}
      <PrimaryButton
        title={checking ? t("verify_result.checking") : t("verify_result.check_again")}
        onPress={handleCheckAgain}
        disabled={checking}
      />
      <TouchableOpacity onPress={handleStart} style={styles.secondaryAction}>
        <Text style={styles.link}>{t("verify_result.start_over")}</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => router.back()} style={styles.secondaryAction}>
        <Text style={styles.retakeText}>{t("common.close")}</Text>
      </TouchableOpacity>
    </>
  );

  const renderRejected = () => (
    <>
      <View style={[styles.heroBadge, { backgroundColor: colors.surface }]}>
        <MaterialIcons name="error-outline" size={56} color={colors.warning} />
      </View>
      <Text style={styles.title}>{t("verify_result.rejected_title")}</Text>
      <Text style={styles.subtitle}>{t(rejectReasonKey(rejectReason))}</Text>
      <Text style={styles.disclosure}>{t("verify_result.rejected_tip")}</Text>
      <PrimaryButton title={t("verify_result.try_again")} onPress={handleStart} />
      <TouchableOpacity onPress={() => router.back()} style={styles.secondaryAction}>
        <Text style={styles.retakeText}>{t("common.close")}</Text>
      </TouchableOpacity>
    </>
  );

  const renderVerified = () => (
    <>
      <View style={styles.heroBadge}>
        <MaterialIcons name="verified" size={56} color={colors.success} />
      </View>
      <Text style={styles.title}>{t("verify.verified_title")}</Text>
      <Text style={styles.subtitle}>{t("verify.verified_desc")}</Text>
      <PrimaryButton title={t("common.ok")} onPress={() => router.back()} />
    </>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <MaterialIcons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("verify.header")}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {step === "loading" || step === "submitting" ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={colors.primary} />
            {step === "submitting" && (
              <Text style={styles.subtitle}>{t("verify.submitting")}</Text>
            )}
          </View>
        ) : step === "intro" ? (
          renderIntro()
        ) : step === "capture" ? (
          renderCapture()
        ) : step === "pending" ? (
          renderPending()
        ) : step === "rejected" ? (
          renderRejected()
        ) : (
          renderVerified()
        )}
      </ScrollView>

      <StatusModal
        visible={statusVisible}
        type="error"
        title={statusTitle}
        message={statusMessage}
        buttonText={t("common.ok")}
        onClose={() => setStatusVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  headerTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text,
  },
  content: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
    gap: spacing.md,
  },
  loadingWrap: {
    alignItems: "center",
    gap: spacing.md,
  },
  heroBadge: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: colors.primaryTint,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: typography.fontSize["2xl"],
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
    textAlign: "center",
  },
  subtitle: {
    fontSize: typography.fontSize.base,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  stepsCard: {
    alignSelf: "stretch",
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primaryTint,
    alignItems: "center",
    justifyContent: "center",
  },
  stepNumberText: {
    fontSize: typography.fontSize.sm,
    color: colors.primary,
    fontWeight: typography.fontWeight.bold,
  },
  stepText: {
    fontSize: typography.fontSize.base,
    color: colors.text,
    flex: 1,
  },
  poseEmoji: {
    fontSize: 72,
  },
  cameraButton: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: spacing.lg,
  },
  previewWrap: {
    alignItems: "center",
    gap: spacing.sm,
    marginVertical: spacing.md,
  },
  preview: {
    width: 220,
    height: 293,
    borderRadius: 16,
    backgroundColor: colors.surface,
  },
  retakeButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  disclosure: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
  link: {
    fontSize: typography.fontSize.sm,
    color: colors.primary,
    textDecorationLine: "underline",
    textAlign: "center",
  },
  secondaryAction: {
    paddingVertical: spacing.sm,
  },
  retakeText: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
  },
});
