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
import { AppBar } from '@/components/ui/demo-teacollector-header';

import { DetailRow } from '@/components/ui/demo-teacollector-detail-row';


import { FormField as Field, FormInput as Input, FormSelect as Select } from '@/components/forms';
import DemoTeaCollectorBottomTab from '@/components/layout/demo-teacollector-BottomTab';

import DemoTeaCollectorHome from '@/app/teacollector/demo-teacollector-home';
import DemoTeaCollectorCollect from '@/app/teacollector/demo-teacollector-collect';
import DemoTeaCollectorFertilizer from '@/app/teacollector/demo-teacollector-fertilizer';
import DemoTeaCollectorAlerts from '@/app/teacollector/demo-teacollector-alerts';
import DemoTeaCollectorProfile from '@/app/teacollector/demo-teacollector-profile';
import {
  FertilizerRequestFilter,
  RequestFilter,
} from '@/components/ui/demo-teacollector-requestfilter';
import { colors } from '@/theme/colors';
const { width } = Dimensions.get('window');

// Sheets have been moved to a separate file to keep this file clean
import {
  FertDetailsSheet,
  LoadFertSheet,
  FertilizerNavigateSheet,
  PickupSheet,
  DeclineSheet,
  CancelPickupSheet,
  ArrivedSheet,
  CollectSheet,
  ConfirmSheet,
  FactoryMapSheet,
  DeliverySheet,
  RegisterSheet,
  ManualCollectionRequestSheet,
  BatchCancelRequestsSheet,
} from './teacollectorMobileSheets';
const TITLES: Record<string, any> = {
  home: {
    eyebrow: "Wed, 04 Jul",
    title: "Good morning, Sunil",
  },

  collect: {
    eyebrow: "Today's Collections",
    title: "Pickup Requests",
    dark: true,
    sub: ["Vehicle: LP-4471", "Factory: Kotmale MPT"],
  },

  fert: {
    eyebrow: "Fertilizer Delivery",
    title: "Assigned Today",
    dark: true,
  },

  notif: {
    eyebrow: "Alerts",
    title: "Notifications",
  },

  profile: {
    eyebrow: "Account",
    title: "Profile",
  },
};
const nowTime = () => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

// ---------- mock data ----------
type CollectionStop = {
  id: number;
  name: string;
  owner: string;
  phone: string;
  location: string;
  gps?: string;
  notes?: string;
  estimatedWeight: number;
  actualWeight?: number;
  collectionNote?: string;
  factoryReceivedAt?: string;
  receivingOfficer?: string;
  dist?: number;
  status: string;
  acceptedAt?: string;
  reason?: string;
  requestDate?: string;
  requestReason?: string;
  manualRequest?: boolean;
  mismatch?: boolean;
};

