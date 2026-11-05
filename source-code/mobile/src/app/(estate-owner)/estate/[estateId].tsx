import {
  Alert,
  Linking,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";

import { EstateAvatarWithDetails } from "@/components/estate";
import WeeklyPluckedWeightChart from "@/components/estate-owner/WeeklyPluckedWeightChart";
import { RequestListItem } from "@/components/estate-owner";
import { AppButton, AppText, Avatar, Screen } from "@/components/ui";
import { estateProfiles } from "@/data/estateOwnerEstates";
import { useSavedEstateWorkers } from "@/data/estateWorkers";
import { colors, spacing } from "@/theme";

export default function EstateDetails() {
  const {
    estateId,
    collectionFactory,
    collectionWeightKg,
    collectionRequestedAt,
  } = useLocalSearchParams<{
    estateId: string;
    collectionFactory?: string;
    collectionWeightKg?: string;
    collectionRequestedAt?: string;
  }>();
  const estate = estateProfiles.find((profile) => profile.id === estateId);
  const savedWorkers = useSavedEstateWorkers(estate?.id);
  const collectionWeight = Number(collectionWeightKg);
  const requestedAt = collectionRequestedAt
    ? new Date(collectionRequestedAt)
    : null;
  const pendingCollection =
    estate &&
    collectionFactory &&
    Number.isFinite(collectionWeight) &&
    collectionWeight > 0 &&
    requestedAt &&
    !Number.isNaN(requestedAt.getTime())
      ? {
          id: `request-${requestedAt.getTime()}`,
          estateName: estate.name,
          factory: collectionFactory,
          estimatedWeightKg: collectionWeight,
          requestedAt: requestedAt.toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
          }),
          status: "pending" as const,
        }
      : null;

  if (!estate) {
    return (
      <Screen style={styles.screen}>
        <View style={styles.notFound}>
          <Ionicons name="leaf-outline" size={36} color={colors.brandDark} />
          <AppText variant="subHeading" style={styles.notFoundTitle}>
            Estate not found
          </AppText>
          <AppText variant="bodySmall" style={styles.notFoundDescription}>
            This estate may have been removed from your account.
          </AppText>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.replace("/(estate-owner)/estates")}
            style={styles.backButton}
          >
            <AppText variant="label" style={styles.backButtonText}>
              Back to estates
            </AppText>
          </Pressable>
        </View>
      </Screen>
    );
  }

  const workersActionLabel = savedWorkers
    ? `${savedWorkers.filter((worker) => worker.present).length}/${savedWorkers.length} present`
    : "0/0 present";

  const callManager = async () => {
    try {
      await Linking.openURL(`tel:${estate.managerPhone}`);
    } catch {
      Alert.alert("Unable to call", "Calling is not available on this device.");
    }
  };

  const openCollectionRequest = () => {
    router.push({
      pathname: "/(shared)/collectionRequest",
      params: { estateId: estate.id },
    });
  };

  return (
    <>
    <Screen
      pageTitle="Estate"
      scroll>

      <EstateAvatarWithDetails
        name={estate.name}
        address={estate.location}
        area={`${estate.areaAcres} acres`}
        image={estate.imageSrc}
        size={52}
      />

      <View style={styles.quickActions}>
        <AppButton title="Fertilizers" width="half"  variant="secondary"/>
        <AppButton title="+Collection" width="half" variant="primary" onPress={openCollectionRequest}/>
        
      </View>

      {pendingCollection ? (
        <>
          <SectionHeading title="Ongoing collection" />
          <RequestListItem
            request={pendingCollection}
            title={pendingCollection.factory}
            showFactory={false}
            highlight
          />
        </>
      ) : null}

      <SectionHeading title="Factories" actionLabel={`${estate.factories.length} linked`} />
      <View style={styles.factoryList}>
        {estate.factories.map((factory) => (
          <View key={factory.name} style={styles.factoryRow}>
            <View style={styles.factoryIcon}>
              <Ionicons name="business-outline" size={18} color={colors.brandDark} />
            </View>
            <View style={styles.factoryDetails}>
              <AppText variant="bodySmall" style={styles.factoryName}>
                {factory.name}
              </AppText>
              <AppText variant="caption" style={styles.factoryAddress}>
                {factory.address}
              </AppText>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.sectionHeading}>
        <View>
          <AppText variant="sectionHeading" style={styles.sectionTitle}>
            Plucked tea
          </AppText>
          <AppText variant="caption" style={styles.sectionSubtitle}>
            Daily collected weight
          </AppText>
        </View>
        <View style={styles.periodBadge}>
          <Ionicons name="calendar-outline" size={14} color={colors.brandDark} />
          <AppText variant="caption" style={styles.periodText}>
            Last 7 days
          </AppText>
        </View>
      </View>
      <View style={styles.chartCard}>
        <WeeklyPluckedWeightChart weightsKg={estate.weeklyPluckedWeightsKg} />
      </View>

      <SectionHeading title="Estate manager" />
      <View style={styles.managerCard}>
        <Avatar name={estate.managerName} size={48} />
        <View style={styles.managerInfo}>
          <AppText variant="bodySmall" style={styles.managerName}>
            {estate.managerName}
          </AppText>
          <AppText variant="caption" style={styles.managerPhone}>
            {estate.managerPhone}
          </AppText>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Call ${estate.managerName}`}
          onPress={callManager}
          style={({ pressed }) => [
            styles.callButton,
            pressed && styles.pressed,
          ]}
        >
          <Ionicons name="call" size={17} color={colors.white} />
        </Pressable>
      </View>

      <SectionHeading
        title="Workers"
        actionLabel={workersActionLabel}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="View estate workers"
        onPress={() =>
          router.push({
            pathname: "/(estate-owner)/workers/[estateId]",
            params: { estateId: estate.id },
          })
        }
        style={({ pressed }) => [styles.workersCard, pressed && styles.pressed]}
      >
        <View style={styles.workersIcon}>
          <Ionicons name="people-outline" size={20} color={colors.brandDark} />
        </View>
        <View style={styles.workersInfo}>
          <AppText variant="bodySmall" style={styles.workersCount}>
            {savedWorkers
              ? `${savedWorkers.filter((worker) => worker.present).length} of ${savedWorkers.length} workers present`
              : "0 workers added"}
          </AppText>
          <AppText variant="caption" style={styles.workersHint}>
            Manage workers and attendance
          </AppText>
        </View>
        <Ionicons
          name="chevron-forward"
          size={18}
          color={colors.text.tertiary}
        />
      </Pressable>

      <SectionHeading title="Recent activities" />
      <View style={[styles.activityCard, styles.lastCard]}>
        {estate.recentActivities.map((activity, index) => (
          <View
            key={activity.id}
            style={[
              styles.activityRow,
              index < estate.recentActivities.length - 1 && styles.activityDivider,
            ]}
          >
            <View style={styles.activityIcon}>
              <Ionicons name="leaf-outline" size={15} color={colors.brandDark} />
            </View>
            <View style={styles.activityInfo}>
              <AppText variant="bodySmall" style={styles.activityDescription}>
                {activity.description}
              </AppText>
              <AppText variant="caption" style={styles.activityFactory}>
                {activity.factory}
              </AppText>
            </View>
            <AppText variant="caption" style={styles.activityTime}>
              {activity.timeAgo}
            </AppText>
          </View>
        ))}
      </View>

    </Screen>
    </>
  );
}

function SectionHeading({
  title,
  actionLabel,
}: {
  title: string;
  actionLabel?: string;
}) {
  return (
    <View style={styles.sectionHeading}>
      <AppText variant="sectionHeading" style={styles.sectionTitle}>
        {title}
      </AppText>
      {actionLabel ? (
        <AppText variant="caption" style={styles.sectionAction}>
          {actionLabel}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    paddingTop: spacing.sm,
  },
  topBar: {
    minHeight: 28,
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  pageTitle: {
    color: colors.text.primary,
    fontWeight: "500",
  },
  quickActions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginLeft: 62,
    marginBottom: spacing.md,
  },
  quickAction: {
    minHeight: 40,
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    borderRadius: 14,
    backgroundColor: colors.backgroundGray,
  },
  quickActionText: {
    color: colors.text.primary,
    fontWeight: "500",
  },
  pressed: {
    opacity: 0.78,
  },
  sectionHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    color: colors.text.primary,
  },
  sectionSubtitle: {
    marginTop: 2,
    color: colors.text.secondary,
  },
  sectionAction: {
    color: colors.brandDark,
    fontWeight: "600",
  },
  factoryList: {
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: 18,
    backgroundColor: colors.white,
  },
  factoryRow: {
    minHeight: 68,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.light,
  },
  factoryIcon: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: colors.brandSurface,
  },
  factoryDetails: {
    flex: 1,
    gap: 3,
  },
  factoryName: {
    color: colors.text.primary,
    fontWeight: "600",
  },
  factoryAddress: {
    color: colors.text.secondary,
  },
  periodBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: colors.brandBorder,
    borderRadius: 99,
    backgroundColor: colors.brandSurface,
  },
  periodText: {
    color: colors.brandDark,
    fontWeight: "600",
  },
  chartCard: {
    overflow: "hidden",
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: 20,
    backgroundColor: colors.white,
  },
  managerCard: {
    minHeight: 76,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: 18,
    backgroundColor: colors.white,
  },
  managerInfo: {
    flex: 1,
    gap: spacing.xs,
    marginLeft: spacing.sm,
  },
  managerName: {
    color: colors.text.primary,
    fontWeight: "600",
  },
  managerPhone: {
    color: colors.text.secondary,
  },
  callButton: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 15,
    backgroundColor: colors.success,
  },
  workersCard: {
    minHeight: 72,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: 18,
    backgroundColor: colors.white,
  },
  workersIcon: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: colors.brandSurface,
  },
  workersInfo: {
    flex: 1,
    gap: 3,
    marginLeft: spacing.sm,
  },
  workersCount: {
    color: colors.text.primary,
    fontWeight: "600",
  },
  workersHint: {
    color: colors.text.secondary,
  },
  activityCard: {
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: 18,
    backgroundColor: colors.white,
  },
  lastCard: {
    marginBottom: spacing.xl,
  },
  activityRow: {
    minHeight: 68,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  activityDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.light,
  },
  activityIcon: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: colors.brandSurface,
  },
  activityInfo: {
    flex: 1,
    gap: 3,
  },
  activityDescription: {
    color: colors.text.primary,
  },
  activityFactory: {
    color: colors.text.secondary,
  },
  activityTime: {
    color: colors.text.tertiary,
  },
  notFound: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  notFoundTitle: {
    marginTop: spacing.md,
    color: colors.text.primary,
  },
  notFoundDescription: {
    marginTop: spacing.xs,
    color: colors.text.secondary,
    textAlign: "center",
  },
  backButton: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 16,
    backgroundColor: colors.brandSurface,
  },
  backButtonText: {
    color: colors.brandDark,
  },
});
