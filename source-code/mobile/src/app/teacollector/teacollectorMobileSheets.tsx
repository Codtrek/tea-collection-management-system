import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Sheet } from '@/components/ui/demo-teacollector-sheet';
import { DetailRow } from '@/components/ui/demo-teacollector-detail-row';
import { Chip } from '@/components/forms';
import { FormField as Field, FormInput as Input, FormSelect as Select } from '@/components/forms';
import { Btn } from '@/components/ui/demo-teacollector-button';
import { Pill } from '@/components/ui/demo-teacollector-pill';
import { STATUS_STYLE } from '@/theme/teacollector-statusStyle';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';
import * as ImagePicker from 'expo-image-picker';

const c = {
  forest: colors.primary,
  forestDeep: colors.text.primary,
  mist: colors.surface,
  amber: colors.warning,
  amberDeep: colors.warning,
  line: colors.border.light,
  ink: colors.text.primary,
  muted: colors.text.muted,
  sageDeep: colors.text.muted,
} as const;

const fontDisplay = { fontFamily: fonts.display };
const fontDefault = { fontFamily: fonts.default };

const teaWeight = (weight: number | null | undefined) => `${weight || 0} kg`;

const RECEIVING_OFFICERS = ["K. Abeysekera", "M. Rathnayake", "S. Weerasinghe", "T. Gunasekara"];
const PICKUP_REASONS = ["Estate not ready", "Road blocked", "Vehicle issue", "Other"];

export const FertDetailsSheet = ({ open, request, onClose }: any) => {
  if (!request) return null;
  return (
    <Sheet open={open} onClose={onClose}>
      <Text style={{
        fontFamily: fontDefault.fontFamily,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: 1.8,
        fontSize: 11,
        color: c.sageDeep,
      }}>
        Fertilizer Request
      </Text>
      <Text style={{
        fontFamily: fontDisplay.fontFamily,
        fontWeight: '600',
        marginTop: 2,
        marginBottom: 12,
        fontSize: 20,
      }}>{request.estateName}</Text>
      <DetailRow k="Owner" v={request.owner} />
      <DetailRow k="Phone" v={request.phone} />
      <DetailRow k="Fertilizer Type" v={request.fertilizerType} />
      <DetailRow k="Quantity" v={`${request.quantity} kg`} />
      <DetailRow k="Requested" v={request.requestedAt} />
      <DetailRow k="Status" v={STATUS_STYLE[request.status].label} />
      {request.notes && <DetailRow k="Notes" v={request.notes} />}
      <Btn variant="ghost" block style={{ marginTop: 16 }} onPress={onClose}>Close</Btn>
    </Sheet>
  );
};

export const LoadFertSheet = ({ open, request, onClose, onConfirm }: any) => {
  const [notes, setNotes] = useState('');
  if (!request) return null;
  return (
    <Sheet open={open} onClose={onClose}>
      <Text style={{
        fontFamily: fontDefault.fontFamily,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: 1.8,
        fontSize: 11,
        color: c.sageDeep,
      }}>
        Load Fertilizer
      </Text>
      <Text style={{
        fontFamily: fontDisplay.fontFamily,
        fontWeight: '600',
        marginTop: 2,
        marginBottom: 12,
        fontSize: 20,
      }}>{request.estateName}</Text>
      
      <View style={{
        borderRadius: 14,
        padding: 14,
        marginBottom: 14,
        backgroundColor: c.mist,
        borderWidth: 1,
        borderColor: c.line,
      }}>
        <DetailRow k="Fertilizer" v={request.fertilizerType} />
        <DetailRow k="Quantity" v={`${request.quantity} kg`} />
        <DetailRow k="Destination" v={request.estateName} />
      </View>

      <Field label="Loading Notes (optional)">
        <TextInput 
          style={{
            borderRadius: 14,
            borderWidth: 1.5,
            borderColor: c.line,
            paddingHorizontal: 12,
            paddingVertical: 10,
            fontSize: 15,
            height: 64,
            textAlignVertical: 'top',
          }}
          multiline
          numberOfLines={3}
          placeholder="Any loading details..."
          value={notes}
          onChangeText={setNotes}
        />
      </Field>

      <Btn variant="primary" block onPress={onConfirm}>
        Confirm Loaded
      </Btn>
    </Sheet>
  );
};