const INITIAL_STOPS = [
  { id: 1, name: "Ceylon Green Estate", owner: "A. Wickramasinghe", phone: "077 812 4456", location: "Ramboda, Nuwara Eliya", gps: "7.2906Â° N, 80.7718Â° E", notes: "Leaves picked this morning, ready by 9 AM", estimatedWeight: 68, dist: 2.4, status: "pending" },
  { id: 2, name: "Hill Breeze Gardens", owner: "N. Perera", phone: "071 220 9981", location: "Kotmale, Nuwara Eliya", gps: "7.1935Â° N, 80.6812Â° E", notes: "Second harvest of the week", estimatedWeight: 54, dist: 4.1, status: "accepted", acceptedAt: "8:20 AM" },
  { id: 3, name: "Mistvale Tea Farm", owner: "K. Bandara", phone: "076 554 3312", location: "Pussellawa, Nuwara Eliya", gps: "7.2011Â° N, 80.7020Â° E", notes: "", estimatedWeight: 61, actualWeight: 61, status: "loaded" },
  { id: 4, name: "Oakridge Estate", owner: "D. Herath", phone: "072 118 2290", location: "Nawalapitiya, Kandy", gps: "7.2299Â° N, 80.7115Â° E", notes: "", estimatedWeight: 71, actualWeight: 71, status: "loaded" },
  { id: 5, name: "Green Hollow Estate", owner: "S. Fernando", phone: "075 331 8820", location: "Ginigathhena, Nuwara Eliya", gps: "7.2540Â° N, 80.7301Â° E", notes: "", estimatedWeight: 0, status: "cancelled", reason: "Road blocked" },
  { id: 6, name: "Silverleaf Plantation", owner: "R. Dissanayake", phone: "070 442 7719", location: "Talawakelle, Nuwara Eliya", gps: "7.2180Â° N, 80.7422Â° E", notes: "New flush, small quantity", estimatedWeight: 40, dist: 6.8, status: "pending" },
  { id: 7, name: "Windsor Tea Gardens", owner: "P. Jayasuriya", phone: "077 903 4471", location: "Hatton, Nuwara Eliya", gps: "7.1850Â° N, 80.6690Â° E", notes: "", estimatedWeight: 74, actualWeight: 74, status: "delivered" },
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
    estimatedDistanceKm: 4.1,
    requestedAt: "2026-07-23 08:15",
    status: "pending",
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
    estimatedDistanceKm: 6.8,
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
    estimatedDistanceKm: 2.4,
    requestedAt: "2026-07-23 06:30",
    status: "delivered",
    confirmedAt: "2026-07-23 07:15",
    loadedAt: "2026-07-23 08:45",
    deliveredAt: "2026-07-23 09:30",
    notes: "For organic section"
  },
  {
    id: 4,
    estateName: "Oakridge Estate",
    owner: "D. Herath",
    phone: "072 118 2290",
    gps: "7.2299° N, 80.7115° E",
    fertilizerType: "Urea 46%",
    quantity: 40,
    estimatedDistanceKm: 5.2,
    requestedAt: "2026-07-23 08:45",
    status: "confirmed",
    confirmedAt: "2026-07-23 09:10",
    notes: "For the north field"
  },
];

const RECEIVING_OFFICERS = ["K. Abeysekera", "M. Rathnayake", "S. Weerasinghe", "T. Gunasekara"];

const HISTORY = [
  { name: "Oakhurst Estate", date: "03 Jul", type: "Black Tea", weight: 88 },
  { name: "Rosemount Gardens", date: "02 Jul", type: "Black Tea", weight: 66 },
];

const NOTIFICATIONS: React.ComponentProps<typeof DemoTeaCollectorAlerts>['notifications'] = [
  {
    icon: 'leaf-outline',
    type: 'pickupCancelled',
    title: "Cancel pickup request by Owner",
    desc: "Kotmale MPT owner: Couldn't ready the tea.",
    time: "1h",
  },
  {
    icon: 'leaf-outline',
    type: 'pickupCancelled',
    title: "Cancel pickup request by Manager",
    desc: "Another factory manager: Road blocked.",
    time: "2h",
  },
  {
    icon: 'sprout',
    iconFamily: 'materialCommunity',
    type: 'fertilizerCancelled',
    title: "Cancel fertilizer request by Owner",
    desc: "Kotmale MPT Estate Owner: Fertilizer no longer needed.",
    time: "2h",
  },
  {
    icon: 'sprout',
    iconFamily: 'materialCommunity',
    type: 'fertilizerCancelled',
    title: "Cancel fertilizer request by Manager",
    desc: "Kotmale MPT Manager: Delivery schedule changed.",
    time: "3h",
  },
  { icon: 'business-outline', type: 'info', title: "Batch received at factory", desc: "Kotmale MPT confirmed 2 stops Â· 132 kg", time: "2h" },
];

// Sheets moved to teacollectorMobileSheets.tsx (see ./teacollectorMobileSheets)

