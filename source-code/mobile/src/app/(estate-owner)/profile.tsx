import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import { Screen, AppText, SearchBar, GeneralHeader, Avatar, AppCard} from "@/components/ui";
import { ProfileFeatureCard } from "@/components/estate-owner";
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
                <View>
                    
                </View>
                
                <View>
                    <AppText variant="subheading">Account</AppText>
                    <View>
                        <ProfileFeatureCard feature="Personal Information"/>
                        <ProfileFeatureCard feature="Change Password"/>
                    </View>
                </View>
                
                <View>
                    <AppText variant="subheading">Support</AppText>
                    <View>
                        <ProfileFeatureCard feature="Help & Support"/>
                        <ProfileFeatureCard feature="About"/>
                    </View>
                </View>
                
            </Screen>
        </>
    );
}