export const DeliverFertSheet = ({ open, request, onClose, onConfirm }: any) => {
  if (!request) return null;
  return (
    <Sheet open={open} onClose={onClose}>
      <Text style={{
        fontFamily: fontDefault.fontFamily,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: 1.8,
        fontSize: 11,
        color: c.sageDeep,
      }}>
        Deliver to Estates
      </Text>
      <Text style={{
        fontFamily: fontDisplay.fontFamily,
        fontWeight: '600',
        marginTop: 2,
        marginBottom: 12,
        fontSize: 20,
      }}>{request.estateName}</Text>
      
      <View style={{
        borderRadius: 14,
        padding: 14,
        marginBottom: 14,
        backgroundColor: c.mist,
        borderWidth: 1,
        borderColor: c.line,
      }}>
        <DetailRow k="Fertilizer" v={request.fertilizerType} />
        <DetailRow k="Quantity" v={`${request.quantity} kg`} />
      </View>

      <Btn variant="primary" block onPress={onConfirm}>
        Confirm Delivered
      </Btn>
    </Sheet>
  );
};

export const PickupSheet = ({ open, stop, onClose, onAccept, onDecline }: any) => {
  if (!stop) return null;
  return (
    <Sheet open={open} onClose={onClose}>
      <Text style={{
        fontFamily: fontDefault.fontFamily,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: 1.8,
        fontSize: 11,
        color: c.sageDeep,
      }}>Pickup request</Text>
      <Text style={{
        fontFamily: fontDisplay.fontFamily,
        fontWeight: '600',
        marginTop: 2,
        marginBottom: 12,
        fontSize: 20,
      }}>{stop.name}</Text>

      <View style={{
        backgroundColor: colors.surface,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: colors.border.light,
        paddingHorizontal: 14,
        paddingVertical: 12,
        marginBottom: 16,
      }}>
        <DetailRow k="Owner" v={stop.owner} />
        <DetailRow k="Phone" v={stop.phone} />
        {stop.estNormalWeight > 0 && <DetailRow k="Normal tea" v={teaWeight(stop.estNormalWeight)} />}
        {stop.estSupperWeight > 0 && <DetailRow k="Supper tea" v={teaWeight(stop.estSupperWeight)} />}
        {stop.notes && <DetailRow k="Notes" v={stop.notes} />}
      </View>

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Btn variant="danger" block onPress={onDecline}>Decline</Btn>
        </View>
        <View style={{ flex: 1 }}>
          <Btn variant="primary" block onPress={onAccept}>Accept Pickup</Btn>
        </View>
      </View>
    </Sheet>
  );
};

export const DeclineSheet = ({ open, onClose, onConfirm }: any) => {
  const [reason, setReason] = useState<string | null>(null);
  const [note, setNote] = useState('');

  useEffect(() => {
    if (open) {
      setReason(null);
      setNote('');
    }
  }, [open]);

  return (
    <Sheet open={open} onClose={onClose}>
      <Text style={{
        fontFamily: fontDisplay.fontFamily,
        fontWeight: '600',
        marginBottom: 4,
        fontSize: 20,
      }}>Decline pickup</Text>
      <Text style={{ fontSize: 15, marginBottom: 14, color: c.muted }}>Select a reason — this is required.</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {PICKUP_REASONS.map((r) => (
          <Chip
            key={r}
            active={reason === r}
            onPress={() => setReason(reason === r ? null : r)}
          >
            {r}
          </Chip>
        ))}
      </View>
      <Field label="Add a note (optional)">
        <TextInput 
          style={{
            borderRadius: 14,
            borderWidth: 1.5,
            borderColor: colors.border.light,
            paddingHorizontal: 12,
            paddingVertical: 10,
            fontSize: 15,
            height: 64,
            textAlignVertical: 'top',
          }}
          multiline
          numberOfLines={3}
          placeholder="Anything the factory should know..."
          value={note}
          onChangeText={setNote}
        />
      </Field>
      <Btn
        variant="primary"
        block
        disabled={!reason}
        onPress={() => {
          if (reason) {
            onConfirm(reason, note);
          }
        }}
      >
        Confirm Decline
      </Btn>
    </Sheet>
  );
};

