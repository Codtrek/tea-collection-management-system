import {Avatar, AppText} from "@/components/ui";
import {StyleSheet, View} from "react-native";

interface EstateAvatarWithDetailProps{
    name: string,
    address: string,
    area: string,
    image: string,
}

export default function EstateAvatarWithDetails({
    name,
    address,
    area,
    image,
}:EstateAvatarWithDetailProps) {
    return(
        <>
            <View style={styles.container}>
                <Avatar image={image} size={80}/>
                <View style={styles.detailsContainer}>
                    <AppText variant="sectionHeading">{name}</AppText>
                    <AppText variant="label">{address}</AppText>
                    <AppText variant="label">{area}</AppText>
                </View>
            </View>
        </>
    );
}

const styles = StyleSheet.create({
    container:{
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        marginBottom: 20,
    },
    detailsContainer: {
        flex: 1,
        flexDirection: "column",
    }
})