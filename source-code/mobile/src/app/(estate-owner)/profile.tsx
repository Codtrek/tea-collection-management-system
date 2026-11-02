import { useState, useEffect } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, ScrollView, StyleSheet, View, Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import type { PublicUser } from "../services/api/auth.api";
import {Screen, AppText, SearchBar, GeneralHeader, Avatar, AppCard, Stat} from "@/components/ui";
import { ProfileFeatureCard } from "@/components/estate-owner";
import { colors, spacing } from "@/theme";

export default function Profile() {
    const [user, setUser] = useState<PublicUser | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let active = true;

        async function loadUser() {
            try {
                const storedUser = 
                    Platform.OS == "web"
                        ? localStorage.getItem("user")
                        : await SecureStore.getItemAsync("user");

                if (active && storedUser) {
                    setUser(JSON.parse(storedUser) as PublicUser);
                }
            } catch (error) {
                console.error("Error loading user:", error);
            } finally {
                if (active) setLoading(false);
            }
        }

        void loadUser();

        return () => {
            active = false;
        };
    }, []);
    return(
        <>            
            <Screen
                header={
                    <GeneralHeader
                        title="Profile"
                        description="Manage your profile"
                    />
                }

                scroll
            >
                <View style={styles.avatarContainer}>
                    <Avatar
                        // image="https://plus.unsplash.com/premium_photo-1689539137236-b68e436248de?q=80&w=1171&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=NHwxMjA3fDA%3D"
                        name="Kalana"
                        size={50}
                    />
                    <View>
                        <AppText>
                            {loading
                                ? "Loading profile..."
                                : user
                                    ? `Welcome, ${user.name}`
                                    : "Please log in to view your profile."
                                }
                        </AppText>
                    </View>
                </View>
                <View style={styles.stats}>
                    <Stat stat="Growth" value="1.7%"/>
                    <Stat stat="Estates" value="3"/>
                    <Stat stat="Managers" value="3"/>
                </View>
                
                <View>
                    <AppText variant="sectionHeading">Account</AppText>
                    <View>
                        <ProfileFeatureCard iconName="person-outline" feature="Personal Information"/>
                        <ProfileFeatureCard iconName="key-outline" feature="Change Password"/>
                    </View>
                </View>
                
                <View>
                    <AppText variant="sectionHeading">Support</AppText>
                    <View>
                        <ProfileFeatureCard iconName="help-outline" feature="Help & Support"/>
                        <ProfileFeatureCard iconName="information-circle-outline" feature="About"/>
                    </View>
                </View>
                
            </Screen>
        </>
    );
}

const styles = StyleSheet.create({
    stats: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 40,
        marginTop: 40,
    },
    avatarContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: 20,
        marginTop: 20,
        zIndex: 1,
    },
});