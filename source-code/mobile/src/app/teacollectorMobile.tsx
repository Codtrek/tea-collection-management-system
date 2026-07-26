// app/teacollectorMobile.tsx
import React, { useState } from 'react';
import {

  ScrollView,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Modal,
  Pressable,

  Dimensions,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');

// ---------- design tokens ----------
const c = {
  forest: "#1F3D2B",
  forestDeep: "#152A1E",
  forestLight: "#3C6247",
  mist: "#F4F1E8",
  card: "#FDFBF5",
  amber: "#C68A2E",
  amberDeep: "#9C6A1C",
  rust: "#AE4530",
  sage: "#8A9C7E",
  sageDeep: "#5F7454",
  gold: "#D9B45C",
  line: "#E4DFD0",
  ink: "#20241C",
  muted: "#6B7263",
};

const fontDisplay = { fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' };
const fontMono = { fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace' };

const nowTime = () => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

// ---------- mock data ----------
const INITIAL_STOPS = [
  { id: 1, name: "Ceylon Green Estate", owner: "A. Wickramasinghe", phone: "077 812 4456", gps: "7.2906° N, 80.7718° E", notes: "Leaves picked this morning, ready by 9 AM", estWeight: 68, dist: 2.4, status: "pending" },
  { id: 2, name: "Hill Breeze Gardens", owner: "N. Perera", phone: "071 220 9981", gps: "7.1935° N, 80.6812° E", notes: "Second harvest of the week", estWeight: 54, dist: 4.1, status: "accepted", acceptedAt: "8:20 AM" },
  { id: 3, name: "Mistvale Tea Farm", owner: "K. Bandara", phone: "076 554 3312", gps: "7.2011° N, 80.7020° E", notes: "", estWeight: 61, actualWeight: 61, status: "loaded" },
  { id: 4, name: "Oakridge Estate", owner: "D. Herath", phone: "072 118 2290", gps: "7.2299° N, 80.7115° E", notes: "", estWeight: 71, actualWeight: 71, status: "loaded" },
  { id: 5, name: "Green Hollow Estate", owner: "S. Fernando", phone: "075 331 8820", gps: "7.2540° N, 80.7301° E", notes: "", estWeight: null, status: "cancelled", reason: "Road blocked" },
  { id: 6, name: "Silverleaf Plantation", owner: "R. Dissanayake", phone: "070 442 7719", gps: "7.2180° N, 80.7422° E", notes: "New flush, small quantity", estWeight: 40, dist: 6.8, status: "pending" },
  { id: 7, name: "Windsor Tea Gardens", owner: "P. Jayasuriya", phone: "077 903 4471", gps: "7.1850° N, 80.6690° E", notes: "", estWeight: 74, actualWeight: 74, status: "delivered" },
];

const INITIAL_FERT_REQUESTS = [
  { 
    id: 1, 
    estateName: "Hill Breeze Gardens", 
    owner: "N. Perera", 
    phone: "071 220 9981",
    gps: "7.1935° N, 80.6812° E",
    fertilizerType: "Urea 46%",
    quantity: 50,
    requestedAt: "2026-07-23 08:15",
    status: "confirmed",
    confirmedAt: "2026-07-23 09:30",
    notes: "For tea plantation"
  },
  { 
    id: 2, 
    estateName: "Silverleaf Plantation", 
    owner: "R. Dissanayake", 
    phone: "070 442 7719",
    gps: "7.2180° N, 80.7422° E",
    fertilizerType: "NPK 20-10-10",
    quantity: 25,
    requestedAt: "2026-07-23 07:45",
    status: "loaded",
    confirmedAt: "2026-07-23 08:30",
    loadedAt: "2026-07-23 10:15",
    notes: "For new planting area"
  },
  { 
    id: 3, 
    estateName: "Ceylon Green Estate", 
    owner: "A. Wickramasinghe", 
    phone: "077 812 4456",
    gps: "7.2906° N, 80.7718° E",
    fertilizerType: "Organic Compost",
    quantity: 100,
    requestedAt: "2026-07-23 06:30",
    status: "delivered",
    confirmedAt: "2026-07-23 07:15",
    loadedAt: "2026-07-23 08:45",
    deliveredAt: "2026-07-23 09:30",
    notes: "For organic section"
  },
];

const RECEIVING_OFFICERS = ["K. Abeysekera", "M. Rathnayake", "S. Weerasinghe", "T. Gunasekara"];

const HISTORY = [
  { name: "Oakhurst Estate", date: "03 Jul", type: "Black Tea", weight: 88 },
  { name: "Rosemount Gardens", date: "02 Jul", type: "Black Tea", weight: 66 },
];

const NOTIFICATIONS = [
  { icon: 'add-circle-outline', bg: "#FBEFD8", fg: c.amberDeep, title: "New pickup request", desc: "Ceylon Green Estate · ~68 kg estimated", time: "12m" },
  { icon: 'checkmark-circle-outline', bg: "#E3EEE0", fg: c.sageDeep, title: "Pickup accepted", desc: "Hill Breeze Gardens confirmed for 10:30 AM", time: "40m" },
  { icon: 'alert-circle-outline', bg: "#F5E1DC", fg: c.rust, title: "Weight mismatch flagged", desc: "Mistvale Tea Farm · factory recorded 58 kg vs 61 kg", time: "1h" },
  { icon: 'business-outline', bg: "#DCEAE1", fg: c.forest, title: "Batch received at factory", desc: "Kotmale MPT confirmed 2 stops · 132 kg", time: "2h" },
  { icon: 'leaf-outline', bg: "#FBEFD8", fg: c.amberDeep, title: "Fertilizer confirmed", desc: "Urea 46% · 50 kg for Hill Breeze Gardens", time: "3h" },
];

const STATUS_STYLE: Record<string, { bg: string; fg: string; label: string }> = {
  pending: { bg: "#FBEFD8", fg: c.amberDeep, label: "Pending" },
  accepted: { bg: "#E3EEE0", fg: c.sageDeep, label: "Accepted" },
  loaded: { bg: "#DCEAE1", fg: c.forest, label: "Loaded" },
  delivered: { bg: "#D8E8DD", fg: c.forestDeep, label: "Delivered" },
  cancelled: { bg: "#F5E1DC", fg: c.rust, label: "Cancelled" },
  waiting: { bg: "#FBEFD8", fg: c.amberDeep, label: "Waiting" },
  mismatch: { bg: "#F5E1DC", fg: c.rust, label: "Mismatch reported" },
  confirmed: { bg: "#E3EEE0", fg: c.sageDeep, label: "Confirmed" },
};

// ---------- Components ----------
const Pill = ({ status, children }: { status: string; children?: React.ReactNode }) => {
  const s = STATUS_STYLE[status];
  return (
    <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      borderRadius: 20,
      paddingHorizontal: 10,
      paddingVertical: 4,
      backgroundColor: s.bg,
    }}>
      <Text style={{
        fontFamily: fontMono.fontFamily,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: 1.2,
        fontSize: 10,
        color: s.fg,
      }}>
        {children || s.label}
      </Text>
    </View>
  );
};

const AppBar = ({ eyebrow, title, dark, sub }: { eyebrow: string; title: string; dark?: boolean; sub?: string[] }) => {
  return (
    <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16, backgroundColor: dark ? c.forest : 'transparent' }}>
      <Text style={{
        fontFamily: fontMono.fontFamily,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: 1.8,
        fontSize: 11,
        color: dark ? "#BFE0C6" : c.sageDeep,
      }}>
        {eyebrow}
      </Text>
      <Text style={{
        fontFamily: fontDisplay.fontFamily,
        fontWeight: '600',
        marginTop: 2,
        fontSize: 25,
        color: dark ? "#fff" : c.forestDeep,
      }}>
        {title}
      </Text>
      {sub && (
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
          {sub.map((s, i) => (
            <Text key={i} style={{
              fontFamily: fontMono.fontFamily,
              fontSize: 12,
              color: dark ? "#DCEAE1" : c.muted,
            }}>
              {i > 0 && ' · '}{s}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
};

type BtnVariant = "primary" | "forest" | "ghost" | "danger";

const Btn = ({ 
  variant = "primary", 
  block, 
  small, 
  disabled, 
  children, 
  onPress, 
  style = {} 
}: {
  variant?: BtnVariant;
  block?: boolean;
  small?: boolean;
  disabled?: boolean;
  children?: React.ReactNode;
  onPress?: () => void;
  style?: any;
}) => {
  const styles: Record<BtnVariant, any> = {
    primary: { backgroundColor: c.amber },
    forest: { backgroundColor: c.forest },
    ghost: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: c.forestLight },
    danger: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: "#E3B7AA" },
  };

  const textColors: Record<BtnVariant, string> = {
    primary: "#fff",
    forest: "#fff",
    ghost: c.forest,
    danger: c.rust,
  };

  return (
    <TouchableOpacity
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      style={[{
        borderRadius: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingHorizontal: 16,
        paddingVertical: small ? 8 : 14,
        opacity: disabled ? 0.45 : 1,
        width: block ? '100%' : 'auto',
        ...styles[variant],
      }, style]}
    >
      <Text style={{
        fontWeight: '600',
        fontSize: small ? 12 : 15,
        color: textColors[variant],
      }}>
        {children}
      </Text>
    </TouchableOpacity>
  );
};

const Select = ({ value, onChange, placeholder, options }: any) => {
  return (
    <View style={{
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: c.line,
      backgroundColor: "#fff",
      overflow: 'hidden',
    }}>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        style={{
          fontFamily: fontMono.fontFamily,
          fontSize: 15,
          paddingHorizontal: 12,
          paddingVertical: 10,
          color: value ? c.ink : c.muted,
        }}
      />
    </View>
  );
};

const Card = ({ children, dark, style = {} }: any) => {
  return (
    <View style={[{
      padding: 16,
      marginBottom: 14,
      backgroundColor: dark ? c.forest : c.card,
      borderRadius: 18,
      borderWidth: dark ? 0 : 1,
      borderColor: dark ? undefined : c.line,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: dark ? 0 : 0.05,
      shadowRadius: 10,
      elevation: dark ? 0 : 2,
    }, style]}>
      {children}
    </View>
  );
};

const DetailRow = ({ k, v }: { k: string; v: string }) => {
  return (
    <View style={{
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: c.line,
    }}>
      <Text style={{ color: c.muted, fontSize: 15 }}>{k}</Text>
      <Text style={{
        fontFamily: fontMono.fontFamily,
        fontWeight: '600',
        fontSize: 15,
        color: c.ink,
        maxWidth: '60%',
        textAlign: 'right',
      }}>{v}</Text>
    </View>
  );
};

const Sheet = ({ open, onClose, children }: any) => {
  if (!open) return null;
  
  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={open}
      onRequestClose={onClose}
    >
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(21,32,24,0.42)' }} onPress={onClose}>
        <View style={{ flex: 1, justifyContent: 'flex-end' }}>
          <Pressable style={{
            backgroundColor: c.card,
            borderTopLeftRadius: 26,
            borderTopRightRadius: 26,
            paddingHorizontal: 20,
            paddingBottom: Platform.OS === 'ios' ? 36 : 20,
            paddingTop: 10,
            maxHeight: '88%',
          }} onPress={() => {}}>
            <View style={{
              width: 36,
              height: 4,
              borderRadius: 2,
              backgroundColor: c.line,
              alignSelf: 'center',
              marginBottom: 14,
            }} />
            {children}
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
};

const Chip = ({ active, onPress, children }: any) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        borderRadius: 20,
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderWidth: 1.5,
        borderColor: active ? c.forest : c.line,
        backgroundColor: active ? c.forest : "#fff",
      }}
    >
      <Text style={{
        fontWeight: '600',
        fontSize: 15,
        color: active ? "#fff" : c.forestDeep,
      }}>
        {children}
      </Text>
    </TouchableOpacity>
  );
};