export const CancelPickupSheet = ({ open, onBack, onConfirm }: any) => {
  const [reason, setReason] = useState<string | null>(null);
  const [note, setNote] = useState('');

  useEffect(() => {
    if (open) {
      setReason(null);
      setNote('');
    }
  }, [open]);

  return (
    <Sheet open={open} onClose={onBack}>
      <Text style={{
        fontFamily: fontDisplay.fontFamily,
        fontWeight: '600',
        marginBottom: 4,
        fontSize: 20,
      }}>Cancel pickup</Text>
      <Text style={{ fontSize: 15, marginBottom: 14, color: c.muted }}>
        Select a reason — this is required.
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
        {PICKUP_REASONS.map((pickupReason) => (
          <Chip
            key={pickupReason}
            active={reason === pickupReason}
            onPress={() => setReason(reason === pickupReason ? null : pickupReason)}
          >
            {pickupReason}
          </Chip>
        ))}
      </View>
      <Field label="Add a note (optional)">
        <TextInput
          style={{
            borderRadius: 14,
            borderWidth: 1.5,
            borderColor: colors.border.light,
            paddingHorizontal: 12,
            paddingVertical: 10,
            fontSize: 15,
            height: 64,
            textAlignVertical: 'top',
          }}
          multiline
          numberOfLines={3}
          placeholder="Anything the factory should know..."
          value={note}
          onChangeText={setNote}
        />
      </Field>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Btn variant="danger" block disabled={!reason} onPress={() => reason && onConfirm(reason, note)}>
            Confirm Cancel
          </Btn>
        </View>
        <View style={{ flex: 1 }}>
          <Btn variant="ghost" block onPress={onBack}>Back</Btn>
        </View>
      </View>
    </Sheet>
  );
};

export const ArrivedSheet = ({ open, stop, onClose, onStartCollection, onCall, onCancelPickup }: any) => {
  if (!stop) return null;
  return (
    <Sheet open={open} onClose={onClose}>
      <View style={{ flexDirection: 'row', alignItems: 'stretch', gap: 10, marginBottom: 10 }}>
        <View style={{ flex: 1, minHeight: 52, justifyContent: 'space-between' }}>
          <Text style={{
            fontFamily: fontDefault.fontFamily,
            fontWeight: 'bold',
            textTransform: 'uppercase',
            letterSpacing: 1.8,
            fontSize: 11,
            color: c.sageDeep,
          }}>Arrived at estate</Text>
          <Text style={{
            fontFamily: fontDisplay.fontFamily,
            fontWeight: '600',
            fontSize: 20,
          }}>{stop.name}</Text>
        </View>
        <Btn variant="forest" onPress={onCall} style={{ minWidth: 92, height: 52 }}>📞 Call</Btn>
      </View>

      <View style={{
        borderRadius: 14,
        padding: 14,
        marginBottom: 14,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border.light,
      }}>
        <Text style={{
          fontWeight: '600',
          fontSize: 15,
          marginBottom: 8,
          color: c.forestDeep,
        }}>Tea Collection</Text>
        <DetailRow k="Owner" v={stop.owner} />
        <DetailRow k="Phone" v={stop.phone} />
        {stop.estNormalWeight > 0 && <DetailRow k="Normal tea" v={teaWeight(stop.estNormalWeight)} />}
        {stop.estSupperWeight > 0 && <DetailRow k="Supper tea" v={teaWeight(stop.estSupperWeight)} />}
      </View>

      <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
        <View style={{ flex: 1 }}>
          <Btn variant="danger" block onPress={onCancelPickup}>Cancel Pickup</Btn>
        </View>
        <View style={{ flex: 1 }}>
          <Btn variant="primary" block onPress={onStartCollection}>Start Collection</Btn>
        </View>
      </View>
    </Sheet>
  );
};

