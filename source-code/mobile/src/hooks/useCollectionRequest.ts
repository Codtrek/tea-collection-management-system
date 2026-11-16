import { useMemo, useState } from "react";

import type { CollectionRecord } from "@/types/collectionRequest";

const validationMessage =
  "Enter the plucker's name and a weight greater than zero.";

export function useCollectionRequest() {
  const [factory, setFactory] = useState<string>();
  const [collectionRecords, setCollectionRecords] = useState<CollectionRecord[]>([]);
  const [isAddRecordVisible, setIsAddRecordVisible] = useState(false);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [pluckerName, setPluckerName] = useState("");
  const [weight, setWeight] = useState("");
  const [formError, setFormError] = useState("");

  const totalWeight = useMemo(
    () => collectionRecords.reduce((total, record) => total + record.weightKg, 0),
    [collectionRecords]
  );

  const closeAddRecord = () => {
    setIsAddRecordVisible(false);
    setEditingRecordId(null);
    setPluckerName("");
    setWeight("");
    setFormError("");
  };

  const openAddRecord = () => {
    setEditingRecordId(null);
    setPluckerName("");
    setWeight("");
    setFormError("");
    setIsAddRecordVisible(true);
  };

  const openEditRecord = (record: CollectionRecord) => {
    setEditingRecordId(record.id);
    setPluckerName(record.pluckerName);
    setWeight(String(record.weightKg));
    setFormError("");
    setIsAddRecordVisible(true);
  };

  const validateRecordInput = () => {
    const trimmedName = pluckerName.trim();
    const weightKg = Number(weight);

    if (!trimmedName || !Number.isFinite(weightKg) || weightKg <= 0) {
      setFormError(validationMessage);
      return null;
    }

    return { trimmedName, weightKg };
  };

  const handleAddRecord = () => {
    const validatedValues = validateRecordInput();

    if (!validatedValues) {
      return;
    }

    setCollectionRecords((records) => [
      ...records,
      {
        id: `${Date.now()}-${records.length}`,
        pluckerName: validatedValues.trimmedName,
        weightKg: validatedValues.weightKg,
      },
    ]);

    closeAddRecord();
  };

  const handleSaveRecord = () => {
    const validatedValues = validateRecordInput();

    if (!validatedValues) {
      return;
    }

    setCollectionRecords((records) =>
      records.map((record) =>
        record.id === editingRecordId
          ? {
              ...record,
              pluckerName: validatedValues.trimmedName,
              weightKg: validatedValues.weightKg,
            }
          : record
      )
    );

    closeAddRecord();
  };

  const handleDeleteRecord = () => {
    if (!editingRecordId) {
      closeAddRecord();
      return;
    }

    setCollectionRecords((records) =>
      records.filter((record) => record.id !== editingRecordId)
    );
    closeAddRecord();
  };

  return {
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
  };
}
