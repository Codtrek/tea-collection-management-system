import {Pressable, View, StyleSheet, Image} from "react-native";
import { AppText, AppCard} from "@/components/ui";

interface ProfileFeatureCardProps{
    imageSource?: string,
    feature: string,
    featurePressed?: () => void,
}

export default function ProfileFeatureCard({
    imageSource,
    feature,
    featurePressed,
}: ProfileFeatureCardProps) {
    return(
        <>
            <Pressable>
                <AppCard>
                    <Image source={{uri: imageSource }}/>
                    <AppText>{feature}</AppText>
                </AppCard>
            </Pressable>
        </>
    );
} 

const styles = StyleSheet.create ({
    content: {
        width: "100%",
        flexDirection: "row",
    },
});
