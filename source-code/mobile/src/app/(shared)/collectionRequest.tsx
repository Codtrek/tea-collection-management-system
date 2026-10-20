import { StyleSheet, View } from "react-native";

import { EstateAvatarWithDetails } from "@/components/estate";
import { CollectionRecordsList } from "@/components/collection-request/CollectionRecordsList";
import { CollectionRequestFormModal } from "@/components/collection-request/CollectionRequestFormModal";
import { factoryOptions } from "@/data/collectionRequest";
import { useCollectionRequest } from "@/hooks/useCollectionRequest";
import { AppButton, AppText, Dropdown, Screen, Stat } from "@/components/ui";
import { spacing } from "@/theme";

export default function CollectionRequest() {
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
            name="Nuwara Eliya Estate"
            address="12-B, up road, Nuwara"
            area="100 acres"
            image="https://images.unsplash.com/photo-1506744038136-46273834b3fb?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1170&q=80"
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
            onPress={() => {}}
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