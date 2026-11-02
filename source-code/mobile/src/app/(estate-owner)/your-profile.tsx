import { useCallback, useState } from "react";
import { View, StyleSheet } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { AppText, GeneralHeader, Screen, AppButton } from "@/components/ui";
import { UserDetail } from "@/components/estate-owner";
import { type OwnerProfile, type ProfileField, profileLabels, readOwnerProfile } from "@/utils/ownerProfile";
export default function YourProfile() {
  const [user, setUser] = useState<OwnerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useFocusEffect(useCallback(() => {
    let active = true;
    setLoading(true); setError("");
    readOwnerProfile().then(value => {
      if (active) { setUser(value); if (!value) setError("Please sign in to view your information."); }
    }).catch(() => { if (active) setError("Unable to load your information."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []));
  return <Screen scroll header={<GeneralHeader title="Your profile" onBackPress={() => router.back()} showNotifications={false} />}>
    <View style={styles.content}>
      <AppText variant="sectionHeading">Your information</AppText>
      {loading ? <AppText>Loading your information...</AppText> : error ? <AppText accessibilityRole="alert">{error}</AppText> :
        <View>{(["name", "phone", "email"] as ProfileField[]).map(field =>
          <UserDetail key={field} label={profileLabels[field]} value={user?.[field]} onPress={() => router.push({pathname: "./edit-profile", params: {field}})} />
        )}</View>}

    </View>
  </Screen>;
}
const styles = StyleSheet.create({content: {paddingVertical: 24, gap: 24}});

