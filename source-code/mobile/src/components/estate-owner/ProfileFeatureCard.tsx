import {Pressable, View, StyleSheet, Image} from "react-native";
import { AppText, AppCard} from "@/components/ui";
import { Ionicons } from "@expo/vector-icons";

interface ProfileFeatureCardProps{
    iconName?: React.ComponentProps<typeof Ionicons>["name"],
    feature: string,
    featurePressed?: () => void,
}

export default function ProfileFeatureCard({
    iconName,
    feature,
    featurePressed,
}: ProfileFeatureCardProps) {
    return(
        <>
            <Pressable>
                <AppCard>
                    <View style={styles.content}>
                        <Ionicons name={iconName} size={18}/>
                        <AppText>{feature}</AppText>
                    </View>
                </AppCard>
            </Pressable>
        </>
    );
} 

const styles = StyleSheet.create ({
    content: {
        width: "100%",
        flexDirection: "row",
        alignItems: "center",
        gap: 20,
    },
});
