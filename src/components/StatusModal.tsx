import React from "react";
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { colors } from "@/src/theme/colors";
import { spacing } from "@/src/theme/spacing";
import { typography } from "@/src/theme/typography";
import { Card } from "@/src/components/Card";
import { PrimaryButton } from "@/src/components/PrimaryButton";

type StatusModalProps = {
    visible: boolean;
    type: "success" | "error" | "info";
    title: string;
    message: string;
    buttonText?: string;
    onClose: () => void;
};

export function StatusModal({
    visible,
    type,
    title,
    message,
    buttonText = "Tamam",
    onClose,
}: StatusModalProps) {
    // Emoji (🎉 ❌ ℹ️) yerine vektor ikon: platform emoji fontu cihazdan
    // cihaza degisiyor ve koyu zeminde renkli bir yama gibi duruyordu.
    const getIcon = (): { name: React.ComponentProps<typeof MaterialIcons>["name"]; color: string } => {
        switch (type) {
            case "success":
                return { name: "check-circle", color: colors.success };
            case "error":
                return { name: "error-outline", color: colors.error };
            case "info":
                return { name: "info-outline", color: colors.info };
            default:
                return { name: "info-outline", color: colors.primary };
        }
    };

    const getTitleColor = () => {
        switch (type) {
            case "success":
                return colors.success;
            case "error":
                return colors.error;
            default:
                return colors.text;
        }
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <Card style={styles.modalCard}>
                    <View style={styles.icon}>
                        <MaterialIcons name={getIcon().name} size={40} color={getIcon().color} />
                    </View>
                    <Text style={[styles.title, { color: getTitleColor() }]}>{title}</Text>
                    <Text style={styles.message}>{message}</Text>

                    <PrimaryButton
                        title={buttonText}
                        onPress={onClose}
                        style={styles.button}
                    />
                </Card>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: colors.overlayStrong,
        justifyContent: "center",
        alignItems: "center",
        padding: spacing.lg,
    },
    modalCard: {
        width: "100%",
        maxWidth: 340,
        padding: spacing.xl,
        alignItems: "center",
    },
    icon: {
        marginBottom: spacing.md,
        alignItems: "center",
    },
    title: {
        fontSize: typography.fontSize.xl,
        fontWeight: typography.fontWeight.bold,
        textAlign: "center",
        marginBottom: spacing.sm,
    },
    message: {
        fontSize: typography.fontSize.base,
        color: colors.textSecondary,
        textAlign: "center",
        marginBottom: spacing.xl,
        lineHeight: 24,
    },
    button: {
        width: "100%",
    },
});
