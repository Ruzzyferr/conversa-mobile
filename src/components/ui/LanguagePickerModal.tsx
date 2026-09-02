import React from "react";
import { View, Text, StyleSheet, Modal, Pressable } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { colors, spacing, radius, textStyles } from "@/src/theme";
import { LanguageSelect } from "@/src/components/onboarding/LanguageSelect";

/**
 * Tam ekran dil secici.
 *
 * Dil listesi otuzdan yuze cikinca, ekrana serilen cip izgarasi kullanilmaz
 * hale geldi: profil duzenleme ve filtre sayfalari yuz yirmi cipi IKI kez
 * alt alta cizerdi. Secim artik kendi ekraninda, aramasiyla birlikte.
 */

interface Props {
  visible: boolean;
  title: string;
  value: string[];
  onClose: () => void;
  onSave: (next: string[]) => void;
  emptyHint: string;
}

export function LanguagePickerModal({
  visible,
  title,
  value,
  onClose,
  onSave,
  emptyHint,
}: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = React.useState<string[]>(value);

  // Her acilista disaridaki degerle esitle: kapatilip yeniden acildiginda
  // eski taslak kalirsa kullanici kaydetmedigi bir secimi kaydedilmis
  // sanir.
  React.useEffect(() => {
    if (visible) setDraft(value);
  }, [visible, value]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <View style={styles.bar}>
          <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button">
            <MaterialIcons name="close" size={24} color={colors.textSecondary} />
          </Pressable>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.body}>
          <LanguageSelect
            value={draft}
            onChange={setDraft}
            placeholder={t("setup.q.search")}
            emptyHint={emptyHint}
          />
        </View>

        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
          <Pressable
            onPress={() => onSave(draft)}
            style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
            accessibilityRole="button"
          >
            <Text style={styles.ctaText}>{t("common.save")}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  title: { ...textStyles.heading, color: colors.text, flex: 1, textAlign: "center" },
  body: { flex: 1, paddingHorizontal: spacing.lg },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderMuted,
  },
  cta: {
    height: 54,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaPressed: { opacity: 0.9 },
  ctaText: { ...textStyles.label, color: colors.textInverse },
});
