import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import { Screen, AppText, SearchBar, GeneralHeader, Avatar } from "@/components/ui";
import { EstateCard } from "@/components/estate-owner";
import { colors, spacing } from "@/theme";

export default function Profile() {
    return(
        <>
            <Screen
                header={
                    <GeneralHeader
                        title="Profile"
                    />
                }
            >
                <AppText>Hello</AppText>
            </Screen>
        </>
    );
}