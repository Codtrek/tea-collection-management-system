import { Alert, StyleSheet, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";

import { EstateAvatarWithDetails } from "@/components/estate";
import { CollectionRecordsList } from "@/components/collection-request/CollectionRecordsList";
import { CollectionRequestFormModal } from "@/components/collection-request/CollectionRequestFormModal";
import { factoryOptions } from "@/data/collectionRequest";
import { estateProfiles } from "@/data/estateOwnerEstates";
import { useCollectionRequest } from "@/hooks/useCollectionRequest";
import { AppButton, AppText, Dropdown, Screen, Stat } from "@/components/ui";
import { spacing } from "@/theme";

export default function CollectionRequest() {
  const { estateId: estateIdParam } =
    useLocalSearchParams<{ estateId?: string }>();
  const estate =
    estateProfiles.find((profile) => profile.id === estateIdParam) ??
    estateProfiles[0];
  const {
    factory,
    setFactory,
    collectionRecords,
    isAddRecordVisible,
    editingRecordId,
    pluckerName,
    setPluckerName,
    weight,
    setWeight,
    formError,
    totalWeight,
    closeAddRecord,
    openAddRecord,
    openEditRecord,
    handleAddRecord,
    handleSaveRecord,
    handleDeleteRecord,
  } = useCollectionRequest();

  const handleRequestPickup = () => {
    if (!factory) {
      Alert.alert("Factory required", "Select a factory for this pickup.");
      return;
    }

    if (totalWeight <= 0) {
      Alert.alert("Weight required", "Add at least one collection record.");
      return;
    }

    router.push({
      pathname: "/(estate-owner)/estate/[estateId]",
      params: {
        estateId: estate.id,
        collectionFactory:
          factoryOptions.find((option) => option.value === factory)?.label ??
          factory,
        collectionWeightKg: String(totalWeight),
        collectionRequestedAt: new Date().toISOString(),
      },
    });
  };

  return (
    <Screen
      scroll
      pageTitle="Collection Request"
    >
      <View style={styles.content}>
        <View>
          {/* <View style={styles.title}>
            <AppText variant="subHeading">Collection Request</AppText>
          </View> */}

          <EstateAvatarWithDetails
            name={estate.name}
            address={estate.location}
            area={`${estate.areaAcres} acres`}
            image={estate.imageSrc}
            size={52}
          />

          <View style={styles.requestFactoryAndDate}>
            <View style={styles.factory}>
              <AppText variant="bodySmall">Factory</AppText>
              <Dropdown
                accessibilityLabel="Select factory"
                options={factoryOptions}
                onChange={setFactory}
                placeholder="Select a factory"
                value={factory}
              />
            </View>

            {/* <View style={styles.date}>
              <AppText style={styles.fieldLabel}>Date</AppText>
              <AppText variant="body">{new Date().toLocaleDateString()}</AppText>
            </View> */}
          </View>

          <View style={styles.stats}>
            <Stat stat="Weight" value={`${totalWeight} kg`} />
            <Stat stat="Pluckers" value={String(collectionRecords.length)} />
          </View>

          <CollectionRecordsList
            records={collectionRecords}
            onEditRecord={openEditRecord}
          />
        </View>

        <View style={styles.actions}>
          <AppButton
            title="+ Add record"
            variant="secondary"
            width="half"
            onPress={openAddRecord}
          />
          <AppButton
            title="Request pickup"
            variant="primary"
            width="half"
            onPress={handleRequestPickup}
          />
        </View>
      </View>

      <CollectionRequestFormModal
        visible={isAddRecordVisible}
        editingRecordId={editingRecordId}
        pluckerName={pluckerName}
        weight={weight}
        formError={formError}
        onClose={closeAddRecord}
        onChangePluckerName={setPluckerName}
        onChangeWeight={setWeight}
        onSubmit={editingRecordId ? handleSaveRecord : handleAddRecord}
        onDelete={handleDeleteRecord}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
  title: {
    marginBottom: 20,
  },
  requestFactoryAndDate: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 16,
    marginBottom: 20,
  },
  factory: {
    flex: 1,
    gap: 8,
  },
  date: {
    gap: 8,
    paddingBottom: 12,
  },

  stats: {
    flexDirection: "row",
    gap: 50,
    marginBottom: 20,
  },
  actions: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: "auto",
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
});