const Field = ({ label, children }: any) => {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={{
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 6,
        color: c.muted,
      }}>{label}</Text>
      {children}
    </View>
  );
};

const Input = (props: any) => {
  return (
    <TextInput
      {...props}
      style={[{
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: c.line,
        backgroundColor: "#fff",
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 15,
        fontFamily: fontMono.fontFamily,
        color: c.ink,
      }, props.style]}
    />
  );
};

// ---------- FertRequestCard ----------
const FertRequestCard = ({ request, onViewDetails, onLoadFertilizer, onDeliverFertilizer }: any) => {
  const statusMap: any = {
    confirmed: { label: "Confirmed", action: "Load Fertilizer", handler: onLoadFertilizer },
    loaded: { label: "Loaded", action: "Deliver", handler: onDeliverFertilizer },
    delivered: { label: "Delivered", action: null, handler: null },
  };

  const currentStatus = statusMap[request.status];

  return (
    <View style={{
      borderRadius: 16,
      padding: 16,
      marginBottom: 10,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.line,
    }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}>
          <Text style={{
            fontFamily: fontDisplay.fontFamily,
            fontWeight: '600',
            fontSize: 16,
          }}>{request.estateName}</Text>
          <Text style={{
            fontSize: 12,
            marginTop: 2,
            color: c.muted,
          }}>{request.fertilizerType} · {request.quantity} kg</Text>
          <Text style={{
            fontSize: 12,
            marginTop: 2,
            color: c.muted,
          }}>
            {request.status === "confirmed" && `Confirmed at ${request.confirmedAt}`}
            {request.status === "loaded" && `Loaded at ${request.loadedAt}`}
            {request.status === "delivered" && `Delivered at ${request.deliveredAt}`}
          </Text>
        </View>
        <Pill status={request.status} />
      </View>

      <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
        <View style={{ flex: 1 }}>
          <Btn variant="ghost" small onPress={() => onViewDetails(request)}>
            View Details
          </Btn>
        </View>
        {currentStatus.action && (
          <View style={{ flex: 1 }}>
            <Btn variant="primary" small onPress={() => currentStatus.handler(request)}>
              {currentStatus.action}
            </Btn>
          </View>
        )}
      </View>
    </View>
  );
};

