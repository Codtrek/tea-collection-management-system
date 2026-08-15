// app/teacollector/teacollectorMobile.tsx
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
import { AppBar } from '@/components/ui/demo-teacollector-app-bar';
import { Chip } from '@/components/ui/demo-teacollector-chip';
import { DetailRow } from '@/components/ui/demo-teacollector-detail-row';
import { Pill } from '@/components/ui/demo-teacollector-pill';
import { Sheet } from '@/components/ui/demo-teacollector-sheet';
import { Btn } from '@/components/ui/demo-teacollector-button';
import { Card } from '@/components/ui/demo-teacollector-card';
import { Select, Field, Input } from '@/components/forms/demo-teacollector-fields';
import DemoTeaCollectorBottomTab from '@/components/layout/demo-teacollector-BottomTab';
import { FertRequestCard, StopCard } from '@/components/ui/demo-teacollector-cards';
import { c, fontDisplay, fontMono, STATUS_STYLE } from '@/components/ui/demo-teacollector-theme';
import DemoTeaCollectorHome from '@/app/teacollector/demo-teacollector-home';
import DemoTeaCollectorCollect from '@/app/teacollector/demo-teacollector-collect';
import DemoTeaCollectorFertilizer from '@/app/teacollector/demo-teacollector-fertilizer';
import DemoTeaCollectorAlerts from '@/app/teacollector/demo-teacollector-alerts';
import DemoTeaCollectorProfile from '@/app/teacollector/demo-teacollector-profile';
import {
  RequestFilter,
} from '@/components/ui/demo-teacollector-requestfilter';
import { colors } from '@/theme/colors';
const { width } = Dimensions.get('window');

// Sheets have been moved to a separate file to keep this file clean
import {
  FertDetailsSheet,
  LoadFertSheet,
  DeliverFertSheet,
  PickupSheet,
  DeclineSheet,
  ArrivedSheet,
  CollectSheet,
  ConfirmSheet,
  FactoryMapSheet,
  DeliverySheet,
  FactoryWeightSheet,
  MismatchSheet,
  RegisterSheet,
} from './teacollectorMobileSheets';

const nowTime = () => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

// ---------- mock data ----------
const INITIAL_STOPS = [
  { id: 1, name: "Ceylon Green Estate", owner: "A. Wickramasinghe", phone: "077 812 4456", gps: "7.2906Â° N, 80.7718Â° E", notes: "Leaves picked this morning, ready by 9 AM", estWeight: 68, dist: 2.4, status: "pending" },
  { id: 2, name: "Hill Breeze Gardens", owner: "N. Perera", phone: "071 220 9981", gps: "7.1935Â° N, 80.6812Â° E", notes: "Second harvest of the week", estWeight: 54, dist: 4.1, status: "accepted", acceptedAt: "8:20 AM" },
  { id: 3, name: "Mistvale Tea Farm", owner: "K. Bandara", phone: "076 554 3312", gps: "7.2011Â° N, 80.7020Â° E", notes: "", estWeight: 61, actualWeight: 61, status: "loaded" },
  { id: 4, name: "Oakridge Estate", owner: "D. Herath", phone: "072 118 2290", gps: "7.2299Â° N, 80.7115Â° E", notes: "", estWeight: 71, actualWeight: 71, status: "loaded" },
  { id: 5, name: "Green Hollow Estate", owner: "S. Fernando", phone: "075 331 8820", gps: "7.2540Â° N, 80.7301Â° E", notes: "", estWeight: null, status: "cancelled", reason: "Road blocked" },
  { id: 6, name: "Silverleaf Plantation", owner: "R. Dissanayake", phone: "070 442 7719", gps: "7.2180Â° N, 80.7422Â° E", notes: "New flush, small quantity", estWeight: 40, dist: 6.8, status: "pending" },
  { id: 7, name: "Windsor Tea Gardens", owner: "P. Jayasuriya", phone: "077 903 4471", gps: "7.1850Â° N, 80.6690Â° E", notes: "", estWeight: 74, actualWeight: 74, status: "delivered" },
];

const INITIAL_FERT_REQUESTS = [
  { 
    id: 1, 
    estateName: "Hill Breeze Gardens", 
    owner: "N. Perera", 
    phone: "071 220 9981",
    gps: "7.1935Â° N, 80.6812Â° E",
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
    gps: "7.2180Â° N, 80.7422Â° E",
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
    gps: "7.2906Â° N, 80.7718Â° E",
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
  { icon: 'add-circle-outline', bg: "#FBEFD8", fg: c.amberDeep, title: "New pickup request", desc: "Ceylon Green Estate Â· ~68 kg estimated", time: "12m" },
  { icon: 'checkmark-circle-outline', bg: "#E3EEE0", fg: c.sageDeep, title: "Pickup accepted", desc: "Hill Breeze Gardens confirmed for 10:30 AM", time: "40m" },
  { icon: 'alert-circle-outline', bg: "#F5E1DC", fg: c.rust, title: "Weight mismatch flagged", desc: "Mistvale Tea Farm Â· factory recorded 58 kg vs 61 kg", time: "1h" },
  { icon: 'business-outline', bg: "#DCEAE1", fg: c.forest, title: "Batch received at factory", desc: "Kotmale MPT confirmed 2 stops Â· 132 kg", time: "2h" },
  { icon: 'leaf-outline', bg: "#FBEFD8", fg: c.amberDeep, title: "Fertilizer confirmed", desc: "Urea 46% Â· 50 kg for Hill Breeze Gardens", time: "3h" },
];

// Sheets moved to teacollectorMobileSheets.tsx (see ./teacollectorMobileSheets)

// ---------- Main App ----------
export default function TeaCollectorMobile() {
  const router = useRouter();
  const [tab, setTab] = useState("home");
  const [filter, setFilter] = useState<RequestFilter>("all");
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
  
  // Temporary handler for onGoToEstate - you can implement this as needed
  const goToEstate = (stop: any) => {
    if (!stop) return;
    Alert.alert('Navigate', `Navigating to ${stop.name}`);
  };
  
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
    switch (tab) {
      case "home":
        return <DemoTeaCollectorHome setTab={setTab} setSheet={setSheet} fertRequests={fertRequests} />;
      case "collect":
        return (
          <DemoTeaCollectorCollect
            stops={stops}
            filter={filter}
            setFilter={setFilter}
            onViewDetails={openPickupDetails}
            onArrivedDetails={openArrivedDetails}
            onGoToFactory={goToFactory}
            onGoToEstate={goToEstate}
            setSheet={setSheet}
            history={HISTORY}
          />
        );
      case "fert":
        return (
          <DemoTeaCollectorFertilizer
            requests={fertRequests}
            onViewDetails={openFertDetails}
            onLoadFertilizer={loadFertilizer}
            onDeliverFertilizer={deliverFertilizer}
          />
        );
      case "notif":
        return <DemoTeaCollectorAlerts notifications={NOTIFICATIONS} />;
      case "profile":
        return <DemoTeaCollectorProfile />;
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

        <DemoTeaCollectorBottomTab items={NAV} activeId={tab} onSelect={setTab} />

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