export const CollectSheet = ({ open, stop, onClose, onSubmit }: any) => {
  const [normalWeight, setNormalWeight] = useState("");
  const [supperWeight, setSupperWeight] = useState("");
  const [normalPhotoUri, setNormalPhotoUri] = useState<string>();
  const [supperPhotoUri, setSupperPhotoUri] = useState<string>();
  const [remark, setRemark] = useState('');
  
  useEffect(() => {
    if (stop) {
      setNormalWeight("");
      setSupperWeight("");
      setNormalPhotoUri(undefined);
      setSupperPhotoUri(undefined);
      setRemark('');
    }
  }, [stop?.id]);

  const addPhoto = async (setPhotoUri: (uri: string) => void) => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]?.uri) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  if (!stop) return null;
  const hasNormalTea = (stop.estNormalWeight || 0) > 0;
  const hasSupperTea = (stop.estSupperWeight || 0) > 0;
  const showBothTeaTypes = !hasNormalTea && !hasSupperTea;

  return (
    <Sheet open={open} onClose={onClose}>
      <Text style={{
        fontFamily: fontDefault.fontFamily,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: 1.8,
        fontSize: 11,
        color: c.sageDeep,
      }}>{stop.name}</Text>
      <Text style={{
        fontFamily: fontDisplay.fontFamily,
        fontWeight: '600',
        marginTop: 2,
        marginBottom: 12,
        fontSize: 20,
      }}>Log Tea Collection</Text>

      {(hasNormalTea || showBothTeaTypes) && (
        <>
          <Field label="Normal tea weight (kg)">
            <Input
              value={normalWeight}
              onChangeText={setNormalWeight}
              keyboardType="decimal-pad"
              placeholder="Enter Normal tea weight"
              placeholderTextColor={c.muted}
            />
          </Field>

          <Btn variant="ghost" block style={{ marginBottom: 14 }} onPress={() => addPhoto((uri) => setNormalPhotoUri(uri))}>
            {normalPhotoUri ? "Normal tea bag photo added" : "Add Normal Tea Bags Photo"}
          </Btn>
        </>
      )}

      {(hasSupperTea || showBothTeaTypes) && (
        <>
          <Field label="Supper tea weight (kg)">
            <Input
              value={supperWeight}
              onChangeText={setSupperWeight}
              keyboardType="decimal-pad"
              placeholder="Enter Supper tea weight"
              placeholderTextColor={c.muted}
            />
          </Field>

          <Btn variant="ghost" block style={{ marginBottom: 14 }} onPress={() => addPhoto((uri) => setSupperPhotoUri(uri))}>
            {supperPhotoUri ? "Supper tea bag photo added" : "Add Supper Tea Bags Photo"}
          </Btn>
        </>
      )}
      
      <Field label="Remarks (optional)">
        <TextInput 
          style={{
            borderRadius: 14,
            borderWidth: 1.5,
            borderColor: c.line,
            paddingHorizontal: 12,
            paddingVertical: 10,
            fontSize: 15,
            height: 64,
            textAlignVertical: 'top',
          }}
          multiline
          numberOfLines={3}
          placeholder="Leaf quality, moisture, anything unusual..."
          value={remark}
          onChangeText={setRemark}
        />
      </Field>
      
      <View style={{
        borderRadius: 14,
        paddingHorizontal: 14,
        paddingVertical: 12,
        marginBottom: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: "#F3EFE2",
      }}>
        <Text style={{
          fontWeight: '600',
          fontSize: 12,
          color: c.muted,
        }}>Estate Owner Confirmation</Text>
        <Pill status="waiting" />
      </View>
      
      <Btn
        variant="primary"
        block
        onPress={() => onSubmit({ normal: normalWeight, supper: supperWeight, normalPhotoUri, supperPhotoUri })}
      >
        Submit Collection
      </Btn>
    </Sheet>
  );
};

