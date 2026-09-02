import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { colors, spacing, textStyles } from "@/src/theme";

/**
 * Alanin altinda duran hata satiri.
 *
 * Kayit akisi hatalari `Alert.alert` ile veriyordu. Bu react-native-web'de
 * SESSIZCE hicbir sey yapmiyor -- ikinci adimdaki "Devam et" olu bir dugme
 * gibi davraniyordu -- ve calistigi platformlarda bile hatayi alandan
 * koparip modala tasiyor, kullaniciyi kapattiktan sonra hangi alanin
 * yanlis oldugunu aramaya zorluyordu.
 */

export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <View style={styles.row} accessibilityRole="alert">
      <MaterialIcons name="error-outline" size={14} color={colors.error} />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  text: {
    ...textStyles.caption,
    color: colors.error,
    flex: 1,
  },
});
