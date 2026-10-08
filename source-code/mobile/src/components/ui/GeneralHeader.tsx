import {StyleSheet, View, Pressable} from "react-native";
import {Ionicons} from "@expo/vector-icons";

import AppText from "@/components/ui/AppText";
import {colors, spacing} from "@/theme";
import { Children } from "react";

interface GeneralHeaderProps {
    title?: string;
    description?: string;
    notificationCount?: number;
    children?: React.ReactNode;
    onNotificationPress?: () => void;
}

export default function GeneralHeader({
    title,
    description,
    children,
    notificationCount = 0,
    onNotificationPress,
}:GeneralHeaderProps) {
    return (
        <>
        <View style={styles.container}>
            <View style={styles.subContainer}>
                <View>
                    <View>
                        <AppText variant="subheading" style={styles.title}>
                            {title}
                        </AppText>
                    </View>
                    <View>
                        <AppText variant="bodySmall" style={styles.description}>
                            {description}
                        </AppText>
                    </View>
                </View>
                <Pressable
                    onPress={onNotificationPress}
                    hitSlop={8}
                >
                    <Ionicons
                        name="notifications-outline"
                        size={24}
                        color={colors.text.primary}
                    />
                    {notificationCount > 0 && (
                              <View style={styles.badge}>
                                <AppText variant="caption" style={styles.badgeText}>
                                  {notificationCount > 9 ? "9+" : notificationCount}
                                </AppText>
                              </View>
                            )}
                </Pressable>
            </View>
            <View style={styles.children}>
                {children}
            </View>
        </View> 
        </>
    )
}

const styles = StyleSheet.create({
    container:{
        width: "100%",
        height: 150,
        backgroundColor: colors.primary,
        paddingHorizontal: spacing.md,
        paddingTop: 40,
        borderBottomLeftRadius: 20,
        borderBottomRightRadius: 20,
    },
    subContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
    },
    title: {
        color: colors.black,
        marginBottom: spacing.xs,
    },
    description: {
        color: colors.black,
    },
    badge: {
        position: "absolute",
        top: -6,
        right: -8,
        minWidth: 18,
        height: 18,
        paddingHorizontal: 4,
        borderRadius: 999,
        backgroundColor: colors.error,
        alignItems: "center",
        justifyContent: "center",
    },
    badgeText: {
        color: colors.white,
        fontWeight: "700",
        lineHeight: 14,
    },
    children: {
        marginTop: spacing.md,
    }
})