type ConfirmSheetProps = {
  open: boolean;
  weights: { normal: number; supper: number };
  stop?: {
    name: string;
    estNormalWeight?: number;
    estSupperWeight?: number;
  } | null;
  onBack: () => void;
  onClose: () => void;
};

export const ConfirmSheet = ({ open, weights, stop, onBack, onClose }: ConfirmSheetProps) => {
  const normal = weights?.normal || 0;
  const supper = weights?.supper || 0;
  const estateNormal = stop?.estNormalWeight || 0;
  const estateSupper = stop?.estSupperWeight || 0;
  const weightRows = [
    { label: "Normal", estate: estateNormal, collector: normal },
    { label: "Supper", estate: estateSupper, collector: supper },
    { label: "Total", estate: estateNormal + estateSupper, collector: normal + supper },
  ];

  return (
    <Sheet open={open} onClose={onClose}>
      <Text style={{
        fontFamily: fontDisplay.fontFamily,
        fontWeight: '600',
        marginBottom: 4,
        fontSize: 20,
      }}>Estate Weight Confirmation</Text>
      {stop?.name ? (
        <Text style={{ fontSize: 14, fontWeight: '600', color: c.sageDeep }}>
          {stop.name}
        </Text>
      ) : null}
      
      <View style={{ flexDirection: 'row', gap: 10, paddingVertical: 16 }}>
        {[
          { key: "estate", title: "Estate measured", field: "estate" as const },
          { key: "collector", title: "Tea collector", field: "collector" as const },
        ].map((column) => (
          <View
            key={column.key}
            style={{
              flex: 1,
              padding: 12,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: c.line,
              backgroundColor: c.mist,
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: '700', color: c.forestDeep, marginBottom: 10 }}>
              {column.title}
            </Text>
            {weightRows.map((row) => (
              <View
                key={row.label}
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingVertical: 5,
                  borderTopWidth: row.label === "Normal" ? 0 : 1,
                  borderTopColor: c.line,
                }}
              >
                <Text style={{ fontSize: 12, color: c.muted }}>{row.label}</Text>
                <Text style={{ fontSize: 12, fontWeight: row.label === "Total" ? '700' : '500', color: c.ink }}>
                  {row[column.field].toFixed(1)} kg
                </Text>
              </View>
            ))}
          </View>
        ))}
      </View>

      <View style={{ paddingBottom: 8 }}>
        <Pill status="waiting">Waiting for confirmation…</Pill>
        <Text style={{
          textAlign: 'center',
          fontSize: 15,
          marginTop: 10,
          color: c.muted,
        }}>
          Sent to the estate owner. This stop moves to Tea Loaded — you can head to the factory once you've picked up everything on your list.
        </Text>
      </View>

      <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
        <View style={{ flex: 1 }}>
          <Btn variant="ghost" block onPress={onBack}>Back</Btn>
        </View>
        <View style={{ flex: 1 }}>
          <Btn variant="primary" block onPress={onClose}>Continue Collecting</Btn>
        </View>
      </View>
    </Sheet>
  );
};