// ---------- FertScreen ----------
const FertScreen = ({ requests, onViewDetails, onLoadFertilizer, onDeliverFertilizer }: any) => {
  const groups = [
    { key: "confirmed", label: "Confirmed - Ready to Load", items: requests.filter((r: any) => r.status === "confirmed") },
    { key: "loaded", label: "Loaded - Ready to Deliver", items: requests.filter((r: any) => r.status === "loaded") },
    { key: "delivered", label: "Delivered", items: requests.filter((r: any) => r.status === "delivered") },
  ];

  return (
    <ScrollView style={{ flex: 1, paddingHorizontal: 20, paddingBottom: 100 }}>
      {groups.map((g) => g.items.length > 0 && (
        <View key={g.key}>
          <Text style={{
            fontFamily: fontMono.fontFamily,
            fontWeight: 'bold',
            textTransform: 'uppercase',
            letterSpacing: 1.8,
            marginBottom: 10,
            marginLeft: 2,
            fontSize: 11,
            color: c.sageDeep,
          }}>
            {g.label} · {g.items.length}
          </Text>
          {g.items.map((r: any) => (
            <FertRequestCard 
              key={r.id} 
              request={r} 
              onViewDetails={onViewDetails}
              onLoadFertilizer={onLoadFertilizer}
              onDeliverFertilizer={onDeliverFertilizer}
            />
          ))}
        </View>
      ))}
      {requests.length === 0 && (
        <View style={{ alignItems: 'center', paddingVertical: 48 }}>
          <Ionicons name="leaf-outline" size={48} color={c.muted} opacity={0.3} />
          <Text style={{ fontWeight: '600', marginTop: 12, color: c.muted }}>No fertilizer requests</Text>
          <Text style={{ fontSize: 15, color: c.muted }}>All requests have been completed</Text>
        </View>
      )}
    </ScrollView>
  );
};

