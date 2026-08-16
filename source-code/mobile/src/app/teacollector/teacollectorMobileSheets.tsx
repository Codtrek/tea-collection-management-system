import React, { useState } from 'react';
import { View, Text, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Sheet } from '@/components/ui/demo-teacollector-sheet';
import { DetailRow } from '@/components/ui/demo-teacollector-detail-row';
import { Chip } from '@/components/ui/demo-teacollector-chip';
import { Field, Input, Select } from '@/components/forms/demo-teacollector-fields';
import { Btn } from '@/components/ui/demo-teacollector-button';
import { Pill } from '@/components/ui/demo-teacollector-pill';
import { c, fontDisplay, fontMono, STATUS_STYLE } from '@/components/ui/demo-teacollector-theme';
import { colors } from '@/theme/colors';

const RECEIVING_OFFICERS = ["K. Abeysekera", "M. Rathnayake", "S. Weerasinghe", "T. Gunasekara"];

export const FertDetailsSheet = ({ open, request, onClose }: any) => {
  if (!request) return null;
  return (
    <Sheet open={open} onClose={onClose}>
      <Text style={{
        fontFamily: fontMono.fontFamily,
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
        fontFamily: fontMono.fontFamily,
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
        fontFamily: fontMono.fontFamily,
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
        fontFamily: fontMono.fontFamily,
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
        <DetailRow k="Estimated Weight" v={`${stop.estWeight} kg`} />
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
        {["Estate not ready", "Road blocked", "Vehicle issue", "Other"].map((r) => (
          <Chip key={r} active={reason === r} onPress={() => setReason(r)}>{r}</Chip>
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
      <Btn variant="primary" block onPress={() => onConfirm(reason || "Other")}>Confirm Decline</Btn>
    </Sheet>
  );
};

export const ArrivedSheet = ({ open, stop, onClose, onStartCollection, onCall }: any) => {
  if (!stop) return null;
  return (
    <Sheet open={open} onClose={onClose}>
      <Text style={{
        fontFamily: fontMono.fontFamily,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: 1.8,
        fontSize: 11,
        color: c.sageDeep,
      }}>Arrived at estate</Text>
      <Text style={{
        fontFamily: fontDisplay.fontFamily,
        fontWeight: '600',
        marginTop: 2,
        marginBottom: 12,
        fontSize: 20,
      }}>{stop.name}</Text>

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
        <DetailRow k="Estimated weight" v={`${stop.estWeight} kg`} />
      </View>

      <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
        <View style={{ flex: 1 }}>
          <Btn variant="primary" block onPress={onStartCollection}>Start Collection</Btn>
        </View>
        <Btn variant="forest"  onPress={onCall} style={{ minWidth: 92 }}>📞 Call</Btn>
      </View>
    </Sheet>
  );
};

export const CollectSheet = ({ open, stop, onClose, onSubmit }: any) => {
  const [type, setType] = useState("Green");
  const [weight, setWeight] = useState(stop ? String(stop.estWeight) : "");
  const [remark, setRemark] = useState('');
  
  if (!stop) return null;
  return (
    <Sheet open={open} onClose={onClose}>
      <Text style={{
        fontFamily: fontMono.fontFamily,
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
      
      <Field label="Actual weight (kg)">
        <Input 
          value={weight} 
          onChangeText={setWeight}
          keyboardType="decimal-pad"
          placeholder="Enter weight in kg"
        />
      </Field>
      
      <Field label="Tea type">
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {["Green", "Black", "White"].map((t) => (
            <Chip key={t} active={type === t} onPress={() => setType(t)}>{t}</Chip>
          ))}
        </View>
      </Field>
      
      <Btn variant="ghost" block style={{ marginBottom: 14 }}>Add Photo of Tea Bags</Btn>
      
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
      
      <Btn variant="primary" block onPress={() => onSubmit(weight)}>Submit Collection</Btn>
    </Sheet>
  );
};

export const ConfirmSheet = ({ open, weight, onClose }: any) => {
  const w = parseFloat(weight) || 0;
  return (
    <Sheet open={open} onClose={onClose}>
      <Text style={{
        fontFamily: fontDisplay.fontFamily,
        fontWeight: '600',
        marginBottom: 4,
        fontSize: 20,
      }}>Estate Weight Confirmation</Text>
      
      <View style={{ alignItems: 'center', paddingVertical: 16 }}>
        <View style={{
          width: 120,
          height: 120,
          borderRadius: 60,
          borderWidth: 10,
          borderColor: c.amber,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 12,
          backgroundColor: 'transparent',
        }}>
          <Text style={{
            fontFamily: fontDisplay.fontFamily,
            fontWeight: '700',
            fontSize: 20,
            color: c.forestDeep,
          }}>{w.toFixed(1)} kg</Text>
          <Text style={{
            fontFamily: fontMono.fontFamily,
            fontSize: 10,
            color: "#8A9082",
          }}>reported</Text>
        </View>
        
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
      
      <Btn variant="ghost" block style={{ marginTop: 8 }} onPress={onClose}>Continue Collecting</Btn>
    </Sheet>
  );
};

export const FactoryMapSheet = ({ open, stopCount, totalWeight, onClose, onArrived }: any) => {
  return (
    <Sheet open={open} onClose={onClose}>
      <Text style={{
        fontFamily: fontMono.fontFamily,
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
  const total = stops.reduce((sum: number, s: any) => sum + (s.actualWeight || 0), 0);
  return (
    <Sheet open={open} onClose={onClose}>
      <Text style={{
        fontFamily: fontMono.fontFamily,
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
        <View style={{
          borderRadius: 16,
          padding: 16,
          backgroundColor: c.mist,
          borderWidth: 1,
          borderColor: c.line,
        }}>
          {stops.map((s: any) => (
            <View key={s.id} style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingVertical: 6,
            }}>
              <Text style={{ fontSize: 15, color: c.ink }}>{s.name}</Text>
              <Text style={{
                fontFamily: fontMono.fontFamily,
                fontWeight: '600',
                fontSize: 15,
                color: c.forest,
              }}>{s.actualWeight} kg</Text>
            </View>
          ))}
        </View>
      </Field>

      <DetailRow k="Total collection weight" v={`${total} kg`} />

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
        fontFamily: fontMono.fontFamily,
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