export const FactoryMapSheet = ({ open, stopCount, totalWeight, onClose, onArrived }: any) => {
  return (
    <Sheet open={open} onClose={onClose}>
      <Text style={{
        fontFamily: fontDefault.fontFamily,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: 1.8,
        fontSize: 11,
        color: c.sageDeep,
      }}>
        {stopCount} stop{stopCount > 1 ? "s" : ""} loaded · {totalWeight} kg
      </Text>
      <Text style={{
        fontFamily: fontDisplay.fontFamily,
        fontWeight: '600',
        marginTop: 2,
        marginBottom: 12,
        fontSize: 20,
      }}>Route to Kotmale MPT Factory</Text>

      <View style={{
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: 16,
        height: 200,
        backgroundColor: "#EAE5D5",
        borderWidth: 1,
        borderColor: c.line,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <Text style={{ color: c.muted, fontSize: 15 }}>Map View</Text>
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          marginTop: 8,
          paddingHorizontal: 10,
          paddingVertical: 4,
          borderRadius: 20,
          backgroundColor: 'rgba(253,251,245,0.92)',
        }}>
          <Ionicons name="locate-outline" size={12} color={c.forest} />
          <Text style={{ fontWeight: '600', fontSize: 12, color: c.forest }}>Live location</Text>
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
        <View style={{
          flex: 1,
          borderRadius: 16,
          padding: 14,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          backgroundColor: c.mist,
          borderWidth: 1,
          borderColor: c.line,
        }}>
          <Ionicons name="map-outline" size={17} color={c.forest} />
          <View>
            <Text style={{
              fontFamily: fontDisplay.fontFamily,
              fontWeight: 'bold',
              fontSize: 16,
              color: c.forestDeep,
            }}>8.4 km</Text>
            <Text style={{ fontSize: 12, color: c.muted }}>Distance</Text>
          </View>
        </View>
        <View style={{
          flex: 1,
          borderRadius: 16,
          padding: 14,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          backgroundColor: c.mist,
          borderWidth: 1,
          borderColor: c.line,
        }}>
          <Ionicons name="time-outline" size={17} color={c.forest} />
          <View>
            <Text style={{
              fontFamily: fontDisplay.fontFamily,
              fontWeight: 'bold',
              fontSize: 16,
              color: c.forestDeep,
            }}>18 min</Text>
            <Text style={{ fontSize: 12, color: c.muted }}>Est. arrival</Text>
          </View>
        </View>
      </View>

      <Btn variant="ghost" block style={{ marginBottom: 10 }}>
        Open Turn-by-Turn in Google Maps
      </Btn>
      <Btn variant="primary" block onPress={onArrived}>I've Reached the Factory</Btn>
    </Sheet>
  );
};