// ---------- Fertilizer Sheets ----------
const FertDetailsSheet = ({ open, request, onClose }: any) => {
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

const LoadFertSheet = ({ open, request, onClose, onConfirm }: any) => {
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

const DeliverFertSheet = ({ open, request, onClose, onConfirm }: any) => {
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

// ---------- HomeScreen ----------
const HomeScreen = ({ setTab, setSheet, fertRequests }: any) => {
  const confirmedCount = fertRequests.filter((r: any) => r.status === "confirmed").length;
  const loadedCount = fertRequests.filter((r: any) => r.status === "loaded").length;

  return (
    <ScrollView style={{ flex: 1, paddingHorizontal: 20, paddingBottom: 100 }}>
      <Card dark>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View>
            <Text style={{ fontSize: 12, color: "#BFE0C6" }}>Today's work</Text>
            <Text style={{
              fontFamily: fontDisplay.fontFamily,
              fontWeight: '600',
              marginTop: 2,
              fontSize: 17,
              color: "#fff",
            }}>Today's Collection Tasks</Text>
          </View>
          <View style={{
            borderRadius: 20,
            paddingHorizontal: 10,
            paddingVertical: 4,
            backgroundColor: "#EFE6C8",
          }}>
            <Text style={{
              fontFamily: fontMono.fontFamily,
              fontWeight: 'bold',
              textTransform: 'uppercase',
              fontSize: 10,
              color: c.amberDeep,
            }}>In progress</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 20, marginTop: 14, flexWrap: 'wrap' }}>
          <Text style={{
            fontFamily: fontMono.fontFamily,
            fontSize: 12,
            color: "#DCEAE1",
          }}>7 pickup requests</Text>
          <Text style={{ color: "#DCEAE1" }}>·</Text>
          <Text style={{
            fontFamily: fontMono.fontFamily,
            fontSize: 12,
            color: "#DCEAE1",
          }}>Factory: Kotmale MPT</Text>
        </View>
        <Btn variant="primary" block style={{ marginTop: 14 }} onPress={() => setTab("collect")}>
          View Today's Stops
        </Btn>
      </Card>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
        {[
          ["2", "Pending requests"], 
          ["2", "Loaded, awaiting factory"], 
          ["1", "Delivered today"], 
          ["135 kg", "Collected today"]
        ].map(([n, l], i) => (
          <View key={i} style={{
            borderRadius: 16,
            padding: 14,
            width: (width - 60) / 2,
            backgroundColor: c.card,
            borderWidth: 1,
            borderColor: c.line,
          }}>
            <Text style={{
              fontFamily: fontDisplay.fontFamily,
              fontWeight: 'bold',
              fontSize: 24,
              color: c.forest,
            }}>{n}</Text>
            <Text style={{
              fontSize: 12,
              marginTop: 2,
              color: c.muted,
            }}>{l}</Text>
          </View>
        ))}
      </View>

      <Text style={{
        fontFamily: fontMono.fontFamily,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: 1.8,
        marginTop: 20,
        marginBottom: 10,
        marginLeft: 2,
        fontSize: 11,
        color: c.sageDeep,
      }}>
        Quick actions
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        <TouchableOpacity 
          onPress={() => setTab("collect")}
          style={{
            borderRadius: 16,
            padding: 14,
            width: (width - 60) / 2,
            backgroundColor: c.forest,
          }}>
          <Ionicons name="leaf-outline" size={22} color="#fff" />
          <Text style={{ fontSize: 15, fontWeight: '600', marginTop: 8, color: "#fff" }}>Today's Stops</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={() => setSheet("register")}
          style={{
            borderRadius: 16,
            padding: 14,
            width: (width - 60) / 2,
            backgroundColor: c.card,
            borderWidth: 1,
            borderColor: c.line,
          }}>
          <Ionicons name="add-outline" size={22} color={c.forestDeep} />
          <Text style={{ fontSize: 15, fontWeight: '600', marginTop: 8, color: c.forestDeep }}>New Estate</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={() => setTab("fert")}
          style={{
            borderRadius: 16,
            padding: 14,
            width: (width - 60) / 2,
            backgroundColor: c.forest,
          }}>
          <Ionicons name="leaf-outline" size={22} color="#fff" />
          <Text style={{ fontSize: 15, fontWeight: '600', marginTop: 8, color: "#fff" }}>Fertilizer</Text>
          {(confirmedCount > 0 || loadedCount > 0) && (
            <Text style={{ fontSize: 12, color: "#BFE0C6", marginTop: 4 }}>
              {confirmedCount > 0 && `${confirmedCount} to load`}
              {confirmedCount > 0 && loadedCount > 0 && " · "}
              {loadedCount > 0 && `${loadedCount} to deliver`}
            </Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={() => setTab("notif")}
          style={{
            borderRadius: 16,
            padding: 14,
            width: (width - 60) / 2,
            backgroundColor: c.card,
            borderWidth: 1,
            borderColor: c.line,
          }}>
          <Ionicons name="notifications-outline" size={22} color={c.forestDeep} />
          <Text style={{ fontSize: 15, fontWeight: '600', marginTop: 8, color: c.forestDeep }}>Notifications</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

// ---------- StopCard ----------
const StopCard = ({ stop, onViewDetails, onArrivedDetails }: any) => {
  const clickable = stop.status === "pending" || stop.status === "accepted";
  
  const handleCardPress = () => {
    if (stop.status === "pending") onViewDetails(stop);
    if (stop.status === "accepted") onArrivedDetails(stop);
  };

  return (
    <TouchableOpacity
      onPress={handleCardPress}
      disabled={!clickable}
      style={{
        borderRadius: 16,
        padding: 16,
        marginBottom: 10,
        backgroundColor: c.card,
        borderWidth: 1,
        borderColor: c.line,
        opacity: clickable ? 1 : 0.7,
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View>
          <Text style={{
            fontFamily: fontDisplay.fontFamily,
            fontWeight: '600',
            fontSize: 16,
          }}>{stop.name}</Text>
          <Text style={{
            fontSize: 12,
            marginTop: 2,
            color: c.muted,
          }}>
            {stop.status === "cancelled" && `Reason: ${stop.reason}`}
            {stop.status === "pending" && `Owner: ${stop.owner}`}
            {stop.status === "accepted" && `Accepted at ${stop.acceptedAt}`}
            {stop.status === "loaded" && "Awaiting factory drop-off"}
            {stop.status === "delivered" && "✓ Completed"}
          </Text>
        </View>
        <Pill status={stop.mismatch && stop.status === "delivered" ? "mismatch" : stop.status} />
      </View>

      {stop.status === "pending" && (
        <>
          <View style={{ flexDirection: 'row', gap: 14, marginTop: 10 }}>
            <Text style={{
              fontFamily: fontMono.fontFamily,
              fontSize: 12,
              color: c.forest,
            }}>~{stop.estWeight} kg</Text>
            <Text style={{
              fontFamily: fontMono.fontFamily,
              fontSize: 12,
              color: c.forest,
            }}>{stop.dist} km</Text>
          </View>
          <TouchableOpacity
            onPress={() => onViewDetails(stop)}
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              width: '100%',
              marginTop: 12,
              borderRadius: 14,
              paddingHorizontal: 14,
              paddingVertical: 10,
              borderWidth: 1.5,
              borderColor: c.forestLight,
            }}
          >
            <Text style={{
              fontWeight: '600',
              fontSize: 15,
              color: c.forest,
            }}>View Details</Text>
            <Ionicons name="chevron-forward-outline" size={16} color={c.forest} />
          </TouchableOpacity>
        </>
      )}

      {stop.status === "accepted" && (
        <View style={{ marginTop: 12 }}>
          <Btn variant="forest" small onPress={() => {
            console.log("Navigate to", stop.name);
          }}>
            Navigate
          </Btn>
        </View>
      )}

      {stop.status === "loaded" && (
        <View style={{ flexDirection: 'row', gap: 14, marginTop: 10 }}>
          <Text style={{
            fontFamily: fontMono.fontFamily,
            fontSize: 12,
            color: c.forest,
          }}>{stop.actualWeight} kg</Text>
        </View>
      )}

      {stop.status === "delivered" && (
        <View style={{ flexDirection: 'row', gap: 14, marginTop: 10 }}>
          <Text style={{
            fontFamily: fontMono.fontFamily,
            fontSize: 12,
            color: c.muted,
          }}>{stop.actualWeight} kg delivered</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

// ---------- CollectScreen ----------
const CollectScreen = ({ stops, segment, setSegment, onViewDetails, onArrivedDetails, onGoToFactory, setSheet }: any) => {
  const loaded = stops.filter((s: any) => s.status === "loaded");
  const totalLoaded = loaded.reduce((sum: number, s: any) => sum + (s.actualWeight || 0), 0);

  const groups = [
    { key: "pending", label: "Needs your response", items: stops.filter((s: any) => s.status === "pending") },
    { key: "active", label: "Accepted", items: stops.filter((s: any) => s.status === "accepted" ) },
    { key: "loaded-group", label: "Loaded", items: stops.filter((s: any) => s.status === "loaded" ) },
    { key: "cancelled", label: "Cancelled", items: stops.filter((s: any) => s.status === "cancelled") },
  ];

  const deliveredToday = stops.filter((s: any) => s.status === "delivered");

  return (
    <ScrollView style={{ flex: 1, paddingHorizontal: 20, paddingBottom: 100 }}>
      <View style={{
        flexDirection: 'row',
        borderRadius: 14,
        padding: 4,
        marginBottom: 16,
        backgroundColor: "#E9E4D3",
      }}>
        {["today", "hist"].map((seg) => (
          <TouchableOpacity
            key={seg}
            onPress={() => setSegment(seg)}
            style={{
              flex: 1,
              borderRadius: 10,
              paddingVertical: 10,
              backgroundColor: segment === seg ? c.forest : 'transparent',
            }}
          >
            <Text style={{
              fontWeight: '600',
              fontSize: 15,
              textAlign: 'center',
              color: segment === seg ? "#fff" : c.muted,
            }}>
              {seg === "today" ? "Today" : "History"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {segment === "today" ? (
        <>
          {loaded.length > 0 && (
            <Card dark style={{ marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{
                  width: 44,
                  height: 44,
                  borderRadius: 16,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'rgba(255,255,255,0.14)',
                }}>
                  <Ionicons name="business-outline" size={20} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{
                    fontFamily: fontDisplay.fontFamily,
                    fontWeight: '600',
                    fontSize: 15,
                    color: "#fff",
                  }}>
                    {loaded.length} stop{loaded.length > 1 ? "s" : ""} loaded · {totalLoaded} kg
                  </Text>
                  <Text style={{
                    fontSize: 12,
                    marginTop: 2,
                    color: "#BFE0C6",
                  }}>Ready whenever you head to Kotmale MPT</Text>
                </View>
              </View>
              <Btn variant="primary" block style={{ marginTop: 14 }} onPress={onGoToFactory}>
                Navigate to Factory
              </Btn>
            </Card>
          )}

          {groups.filter(g => g.items.length > 0).map((g) => (
            <View key={g.key}>
              <Text style={{
                fontFamily: fontMono.fontFamily,
                fontWeight: 'bold',
                textTransform: 'uppercase',
                letterSpacing: 1.8,
                marginBottom: 10,
                marginLeft: 2,
                fontSize: 11,
                color: c.sageDeep,
              }}>
                {g.label} · {g.items.length}
              </Text>
              {g.items.map((s: any) => (
                <StopCard key={s.id} stop={s} onViewDetails={onViewDetails} onArrivedDetails={onArrivedDetails} />
              ))}
            </View>
          ))}

          <Btn variant="ghost" block style={{ marginTop: 8 }} onPress={() => setSheet("register")}>
            + Register New Estate
          </Btn>
        </>
      ) : (
        <>
          {deliveredToday.length > 0 && (
            <>
              <Text style={{
                fontFamily: fontMono.fontFamily,
                fontWeight: 'bold',
                textTransform: 'uppercase',
                letterSpacing: 1.8,
                marginBottom: 10,
                marginLeft: 2,
                fontSize: 11,
                color: c.sageDeep,
              }}>
                Delivered today
              </Text>
              {deliveredToday.map((s: any) => (
                <View key={s.id} style={{
                  borderRadius: 16,
                  padding: 16,
                  marginBottom: 10,
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  backgroundColor: c.card,
                  borderWidth: 1,
                  borderColor: c.line,
                }}>
                  <View>
                    <Text style={{
                      fontFamily: fontDisplay.fontFamily,
                      fontWeight: '600',
                      fontSize: 16,
                    }}>{s.name}</Text>
                    <Text style={{
                      fontSize: 12,
                      marginTop: 2,
                      color: c.muted,
                    }}>Today · {s.actualWeight} kg</Text>
                  </View>
                  <Pill status={s.mismatch ? "mismatch" : "delivered"} />
                </View>
              ))}
            </>
          )}
          <Text style={{
            fontFamily: fontMono.fontFamily,
            fontWeight: 'bold',
            textTransform: 'uppercase',
            letterSpacing: 1.8,
            marginBottom: 10,
            marginLeft: 2,
            marginTop: 16,
            fontSize: 11,
            color: c.sageDeep,
          }}>
            Earlier this week
          </Text>
          {HISTORY.map((h, i) => (
            <View key={i} style={{
              borderRadius: 16,
              padding: 16,
              marginBottom: 10,
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              backgroundColor: c.card,
              borderWidth: 1,
              borderColor: c.line,
            }}>
              <View>
                <Text style={{
                  fontFamily: fontDisplay.fontFamily,
                  fontWeight: '600',
                  fontSize: 16,
                }}>{h.name}</Text>
                <Text style={{
                  fontSize: 12,
                  marginTop: 2,
                  color: c.muted,
                }}>{h.date} · {h.type} · {h.weight} kg</Text>
              </View>
              <Pill status="delivered">Delivered</Pill>
            </View>
          ))}
        </>
      )}
    </ScrollView>
  );
};

// ---------- NotifScreen ----------
const NotifScreen = () => {
  return (
    <ScrollView style={{ flex: 1, paddingHorizontal: 20, paddingBottom: 100 }}>
      <View style={{
        borderRadius: 16,
        paddingHorizontal: 16,
        backgroundColor: c.card,
        borderWidth: 1,
        borderColor: c.line,
      }}>
        {NOTIFICATIONS.map((n, i) => {
          return (
            <View key={i} style={{
              flexDirection: 'row',
              gap: 12,
              paddingVertical: 14,
              borderBottomWidth: i < NOTIFICATIONS.length - 1 ? 1 : 0,
              borderBottomColor: c.line,
            }}>
              <View style={{
                width: 36,
                height: 36,
                borderRadius: 12,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: n.bg,
              }}>
                <Ionicons name={n.icon as any} size={17} color={n.fg} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '600', fontSize: 15, color: c.ink }}>{n.title}</Text>
                <Text style={{ fontSize: 12, marginTop: 2, color: "#8A9082" }}>{n.desc}</Text>
              </View>
              <Text style={{
                fontFamily: fontMono.fontFamily,
                fontSize: 12,
                color: "#A7AC9C",
              }}>{n.time}</Text>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
};

// ---------- ProfileScreen ----------
const ProfileScreen = () => {
  return (
    <ScrollView style={{ flex: 1, paddingHorizontal: 20, paddingBottom: 100 }}>
      <View style={{
        borderRadius: 24,
        padding: 20,
        marginBottom: 16,
        backgroundColor: c.forest,
      }}>
        <View style={{
          width: 56,
          height: 56,
          borderRadius: 16,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 12,
          backgroundColor: c.amber,
        }}>
          <Text style={{
            fontFamily: fontDisplay.fontFamily,
            fontWeight: 'bold',
            fontSize: 20,
            color: "#fff",
          }}>SR</Text>
        </View>
        <Text style={{
          fontFamily: fontDisplay.fontFamily,
          fontWeight: '600',
          fontSize: 20,
          color: "#fff",
        }}>Sunil Ranasinghe</Text>
        <Text style={{
          fontFamily: fontMono.fontFamily,
          fontSize: 12,
          opacity: 0.75,
          marginTop: 2,
          color: "#fff",
        }}>EMP-2291 · Kotmale MPT Factory</Text>
      </View>
      <Card>
        <DetailRow k="Phone" v="071 234 5678" />
        <DetailRow k="Vehicle" v="LP-4471" />
      </Card>
      <Btn variant="ghost" block style={{ marginBottom: 10 }}>Change Password</Btn>
      <Btn variant="danger" block>Logout</Btn>
    </ScrollView>
  );
};

// ---------- PickupSheet ----------
const PickupSheet = ({ open, stop, onClose, onAccept, onDecline }: any) => {
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
        marginBottom: 4,
        fontSize: 20,
      }}>{stop.name}</Text>
      <DetailRow k="Owner" v={stop.owner} />
      <DetailRow k="Phone" v={stop.phone} />
      <DetailRow k="Estimated Weight" v={`${stop.estWeight} kg`} />
      {stop.notes && <DetailRow k="Notes" v={stop.notes} />}
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
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

// ---------- DeclineSheet ----------
const DeclineSheet = ({ open, onClose, onConfirm }: any) => {
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
            borderColor: c.line,
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

// ---------- ArrivedSheet ----------
const ArrivedSheet = ({ open, stop, onClose, onStartCollection, onCall }: any) => {
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
        backgroundColor: c.mist,
        borderWidth: 1,
        borderColor: c.line,
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

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Btn variant="primary" block onPress={onStartCollection}>Start Collection</Btn>
        </View>
        <Btn variant="forest" small onPress={onCall}>📞 Call</Btn>
      </View>
    </Sheet>
  );
};

// ---------- CollectSheet ----------
const CollectSheet = ({ open, stop, onClose, onSubmit }: any) => {
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

// ---------- ConfirmSheet ----------
const ConfirmSheet = ({ open, weight, onClose }: any) => {
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

// ---------- FactoryMapSheet ----------
const FactoryMapSheet = ({ open, stopCount, totalWeight, onClose, onArrived }: any) => {
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

// ---------- DeliverySheet ----------
const DeliverySheet = ({ open, stops, officer, setOfficer, onClose, onSubmit }: any) => {
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

// ---------- FactoryWeightSheet ----------
const FactoryWeightSheet = ({ open, collectionWeight, factoryWeight, onClose, onApprove, onReportMismatch }: any) => {
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

// ---------- MismatchSheet ----------
const MismatchSheet = ({ open, onClose, onSubmit }: any) => {
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

// ---------- RegisterSheet ----------
const RegisterSheet = ({ open, onClose }: any) => {
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

// ---------- Main App ----------
export default function TeaCollectorMobile() {
  const router = useRouter();
  const [tab, setTab] = useState("home");
  const [segment, setSegment] = useState("today");
  const [stops, setStops] = useState(INITIAL_STOPS);
  const [fertRequests, setFertRequests] = useState(INITIAL_FERT_REQUESTS);
  const [activeStop, setActiveStop] = useState<any>(null);
  const [activeFert, setActiveFert] = useState<any>(null);
  const [collectedWeight, setCollectedWeight] = useState(0);
  const [factoryWeight, setFactoryWeight] = useState(0);
  const [batchTotal, setBatchTotal] = useState(0);
  const [officer, setOfficer] = useState("");
  const [sheet, setSheet] = useState<string | null>(null);

  const updateStop = (id: number, patch: any) => setStops((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  const updateMany = (ids: number[], patch: any) => setStops((prev) => prev.map((s) => (ids.includes(s.id) ? { ...s, ...patch } : s)));
  const updateFert = (id: number, patch: any) => setFertRequests((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  // Tea collection handlers - with null checks
  const openPickupDetails = (stop: any) => { 
    if (!stop) return;
    setActiveStop(stop); 
    setSheet("pickup"); 
  };

  const openArrivedDetails = (stop: any) => { 
    if (!stop) return;
    setActiveStop(stop); 
    setSheet("arrived"); 
  };

  const acceptPickup = () => {
    if (!activeStop) {
      console.warn("No active stop to accept");
      return;
    }
    
    updateStop(activeStop.id, { 
      status: "accepted", 
      acceptedAt: nowTime() 
    });
    setSheet(null);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const goToDecline = () => {
    if (!activeStop) {
      console.warn("No active stop to decline");
      return;
    }
    setSheet("decline");
  };

  const confirmDecline = (reason: string) => { 
    if (!activeStop) {
      console.warn("No active stop to decline");
      return;
    }
    
    updateStop(activeStop.id, { 
      status: "cancelled", 
      reason 
    }); 
    setSheet(null);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  };

  const handleCall = () => {
    if (!activeStop) {
      Alert.alert('Error', 'No active stop selected');
      return;
    }
    Alert.alert('Call', `Calling ${activeStop?.owner} at ${activeStop?.phone}`);
  };

  const startCollection = () => {
    if (!activeStop) {
      console.warn("No active stop to collect");
      return;
    }
    setSheet("collect");
  };

  const submitCollection = (weight: string) => {
    if (!activeStop) {
      console.warn("No active stop to submit collection");
      return;
    }
    
    setCollectedWeight(parseFloat(weight) || 0);
    updateStop(activeStop.id, { 
      actualWeight: parseFloat(weight) || 0 
    });
    setSheet("confirm");
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const continueCollecting = () => { 
    if (!activeStop) {
      console.warn("No active stop to continue");
      return;
    }
    
    updateStop(activeStop.id, { 
      status: "loaded" 
    }); 
    setSheet(null);
  };

  const goToFactory = () => setSheet("map");
  const arriveAtFactory = () => setSheet("delivery");
  const submitToFactory = (total: number) => {
    setBatchTotal(total);
    setFactoryWeight(Math.max(0, total - 6));
    setSheet("factoryWeight");
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };
  const approveWeight = () => {
    const ids = stops.filter((s) => s.status === "loaded").map((s) => s.id);
    updateMany(ids, { status: "delivered" });
    setOfficer("");
    setSheet(null);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };
  const goToMismatch = () => setSheet("mismatch");
  const submitMismatch = () => {
    const ids = stops.filter((s) => s.status === "loaded").map((s) => s.id);
    updateMany(ids, { status: "delivered", mismatch: true });
    setOfficer("");
    setSheet(null);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  };

  // Fertilizer handlers
  const openFertDetails = (request: any) => { 
    if (!request) return;
    setActiveFert(request); 
    setSheet("fertDetails"); 
  };

  const loadFertilizer = (request: any) => { 
    if (!request) return;
    setActiveFert(request); 
    setSheet("fertLoad"); 
  };

  const confirmLoadFertilizer = () => {
    if (!activeFert) {
      console.warn("No active fertilizer request");
      return;
    }
    
    updateFert(activeFert.id, { 
      status: "loaded", 
      loadedAt: nowTime() 
    });
    setSheet(null);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const deliverFertilizer = (request: any) => { 
    if (!request) return;
    setActiveFert(request); 
    setSheet("fertDeliver"); 
  };

  const confirmDeliverFertilizer = () => {
    if (!activeFert) {
      console.warn("No active fertilizer request");
      return;
    }
    
    updateFert(activeFert.id, { 
      status: "delivered", 
      deliveredAt: nowTime() 
    });
    setSheet(null);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const NAV = [
    { id: "home", label: "Home", icon: "home-outline" },
    { id: "collect", label: "Collect", icon: "leaf-outline" },
    { id: "fert", label: "Fertilizer", icon: "leaf-outline" },
    { id: "notif", label: "Alerts", icon: "notifications-outline" },
    { id: "profile", label: "Profile", icon: "person-outline" },
  ];

  const TITLES: Record<string, any> = {
    home: { eyebrow: "Wed, 04 Jul", title: "Good morning, Sunil" },
    collect: { eyebrow: "Today's Collections", title: "Pickup Requests", dark: true, sub: ["Vehicle: LP-4471", "Factory: Kotmale MPT"] },
    fert: { eyebrow: "Fertilizer Delivery", title: "Assigned Today", dark: true },
    notif: { eyebrow: "Alerts", title: "Notifications" },
    profile: { eyebrow: "Account", title: "Profile" },
  };

  const loadedStops = stops.filter((s) => s.status === "loaded");

  const renderScreen = () => {
    switch(tab) {
      case "home":
        return <HomeScreen setTab={setTab} setSheet={setSheet} fertRequests={fertRequests} />;
      case "collect":
        return (
          <CollectScreen
            stops={stops}
            segment={segment}
            setSegment={setSegment}
            onViewDetails={openPickupDetails}
            onArrivedDetails={openArrivedDetails}
            onGoToFactory={goToFactory}
            setSheet={setSheet}
          />
        );
      case "fert":
        return (
          <FertScreen 
            requests={fertRequests}
            onViewDetails={openFertDetails}
            onLoadFertilizer={loadFertilizer}
            onDeliverFertilizer={deliverFertilizer}
          />
        );
      case "notif":
        return <NotifScreen />;
      case "profile":
        return <ProfileScreen />;
      default:
        return null;
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.forestDeep }}>
      
      {/* Back button */}
      <TouchableOpacity 
        onPress={() => router.back()}
        style={{
          position: 'absolute',
          top: Platform.OS === 'ios' ? 50 : 30,
          left: 16,
          zIndex: 100,
          backgroundColor: 'rgba(255,255,255,0.9)',
          padding: 8,
          borderRadius: 20,
          width: 40,
          height: 40,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name="arrow-back" size={24} color={c.forestDeep} />
      </TouchableOpacity>
      
      <View style={{
        flex: 1,
        margin: Platform.OS === 'ios' ? 14 : 0,
        borderRadius: Platform.OS === 'ios' ? 38 : 0,
        overflow: 'hidden',
        backgroundColor: c.mist,
      }}>
        
        

        <AppBar {...TITLES[tab]} />
        
        <View style={{
          height: 2,
          marginHorizontal: 20,
          backgroundColor: c.gold,
          opacity: 0.6,
          borderRadius: 2,
        }} />

        {renderScreen()}

        <View style={{
          flexDirection: 'row',
          justifyContent: 'space-around',
          alignItems: 'center',
          paddingVertical: 10,
          paddingBottom: Platform.OS === 'ios' ? 20 : 10,
          backgroundColor: 'rgba(253,251,245,0.94)',
          borderTopWidth: 1,
          borderTopColor: c.line,
        }}>
          {NAV.map((n) => {
            const active = tab === n.id;
            return (
              <TouchableOpacity
                key={n.id}
                onPress={() => setTab(n.id)}
                style={{
                  alignItems: 'center',
                  gap: 2,
                }}
              >
                <Ionicons 
                  name={n.icon as any} 
                  size={21} 
                  color={active ? c.forest : "#98A08A"} 
                />
                <Text style={{
                  fontSize: 12,
                  fontWeight: '600',
                  color: active ? c.forest : "#98A08A",
                }}>
                  {n.label}
                </Text>
                <View style={{
                  width: 4,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: c.amber,
                  opacity: active ? 1 : 0,
                }} />
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Tea collection overlays */}
        <PickupSheet open={sheet === "pickup"} stop={activeStop} onClose={() => setSheet(null)} onAccept={acceptPickup} onDecline={goToDecline} />
        <DeclineSheet open={sheet === "decline"} onClose={() => setSheet(null)} onConfirm={confirmDecline} />
        <ArrivedSheet open={sheet === "arrived"} stop={activeStop} onClose={() => setSheet(null)} onStartCollection={startCollection} onCall={handleCall} />
        <CollectSheet open={sheet === "collect"} stop={activeStop} onClose={() => setSheet(null)} onSubmit={submitCollection} />
        <ConfirmSheet open={sheet === "confirm"} weight={collectedWeight} onClose={continueCollecting} />
        
        <FactoryMapSheet
          open={sheet === "map"}
          stopCount={loadedStops.length}
          totalWeight={loadedStops.reduce((sum, s) => sum + (s.actualWeight || 0), 0)}
          onClose={() => setSheet(null)}
          onArrived={arriveAtFactory}
        />
        <DeliverySheet
          open={sheet === "delivery"}
          stops={loadedStops}
          officer={officer}
          setOfficer={setOfficer}
          onClose={() => setSheet(null)}
          onSubmit={submitToFactory}
        />
        <FactoryWeightSheet
          open={sheet === "factoryWeight"}
          collectionWeight={batchTotal}
          factoryWeight={factoryWeight}
          onClose={() => setSheet(null)}
          onApprove={approveWeight}
          onReportMismatch={goToMismatch}
        />
        <MismatchSheet open={sheet === "mismatch"} onClose={() => setSheet(null)} onSubmit={submitMismatch} />

        {/* Fertilizer overlays */}
        <FertDetailsSheet open={sheet === "fertDetails"} request={activeFert} onClose={() => setSheet(null)} />
        <LoadFertSheet 
          open={sheet === "fertLoad"} 
          request={activeFert} 
          onClose={() => setSheet(null)} 
          onConfirm={confirmLoadFertilizer}
        />
        <DeliverFertSheet 
          open={sheet === "fertDeliver"} 
          request={activeFert} 
          onClose={() => setSheet(null)} 
          onConfirm={confirmDeliverFertilizer}
        />

        <RegisterSheet open={sheet === "register"} onClose={() => setSheet(null)} />
      </View>
    </View>
  );
}