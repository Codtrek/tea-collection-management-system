import type { EstateProfile } from "@/types/estateOwner";

const teaGardenImage =
  "https://images.unsplash.com/photo-1603097148068-564d0158227e?q=80&w=1331&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=NHwxMjA3fDA%3D";

export const estateProfiles: EstateProfile[] = [
  {
    id: "nuwara-eliya-highlands",
    imageSrc: teaGardenImage,
    name: "Nuwara Eliya Highlands",
    location: "134/A, Up Road, Kothmale",
    areaAcres: 100,
    grade: "Super",
    managerName: "Kumara Silva",
    managerPhone: "0765674677",
    factories: [
      { name: "Tea King Factory", address: "3, Hector Road, Kandy" },
      { name: "Ceylon Tea", address: "45-A, Ceylon Road, Kadugama, Kandy" },
    ],
    workersActive: 24,
    workersTotal: 30,
    workers: [
      { id: "worker-1", name: "Nimal Perera", role: "Field supervisor" },
      { id: "worker-2", name: "Chandani Silva", role: "Tea plucker" },
      { id: "worker-3", name: "Saman Kumara", role: "Tea plucker" },
      { id: "worker-4", name: "Dilani Fernando", role: "Tea plucker" },
    ],
    weeklyPluckedWeightsKg: [126, 148, 139, 172, 96, 184, 168],
    recentActivities: [
      {
        id: "activity-1",
        description: "Tea collected successfully",
        factory: "Ceylon Tea",
        timeAgo: "1 day ago",
      },
      {
        id: "activity-2",
        description: "Tea collected successfully",
        factory: "Tea King Factory",
        timeAgo: "1 day ago",
      },
      {
        id: "activity-3",
        description: "Collection request accepted",
        factory: "Ceylon Tea",
        timeAgo: "2 days ago",
      },
    ],
  },
  {
    id: "hilltop-tea-gardens",
    imageSrc: teaGardenImage,
    name: "Hilltop Tea Gardens",
    location: "18/B, Upper Road, Kotmale",
    areaAcres: 64,
    grade: "Normal",
    managerName: "K.P. Kumara",
    managerPhone: "0712345678",
    factories: [
      { name: "Tea King Factory", address: "3, Hector Road, Kandy" },
      { name: "Ceylon Tea", address: "45-A, Ceylon Road, Kadugama, Kandy" },
    ],
    workersActive: 18,
    workersTotal: 24,
    workers: [
      { id: "worker-5", name: "Suresh Perera", role: "Field supervisor" },
      { id: "worker-6", name: "Ruwani Silva", role: "Tea plucker" },
      { id: "worker-7", name: "Nuwan Jayasuriya", role: "Tea plucker" },
    ],
    weeklyPluckedWeightsKg: [98, 121, 105, 144, 88, 156, 137],
    recentActivities: [
      {
        id: "activity-4",
        description: "Tea collected successfully",
        factory: "Tea King Factory",
        timeAgo: "Today",
      },
      {
        id: "activity-5",
        description: "Collection request accepted",
        factory: "Ceylon Tea",
        timeAgo: "Yesterday",
      },
    ],
  },
  {
    id: "misty-ridge-estate",
    imageSrc: teaGardenImage,
    name: "Misty Ridge Estate",
    location: "77, Hatton Road, Nuwara Eliya",
    areaAcres: 82,
    grade: "Mixed",
    managerName: "K.P. Silva",
    managerPhone: "0771234567",
    factories: [
      { name: "Tea King Factory", address: "3, Hector Road, Kandy" },
      { name: "Ceylon Tea", address: "45-A, Ceylon Road, Kadugama, Kandy" },
    ],
    workersActive: 21,
    workersTotal: 28,
    workers: [
      { id: "worker-8", name: "Kamal Silva", role: "Field supervisor" },
      { id: "worker-9", name: "Malini Perera", role: "Tea plucker" },
      { id: "worker-10", name: "Anura Fernando", role: "Tea plucker" },
    ],
    weeklyPluckedWeightsKg: [112, 134, 128, 163, 91, 176, 153],
    recentActivities: [
      {
        id: "activity-6",
        description: "Tea collected successfully",
        factory: "Ceylon Tea",
        timeAgo: "Today",
      },
      {
        id: "activity-7",
        description: "Collection request accepted",
        factory: "Tea King Factory",
        timeAgo: "Yesterday",
      },
    ],
  },
];