export const DeliverySheet = ({ open, stops, officer, setOfficer, onClose, onSubmit }: any) => {
  const normalTotal = stops.reduce((sum: number, s: any) => sum + (s.actualNormalWeight || 0), 0);
  const supperTotal = stops.reduce((sum: number, s: any) => sum + (s.actualSupperWeight || 0), 0);
  const total = normalTotal + supperTotal;
  return (
    <Sheet open={open} onClose={onClose}>
      <Text style={{
        fontFamily: fontDefault.fontFamily,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: 1.8,
        fontSize: 11,
        color: c.sageDeep,
      }}>Kotmale MPT Factory</Text>
      <Text style={{
        fontFamily: fontDisplay.fontFamily,
        fontWeight: '600',
        marginTop: 2,
        marginBottom: 12,
        fontSize: 20,
      }}>Submit Collection</Text>

      <Field label="Tea from these estates">
        <ScrollView horizontal showsHorizontalScrollIndicator>
          <View style={{
            borderRadius: 16,
            padding: 12,
            backgroundColor: c.mist,
            borderWidth: 1,
            borderColor: c.line,
          }}>
            <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: c.line, paddingBottom: 8 }}>
              {[
                { label: "Factory", width: 150 },
                { label: "Estate", width: 150 },
                { label: "Estate normal", width: 115 },
                { label: "Collector normal", width: 125 },
                { label: "Normal difference", width: 130 },
                { label: "Estate supper", width: 115 },
                { label: "Collector supper", width: 125 },
                { label: "Supper difference", width: 130 },
              ].map((column) => (
                <Text
                  key={column.label}
                  style={{ width: column.width, paddingHorizontal: 4, fontSize: 12, fontWeight: '700', color: c.forestDeep }}
                >
                  {column.label}
                </Text>
              ))}
            </View>
            {stops.map((s: any, index: number) => (
              <View
                key={s.id}
                style={{
                  flexDirection: 'row',
                  paddingVertical: 9,
                  borderBottomWidth: index === stops.length - 1 ? 0 : 1,
                  borderBottomColor: c.line,
                }}
              >
                {(() => {
                  const estateNormal = s.estNormalWeight || 0;
                  const collectorNormal = s.actualNormalWeight || 0;
                  const normalDifference = Math.round((collectorNormal - estateNormal) * 10) / 10;
                  const estateSupper = s.estSupperWeight || 0;
                  const collectorSupper = s.actualSupperWeight || 0;
                  const supperDifference = Math.round((collectorSupper - estateSupper) * 10) / 10;
                  const cells = [
                    { value: "Kotmale MPT Factory", width: 150, color: c.ink },
                    { value: s.name, width: 150, color: c.ink },
                    { value: `${estateNormal.toFixed(1)} kg`, width: 115, color: c.forest },
                    { value: `${collectorNormal.toFixed(1)} kg`, width: 125, color: c.forest },
                    {
                      value: `${normalDifference > 0 ? "+" : ""}${normalDifference.toFixed(1)} kg`,
                      width: 130,
                      color: normalDifference === 0 ? c.forest : colors.error,
                    },
                    { value: `${estateSupper.toFixed(1)} kg`, width: 115, color: c.forest },
                    { value: `${collectorSupper.toFixed(1)} kg`, width: 125, color: c.forest },
                    {
                      value: `${supperDifference > 0 ? "+" : ""}${supperDifference.toFixed(1)} kg`,
                      width: 130,
                      color: supperDifference === 0 ? c.forest : colors.error,
                    },
                  ];

                  return cells.map((cell, cellIndex) => (
                  <Text
                    key={`${s.id}-${cellIndex}`}
                    style={{
                      width: cell.width,
                      paddingHorizontal: 4,
                      fontSize: 13,
                      color: cell.color,
                      fontWeight: cellIndex === 4 || cellIndex === 7 ? '700' : '400',
                    }}
                  >
                    {cell.value}
                  </Text>
                  ));
                })()}
              </View>
            ))}
          </View>
        </ScrollView>
      </Field>

      <DetailRow k="Total collection weight" v={`${total} kg`} />
      <DetailRow k="Normal tea total" v={`${normalTotal} kg`} />
      <DetailRow k="Supper tea total" v={`${supperTotal} kg`} />

      <View style={{ marginTop: 14 }}>
        <Field label="Receiving officer">
          <Select
            value={officer}
            onChange={setOfficer}
            placeholder="Select receiving officer"
            options={RECEIVING_OFFICERS}
          />
        </Field>
      </View>

      <Btn variant="primary" block style={{ marginTop: 8 }} disabled={!officer} onPress={() => onSubmit(total)}>
        Submit to Factory
      </Btn>
      {!officer && (
        <Text style={{
          fontSize: 12,
          textAlign: 'center',
          marginTop: 8,
          color: c.muted,
        }}>Select a receiving officer to continue</Text>
      )}
    </Sheet>
  );
};

