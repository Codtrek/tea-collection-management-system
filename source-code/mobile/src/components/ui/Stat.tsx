import {View, StyleSheet, ViewProps} from "react-native";
import {AppText} from "@/components/ui";

interface StatProps extends ViewProps{
    stat: string,
    value: string,
}

export default function Stat({
    stat,
    value,
    style,
    ...props
}: StatProps) {
    return(
        <View style={styles.statContainer}>
            <AppText variant="label">{stat}</AppText>
            <AppText variant="body">{value}</AppText>
        </View>
    );
}

const styles = StyleSheet.create({
    statContainer: {
        flexDirection: "column",
        gap: 5,
        alignItems: "center",
    }
});