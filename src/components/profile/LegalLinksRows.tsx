import React from "react";
import { View, Text, TouchableOpacity, StyleProp, ViewStyle, TextStyle } from "react-native";
import { useTranslation } from "react-i18next";
import * as WebBrowser from "expo-web-browser";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/src/theme/colors";
import { LEGAL_URLS } from "@/src/config/legal";

interface Props {
  itemStyle: StyleProp<ViewStyle>;
  leftStyle: StyleProp<ViewStyle>;
  iconStyle: StyleProp<ViewStyle>;
  textStyle: StyleProp<TextStyle>;
}

/**
 * Privacy Policy / Terms of Use / Contact Support rows for the profile
 * settings list. Styles come from the profile screen so the rows match.
 */
export function LegalLinksRows({ itemStyle, leftStyle, iconStyle, textStyle }: Props) {
  const { t } = useTranslation();
  const rows = [
    { key: "privacy", icon: "shield-checkmark-outline", label: t("profile.privacy_policy"), url: LEGAL_URLS.privacy },
    { key: "terms", icon: "document-text-outline", label: t("profile.terms_of_use"), url: LEGAL_URLS.terms },
    { key: "support", icon: "help-circle-outline", label: t("profile.contact_support"), url: LEGAL_URLS.support },
  ] as const;

  return (
    <>
      {rows.map((row) => (
        <TouchableOpacity
          key={row.key}
          style={itemStyle}
          accessibilityRole="link"
          onPress={() => {
            WebBrowser.openBrowserAsync(row.url).catch(() => {});
          }}
        >
          <View style={leftStyle}>
            <View style={[iconStyle, { backgroundColor: colors.textSecondaryDark + "20" }]}>
              <Ionicons name={row.icon} size={20} color={colors.textSecondaryDark} />
            </View>
            <Text style={textStyle}>{row.label}</Text>
          </View>
          <Ionicons name="open-outline" size={18} color={colors.textSecondaryDark} />
        </TouchableOpacity>
      ))}
    </>
  );
}
