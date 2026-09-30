import React, { useState } from "react";
import {
  SafeAreaView,
  View,
  StyleSheet,
  ScrollView,
  Image,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import AppText from "@/components/ui/AppText";
import Avatar from "@/components/ui/Avatar";
import EstateManagerBottomTab from "@/components/ui/EstateManagerBottomTab";

export default function TeaEstateManagerDashboard() {
  const [activeTab, setActiveTab] = useState("dashboard");

  // Temporary dashboard data
  const collected = 1240;
  const target = 1500;
  const progress = collected / target;
  const progressPercentage = (progress * 100).toFixed(1);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.screen}>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >

          {/* ================= HEADER ================= */}
          <View style={styles.header}>

            <View style={styles.profileSection}>

              <Avatar
                name="Rohan"
                size={42}
              />

              <View style={styles.profileText}>
                <AppText style={styles.welcomeText}>
                  Welcome back,
                </AppText>

                <AppText style={styles.managerName}>
                  Manager Rohan
                </AppText>

                <AppText style={styles.estateName}>
                  Nuwara Eliya Highlands
                </AppText>
              </View>

            </View>

            <Pressable style={styles.notificationButton}>
              <Ionicons
                name="notifications-outline"
                size={23}
                color="#00875A"
              />
            </Pressable>

          </View>

          {/* ================= ESTATE IMAGE ================= */}
          <View style={styles.estateImageContainer}>

            <Image
              source={{
                uri:
                  "https://images.unsplash.com/photo-1594631252845-29fc4cc8cde9",
              }}
              style={styles.estateImage}
              resizeMode="cover"
            />

          </View>

          {/* ================= COLLECTION STATUS ================= */}
          <AppText style={styles.sectionTitle}>
            COLLECTION STATUS
          </AppText>

          <View style={styles.progressCard}>

            <View style={styles.progressHeader}>

              <AppText style={styles.dailyProgress}>
                Daily Progress
              </AppText>

              <AppText style={styles.progressPercentage}>
                {progressPercentage}%
              </AppText>

            </View>

            {/* Progress Bar */}
            <View style={styles.progressBackground}>

              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${progress * 100}%`,
                  },
                ]}
              />

            </View>

            <AppText style={styles.progressText}>
              {collected.toLocaleString()}kg of{" "}
              {target.toLocaleString()}kg target collected
            </AppText>

          </View>

          {/* ================= DASHBOARD CARDS ================= */}
          <View style={styles.cardsRow}>

            {/* Collections */}
            <Pressable
              style={styles.dashboardCard}
              onPress={() => {
                setActiveTab("dashboard");
              }}
            >

              <View style={styles.blueIcon}>
                <Ionicons
                  name="bicycle-outline"
                  size={24}
                  color="#5473B5"
                />
              </View>

              <AppText style={styles.cardTitle}>
                Collections
              </AppText>

              <AppText style={styles.cardValue}>
                12
              </AppText>

              <AppText style={styles.cardDescription}>
                Today's pickups
              </AppText>

            </Pressable>

            {/* Requests */}
            <Pressable
              style={styles.dashboardCard}
              onPress={() => {
                setActiveTab("dashboard");
              }}
            >

              <View style={styles.greenIcon}>
                <Ionicons
                  name="list-outline"
                  size={24}
                  color="#00875A"
                />
              </View>

              <AppText style={styles.cardTitle}>
                Requests
              </AppText>

              <AppText style={styles.cardValue}>
                8
              </AppText>

              <AppText style={styles.cardDescription}>
                Pending requests
              </AppText>

            </Pressable>

          </View>

          {/* Space for bottom navigation */}
          <View style={styles.bottomSpace} />

        </ScrollView>

        {/* ================= BOTTOM TAB ================= */}
        <View style={styles.bottomTab}>

          <EstateManagerBottomTab
            activeTab={activeTab}
            onTabPress={(tab) => {
              setActiveTab(tab.key);
            }}
          />

        </View>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#202222",
  },

  screen: {
    flex: 1,
    backgroundColor: "#F8F8FC",
  },

  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 100,
  },

  /* ================= HEADER ================= */

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },

  profileSection: {
    flexDirection: "row",
    alignItems: "center",
  },

  profileText: {
    marginLeft: 10,
  },

  welcomeText: {
    fontSize: 10,
    color: "#73788A",
  },

  managerName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#00875A",
    marginTop: 1,
  },

  estateName: {
    fontSize: 10,
    color: "#73788A",
    marginTop: 2,
  },

  notificationButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },

  /* ================= ESTATE IMAGE ================= */

  estateImageContainer: {
    width: "100%",
    height: 150,
    borderRadius: 8,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E6E6EC",
    backgroundColor: "#F5F5F8",
    marginBottom: 20,
  },

  estateImage: {
    width: "100%",
    height: "100%",
  },

  /* ================= COLLECTION STATUS ================= */

  sectionTitle: {
    fontSize: 10,
    fontWeight: "600",
    color: "#9A9EAD",
    letterSpacing: 0.7,
    marginBottom: 9,
  },

  progressCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D8D8D8",
    borderRadius: 8,
    padding: 13,
    marginBottom: 23,
  },

  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 9,
  },

  dailyProgress: {
    fontSize: 13,
    color: "#555A68",
  },

  progressPercentage: {
    fontSize: 16,
    fontWeight: "800",
    color: "#00875A",
  },

  progressBackground: {
    height: 7,
    width: "100%",
    backgroundColor: "#E5EBF7",
    borderRadius: 5,
    overflow: "hidden",
    marginBottom: 8,
  },

  progressFill: {
    height: "100%",
    backgroundColor: "#4DCE87",
    borderRadius: 5,
  },

  progressText: {
    fontSize: 10,
    color: "#73788A",
  },

  /* ================= DASHBOARD CARDS ================= */

  cardsRow: {
    flexDirection: "row",
    gap: 12,
  },

  dashboardCard: {
    flex: 1,
    minHeight: 150,
    backgroundColor: "#F1F4FC",
    borderWidth: 1,
    borderColor: "#D5DAE7",
    borderRadius: 7,
    padding: 13,
  },

  blueIcon: {
    width: 38,
    height: 38,
    borderRadius: 9,
    backgroundColor: "#DDE6FA",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },

  greenIcon: {
    width: 38,
    height: 38,
    borderRadius: 9,
    backgroundColor: "#CDEFE1",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },

  cardTitle: {
    fontSize: 12,
    color: "#5E6270",
  },

  cardValue: {
    fontSize: 22,
    fontWeight: "800",
    color: "#202530",
    marginTop: 3,
  },

  cardDescription: {
    fontSize: 9,
    color: "#8B8F9C",
    marginTop: 2,
  },

  /* ================= BOTTOM TAB ================= */

  bottomSpace: {
    height: 80,
  },

  bottomTab: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
  },
});