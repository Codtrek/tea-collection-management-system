import { useRef, useState } from "react";
import { FlatList, View, Dimensions, StyleSheet, Platform } from "react-native";
import { AppText, Screen, AppButton } from "@/components/ui";
import { typography, colors, spacing } from "@/theme";
import { useRouter } from "expo-router";

const { width } = Dimensions.get("window");

const slides = [
  {
    id: "1",
    title: "Growing Tea, Smarter Together Every Day",
    description: "Digitize tea collection, and manage estate operations with confidence.",
  },
  {
    id: "2",
    title: "Connecting Every Step of Tea Collection",
    description: "One connected platform for seamless communication and operations.",
  },
  {
    id: "3",
    title: "Slide 3",
    description: "Description 3",
  },
];



export default function OnboardingScreen() {
  const router = useRouter();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [containerWidth, setContainerWidth] = useState(width);
  const slideWidth = containerWidth || width;

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index ?? 0);
    }
  }).current;

  const viewabilityConfig = useRef({
    viewAreaCoveragePercentThreshold: 50,
  }).current;

  const flatListRef = useRef<FlatList<typeof slides[0]>>(null);

  return (
    <>
    <Screen style={styles.container}>
      <View style={styles.app}>

        <View style={{ flex: 1, width: "100%"}} onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}> 

          <FlatList
            ref={flatListRef}
            data={slides}
            horizontal
            pagingEnabled
            style={styles.carousel}
            contentContainerStyle={{ justifyContent: "center", alignItems: "center" }}
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item.id}
            getItemLayout={(_, index) => ({
              length: slideWidth,
              offset: slideWidth * index,
              index,
            })}
            renderItem={({ item }) => (
              <View style={[styles.slide, { width: slideWidth }]}>
                <AppText style={styles.title}>{item.title}</AppText>
                <AppText style={styles.caption}>{item.description}</AppText>
              </View>
            )}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={viewabilityConfig}
          />

          <AppButton
            title={currentIndex === slides.length - 1 ? "Get Started" : "Next"}
            onPress={() => {
              if (currentIndex === slides.length - 1) {
                router.push("/(onboarding)/select-role");
              } else {
                flatListRef.current?.scrollToOffset({
                  offset: slideWidth * (currentIndex + 1),
                  animated: true,
                });
              }
            }}
            style={styles.button}
          />

          <View style={styles.pagination}>
            {slides.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.dot,
                  currentIndex === index && styles.activeDot,
                ]}
              />
            ))}
          </View>
        </View>
      </View>

    </Screen>
    </>

  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: "100%",
    alignItems: "center",
  },
  app: {
    flex: 1,
    width: "100%",
    maxWidth: Platform.OS === "web" ? 393 : "100%",
  },
  carousel: {
    flex: 1,
    width: "100%",
    
  },
  slide: {
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    ...typography.heading,
    color: colors.black,
    marginBottom: spacing.xl,

  },
  caption: {
    ...typography.body,
    color: colors.text.secondary,
  },
  button: {
    position: "absolute",
    bottom: 50,
    alignSelf: "center",
  },
  pagination: {
    // position: "absolute",
    // bottom: 100,
    alignSelf: "center",
    flexDirection: "row",
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.disabled,
    marginHorizontal: 4,
  },
  activeDot: {
    backgroundColor: colors.primary,
  },
})
