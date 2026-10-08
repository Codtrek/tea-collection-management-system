import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import { Screen, AppText, SearchBar, GeneralHeader } from "@/components/ui";
import { EstateCard } from "@/components/estate-owner";
import { colors, spacing } from "@/theme";

export default function Profile() {
    return(
        <>
            <GeneralHeader
                title="Profile"
                description="Manage your profile settings"
            />
            <Screen>
                <AppText>Profile</AppText>
            </Screen>
        </>
    );
}