// ---------- Main App ----------
export default function TeaCollectorMobile() {
  const router = useRouter();
  const [tab, setTab] = useState("home");
  const [filter, setFilter] = useState<RequestFilter>("all");
  const [fertilizerFilter, setFertilizerFilter] =
    useState<FertilizerRequestFilter>("all");
  const [stops, setStops] = useState<CollectionStop[]>(INITIAL_STOPS);
  const [collectionReportNotifications, setCollectionReportNotifications] =
    useState<React.ComponentProps<typeof DemoTeaCollectorAlerts>['notifications']>([]);
  const [pickupCancellationNotifications, setPickupCancellationNotifications] =
    useState<React.ComponentProps<typeof DemoTeaCollectorAlerts>['notifications']>([]);
  const [fertilizerCancellationNotifications, setFertilizerCancellationNotifications] =
    useState<React.ComponentProps<typeof DemoTeaCollectorAlerts>['notifications']>([]);
  const [fertilizerSelectionMode, setFertilizerSelectionMode] = useState(false);
  const [selectedFertilizerRequestIds, setSelectedFertilizerRequestIds] = useState<number[]>([]);
  const [fertRequests, setFertRequests] = useState(INITIAL_FERT_REQUESTS);
  const [activeStop, setActiveStop] = useState<any>(null);
  const [activeFert, setActiveFert] = useState<any>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedRequestIds, setSelectedRequestIds] = useState<number[]>([]);
  const [collectedWeight, setCollectedWeight] = useState(0);
  const [officer, setOfficer] = useState("");
  const [sheet, setSheet] = useState<string | null>(null);

  const updateStop = (id: number, patch: any) => setStops((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  const updateFert = (id: number, patch: any) => setFertRequests((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const createPickupCancellationNotification = (
    stop: CollectionStop,
    reason: string,
    note: string,
  ) => ({
    icon: 'leaf-outline' as const,
    type: 'pickupCancelled' as const,
    title: "Cancel pickup request by me",
    desc: `${stop.name}: ${reason}${note.trim() ? ` — ${note.trim()}` : ''}`,
    time: nowTime(),
  });

  const createFertilizerCancellationNotification = (
    request: { estateName: string },
    reason: string,
    note: string,
  ) => ({
    icon: 'sprout' as const,
    iconFamily: 'materialCommunity' as const,
    type: 'fertilizerCancelled' as const,
    title: "Cancel fertilizer request by me",
    desc: `${request.estateName}: ${reason}${note.trim() ? ` — ${note.trim()}` : ''}`,
    time: nowTime(),
  });

  const toggleFertilizerRequestSelection = (request: { id: number; status: string }) => {
    if (!["pending", "confirmed", "loaded"].includes(request.status)) return;
    setSelectedFertilizerRequestIds((selectedIds) =>
      selectedIds.includes(request.id)
        ? selectedIds.filter((id) => id !== request.id)
        : [...selectedIds, request.id],
    );
  };

  const startFertilizerSelectionWithRequest = (request: {
    id: number;
    status: string;
  }) => {
    if (!["pending", "confirmed", "loaded"].includes(request.status)) return;
    setSelectedFertilizerRequestIds([request.id]);
    setFertilizerSelectionMode(true);
  };

  const finishFertilizerRequestSelection = () => {
    setSelectedFertilizerRequestIds([]);
    setFertilizerSelectionMode(false);
  };

  const cancelSelectedFertilizerRequests = (reason: string, note: string) => {
    if (selectedFertilizerRequestIds.length === 0) {
      console.warn("No fertilizer requests selected for cancellation");
      return;
    }

    const selectedIds = new Set(selectedFertilizerRequestIds);
    const cancelledRequests = fertRequests.filter(
      (request) =>
        selectedIds.has(request.id) &&
        ["pending", "confirmed", "loaded"].includes(request.status),
    );
    const cancelledAt = nowTime();

    setFertRequests((previousRequests) =>
      previousRequests.map((request) =>
        selectedIds.has(request.id) &&
        ["pending", "confirmed", "loaded"].includes(request.status)
          ? { ...request, status: "cancelled", cancelledAt, reason, note }
          : request,
      ),
    );
    setFertilizerCancellationNotifications((previousNotifications) => [
      ...cancelledRequests.map((request) =>
        createFertilizerCancellationNotification(request, reason, note),
      ),
      ...previousNotifications,
    ]);
    finishFertilizerRequestSelection();
    setSheet(null);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  };

  const toggleRequestSelection = (stop: CollectionStop) => {
    if (stop.status !== "pending" && stop.status !== "accepted") return;
    setSelectedRequestIds((selectedIds) =>
      selectedIds.includes(stop.id)
        ? selectedIds.filter((id) => id !== stop.id)
        : [...selectedIds, stop.id],
    );
  };

  const startRequestSelection = () => {
    setSelectedRequestIds([]);
    setSelectionMode(true);
  };
  const startSelectionWithRequest = (stop: CollectionStop) => {
  if (stop.status !== "pending" && stop.status !== "accepted") return;

  setSelectedRequestIds([stop.id]);
  setSelectionMode(true);
};

  const finishRequestSelection = () => {
    setSelectedRequestIds([]);
    setSelectionMode(false);
  };

  const cancelSelectedRequests = (reason: string, note: string) => {
    if (selectedRequestIds.length === 0) {
      console.warn("No pickup requests selected for cancellation");
      return;
    }

    const selectedIds = new Set(selectedRequestIds);
    const cancelledStops = stops.filter(
      (stop) =>
        selectedIds.has(stop.id) &&
        (stop.status === "pending" || stop.status === "accepted"),
    );
    setStops((previousStops) =>
      previousStops.map((stop) =>
        selectedIds.has(stop.id) && (stop.status === "pending" || stop.status === "accepted")
          ? { ...stop, status: "cancelled", reason, note }
          : stop,
      ),
    );
    setPickupCancellationNotifications((previousNotifications) => [
      ...cancelledStops.map((stop) =>
        createPickupCancellationNotification(stop, reason, note),
      ),
      ...previousNotifications,
    ]);
    finishRequestSelection();
    setSheet(null);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  };

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

  const confirmDecline = (reason: string, note: string) => { 
    if (!activeStop) {
      console.warn("No active stop to decline");
      return;
    }
    
    updateStop(activeStop.id, { 
      status: "cancelled", 
      reason,
      note 
    }); 
    setPickupCancellationNotifications((previousNotifications) => [
      createPickupCancellationNotification(activeStop, reason, note),
      ...previousNotifications,
    ]);
    setSheet(null);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  };

  const goToFertilizerDecline = () => {
    if (!activeFert) {
      console.warn("No active fertilizer request to decline");
      return;
    }
    setSheet("fertDecline");
  };

  const confirmFertilizerDecline = (reason: string, note: string) => {
    if (!activeFert) {
      console.warn("No active fertilizer request to decline");
      return;
    }

    updateFert(activeFert.id, {
      status: "declined",
      declinedAt: nowTime(),
      reason,
      note,
    });
    setSheet(null);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  };

  const goToFertilizerCancel = () => {
    if (!activeFert) {
      console.warn("No active fertilizer request to cancel");
      return;
    }
    setSheet("fertCancel");
  };

  const confirmFertilizerCancel = (reason: string, note: string) => {
    if (!activeFert) {
      console.warn("No active fertilizer request to cancel");
      return;
    }

    updateFert(activeFert.id, {
      status: "cancelled",
      cancelledAt: nowTime(),
      reason,
      note,
    });
    setFertilizerCancellationNotifications((previousNotifications) => [
      createFertilizerCancellationNotification(activeFert, reason, note),
      ...previousNotifications,
    ]);
    setSheet(null);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  };

  const confirmCancelPickup = (reason: string, note: string) => {
    if (!activeStop) {
      console.warn("No active stop to cancel");
      return;
    }

    updateStop(activeStop.id, {
      status: "cancelled",
      reason,
      note,
    });
    setPickupCancellationNotifications((previousNotifications) => [
      createPickupCancellationNotification(activeStop, reason, note),
      ...previousNotifications,
    ]);
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

  const submitCollection = (collection: {
    weight: string;
    photoUri?: string;
    remark: string;
  }) => {
    if (!activeStop) {
      console.warn("No active stop to submit collection");
      return;
    }
    
    const weight = parseFloat(collection.weight) || 0;
    setCollectedWeight(weight);
    updateStop(activeStop.id, { 
      actualWeight: weight,
      photoUri: collection.photoUri,
      collectionNote: collection.remark.trim(),
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
  const submitToFactory = () => {
    const submittedEstates = stops
      .filter((stop) => stop.status === "loaded")
      .map((stop) => stop.name);
    const receivedAt = nowTime();
    setStops((previousStops) =>
      previousStops.map((stop) =>
        stop.status === "loaded"
          ? {
              ...stop,
              status: "delivered",
              factoryReceivedAt: receivedAt,
              receivingOfficer: officer,
            }
          : stop,
      ),
    );
    if (submittedEstates.length > 0) {
      setCollectionReportNotifications((previousNotifications) => [
        {
          icon: 'leaf-outline',
          type: 'collectionReport',
          title: "Tea collection report submitted",
          desc: submittedEstates.join(", "),
          time: receivedAt,
        },
        ...previousNotifications,
      ]);
    }
    setOfficer("");
    setSheet(null);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const createManualCollectionRequest = ({
    estate,
    estimatedWeight,
    pickupDate,
    reason,
  }: {
    estate: {
      id: number;
      name: string;
      owner: string;
      phone: string;
      location: string;
      gps?: string;
    };
    estimatedWeight: number;
    pickupDate: Date;
    reason: string;
  }) => {
    setStops((previousStops) => [
      ...previousStops,
      {
        id: Date.now(),
        name: estate.name,
        owner: estate.owner,
        phone: estate.phone,
        location: estate.location,
        gps: estate.gps,
        notes: reason,
        estimatedWeight,
        requestDate: pickupDate.toISOString(),
        requestReason: reason,
        manualRequest: true,
        status: "accepted",
        acceptedAt: nowTime(),
      },
    ]);
    setSheet(null);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  // Fertilizer handlers
  const openFertDetails = (request: any) => { 
    if (!request) return;
    setActiveFert(request); 
    setSheet("fertDetails"); 
  };

  const acceptFertilizer = (request: any) => {
    if (!request || request.status !== "pending") return;
    updateFert(request.id, {
      status: "confirmed",
      confirmedAt: nowTime(),
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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

  const navigateToFertilizerEstate = (request: any) => {
    if (!request) return;
    setActiveFert(request); 
    setSheet("fertNavigate");
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
  ];



  const loadedStops = stops.filter((s) => s.status === "loaded");
  const notifications: React.ComponentProps<typeof DemoTeaCollectorAlerts>['notifications'] = [
    ...pickupCancellationNotifications,
    ...fertilizerCancellationNotifications,
    ...collectionReportNotifications,
    ...stops
      .filter((stop) => stop.status === "pending")
      .map((stop) => ({
        icon: 'leaf-outline' as const,
        type: 'pickup' as const,
        title: "New pickup request",
        desc: `${stop.name} · ~${stop.estimatedWeight} kg estimated`,
        time: "Now",
      })),
    ...fertRequests
      .filter((request) => request.status === "pending")
      .map((request) => ({
        icon: 'sprout' as const,
        iconFamily: 'materialCommunity' as const,
        type: 'pendingFertilizer' as const,
        title: "New fertilizer request",
        desc: `${request.estateName} · ${request.fertilizerType} · ${request.quantity} kg`,
        time: "Now",
      })),
    ...NOTIFICATIONS,
  ];

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
            selectionMode={selectionMode}
            selectedRequestIds={selectedRequestIds}
            onToggleRequestSelection={toggleRequestSelection}
            onStartSelectionWithRequest={startSelectionWithRequest}
            onStartRequestSelection={startRequestSelection}
            onCancelRequestSelection={finishRequestSelection}
            onCancelSelectedRequests={() => setSheet("cancelSelectedRequests")}
          />
        );
      case "fert":
        return (
          <DemoTeaCollectorFertilizer
            requests={fertRequests}
            filter={fertilizerFilter}
            setFilter={setFertilizerFilter}
            onViewDetails={openFertDetails}
            onAcceptFertilizer={acceptFertilizer}
            onLoadFertilizer={loadFertilizer}
            onNavigateToFertilizerEstate={navigateToFertilizerEstate}
            selectionMode={fertilizerSelectionMode}
            selectedRequestIds={selectedFertilizerRequestIds}
            onToggleRequestSelection={toggleFertilizerRequestSelection}
            onStartSelectionWithRequest={startFertilizerSelectionWithRequest}
            onCancelRequestSelection={finishFertilizerRequestSelection}
            onCancelSelectedRequests={() => setSheet("cancelSelectedFertRequests")}
          />
        );
      case "notif":
        return <DemoTeaCollectorAlerts notifications={notifications} />;
      case "profile":
        return <DemoTeaCollectorProfile />;
      default:
        return null;
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.success }}>
      

      
      <View style={{
        flex: 1,
        margin: Platform.OS === 'ios' ? 14 : 0,
        borderRadius: Platform.OS === 'ios' ? 38 : 0,
        overflow: 'hidden',
       
      }}>
        
        <AppBar
          {...TITLES[tab]}
          onProfilePress={tab === 'profile' ? undefined : () => setTab('profile')}
        />
        <View
        style={{

          height: 2,
          marginHorizontal: 20,
          backgroundColor: colors.border.focused,
          opacity: 0.6,
          borderRadius: 2,
        }}
        />

        {renderScreen()}

        <DemoTeaCollectorBottomTab items={NAV} activeId={tab} onSelect={setTab} />

        {/* Tea collection overlays */}
        <PickupSheet open={sheet === "pickup"} stop={activeStop} onClose={() => setSheet(null)} onAccept={acceptPickup} onDecline={goToDecline} />
        <DeclineSheet open={sheet === "decline"} onClose={() => setSheet(null)} onConfirm={confirmDecline} />
        <DeclineSheet
          open={sheet === "fertDecline"}
          onClose={() => setSheet("fertDetails")}
          onConfirm={confirmFertilizerDecline}
          requestLabel="fertilizer request"
          confirmationMessage="This fertilizer request will be declined and the estate owner will be notified."
        />
        <ArrivedSheet open={sheet === "arrived"} stop={activeStop} onClose={() => setSheet(null)} onStartCollection={startCollection} onCall={handleCall} onCancelPickup={() => setSheet("cancelPickup")} />
        <CancelPickupSheet open={sheet === "cancelPickup"} onBack={() => setSheet("arrived")} onConfirm={confirmCancelPickup} />
        <CancelPickupSheet
          open={sheet === "fertCancel"}
          onBack={() => setSheet("fertDetails")}
          onConfirm={confirmFertilizerCancel}
          requestLabel={activeFert?.status === "confirmed" ? "fertilizer request" : "fertilizer delivery"}
        />
        <BatchCancelRequestsSheet
          open={sheet === "cancelSelectedRequests"}
          requestCount={selectedRequestIds.length}
          onClose={() => setSheet(null)}
          onConfirm={cancelSelectedRequests}
        />
        <BatchCancelRequestsSheet
          open={sheet === "cancelSelectedFertRequests"}
          requestCount={selectedFertilizerRequestIds.length}
          requestLabel="fertilizer request"
          onClose={() => setSheet(null)}
          onConfirm={cancelSelectedFertilizerRequests}
        />
        <CollectSheet open={sheet === "collect"} stop={activeStop} onClose={() => setSheet(null)} onBack={() => setSheet("arrived")} onSubmit={submitCollection} />
        <ConfirmSheet open={sheet === "confirm"} stop={activeStop} weight={collectedWeight} onBack={() => setSheet("collect")} onClose={continueCollecting} />
        
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
          onBack={() => setSheet("map")}
          onSubmit={submitToFactory}
        />
        <ManualCollectionRequestSheet
          open={sheet === "manualRequest"}
          estates={INITIAL_STOPS}
          onClose={() => setSheet(null)}
          onSubmit={createManualCollectionRequest}
        />

        {/* Fertilizer overlays */}
        <FertDetailsSheet
          open={sheet === "fertDetails"}
          request={activeFert}
          onClose={() => setSheet(null)}
          onAccept={() => acceptFertilizer(activeFert)}
          onLoad={() => loadFertilizer(activeFert)}
          onNavigate={() => navigateToFertilizerEstate(activeFert)}
          onCancel={goToFertilizerCancel}
        />
        <LoadFertSheet 
          open={sheet === "fertLoad"} 
          request={activeFert} 
          onClose={() => setSheet(null)} 
          onConfirm={confirmLoadFertilizer}
        />
        <FertilizerNavigateSheet
          open={sheet === "fertNavigate"}
          request={activeFert} 
          onClose={() => setSheet(null)} 
          onDeliver={confirmDeliverFertilizer}
        />

        <RegisterSheet open={sheet === "register"} onClose={() => setSheet(null)} />
      </View>
    </View>
  );
}