export const FactoryWeightSheet = ({ open, collectionWeight, factoryWeight, onClose, onApprove, onReportMismatch }: any) => {
  const diff = factoryWeight - collectionWeight;
  const matches = diff === 0;
  return (
    <Sheet open={open} onClose={onClose}>
      <Text style={{
        fontFamily: fontDefault.fontFamily,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: 1.8,
        fontSize: 11,
        color: c.sageDeep,
      }}>Kotmale MPT Factory</Text>
      <Text style={{
        fontFamily: fontDisplay.fontFamily,
        fontWeight: '600',
        marginTop: 2,
        marginBottom: 12,
        fontSize: 20,
      }}>Factory Weight Received</Text>
      <DetailRow k="Your collection weight" v={`${collectionWeight} kg`} />
      <DetailRow k="Factory recorded weight" v={`${factoryWeight} kg`} />
      <DetailRow k="Difference" v={`${diff > 0 ? "+" : ""}${diff} kg`} />
      {!matches && (
        <View style={{
          borderRadius: 14,
          paddingHorizontal: 14,
          paddingVertical: 12,
          marginTop: 12,
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: 10,
          backgroundColor: "#FBEFD8",
        }}>
          <Ionicons name="alert-circle-outline" size={16} color={c.amberDeep} style={{ marginTop: 2 }} />
          <Text style={{
            fontSize: 12,
            color: c.amberDeep,
            flex: 1,
          }}>
            The factory's figure differs from what you recorded. Approve it if this looks right, or report it for review.
          </Text>
        </View>
      )}
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
        <View style={{ flex: 1 }}>
          <Btn variant="danger" block onPress={onReportMismatch}>Report Mismatch</Btn>
        </View>
        <View style={{ flex: 1 }}>
          <Btn variant="primary" block onPress={onApprove}>Approve Weight</Btn>
        </View>
      </View>
    </Sheet>
  );
};

export const MismatchSheet = ({ open, onClose, onSubmit }: any) => {
  const [reason, setReason] = useState<string | null>(null);
  const [explanation, setExplanation] = useState('');
  
  return (
    <Sheet open={open} onClose={onClose}>
      <Text style={{
        fontFamily: fontDisplay.fontFamily,
        fontWeight: '600',
        marginBottom: 4,
        fontSize: 20,
      }}>Report Weight Mismatch</Text>
      <Text style={{ fontSize: 15, marginBottom: 14, color: c.muted }}>What do you think caused the difference?</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {["Scale calibration", "Moisture loss in transit", "Miscount at estate", "Other"].map((r) => (
          <Chip key={r} active={reason === r} onPress={() => setReason(r)}>{r}</Chip>
        ))}
      </View>
      <Field label="Explanation">
        <TextInput 
          style={{
            borderRadius: 14,
            borderWidth: 1.5,
            borderColor: c.line,
            paddingHorizontal: 12,
            paddingVertical: 10,
            fontSize: 15,
            height: 80,
            textAlignVertical: 'top',
          }}
          multiline
          numberOfLines={4}
          placeholder="Add any detail for the receiving officer..."
          value={explanation}
          onChangeText={setExplanation}
        />
      </Field>
      <Btn variant="primary" block onPress={() => onSubmit(reason || "Other")}>Submit for Review</Btn>
    </Sheet>
  );
};

export const RegisterSheet = ({ open, onClose }: any) => {
  return (
    <Sheet open={open} onClose={onClose}>
      <Text style={{
        fontFamily: fontDisplay.fontFamily,
        fontWeight: '600',
        marginBottom: 4,
        fontSize: 20,
      }}>Register New Estate</Text>
      <Text style={{ fontSize: 15, marginBottom: 12, color: c.muted }}>For unregistered owners offering tea today.</Text>
      
      <Field label="Estate name"><Input placeholder="e.g. Sunhill Estate" /></Field>
      <Field label="Owner name"><Input placeholder="Full name" /></Field>
      <Field label="Phone"><Input placeholder="07X XXX XXXX" keyboardType="phone-pad" /></Field>
      <Field label="Address"><Input placeholder="Village, district" /></Field>
      <Field label="GPS location"><Input value="📍 Auto-captured" editable={false} style={{ color: c.muted }} /></Field>
      <Field label="Bank details (optional)"><Input placeholder="Bank, branch, account no." /></Field>
      <Field label="BR number (optional)"><Input placeholder="Business registration no." /></Field>
      
      <Btn variant="primary" block onPress={onClose}>Submit for Factory Approval</Btn>
    </Sheet>
  );
};
