import { useRef, useState } from "react";
import { FlatList, View, Dimensions, StyleSheet } from "react-native";
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
    id: "Select ",
    title: "Slide 3",
    description: "Description 3",
  },
];



export default function OnboardingScreen() {
  const router = useRouter();

  const [currentIndex, setCurrentIndex] = useState(0);

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index ?? 0);
    }
  }).current;

  const viewabilityConfig = useRef({
    viewAreaCoveragePercentThreshold: 50,
  }).current;

  return (
    <>
    
      <FlatList
        data={slides}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Screen style={[styles.container, { width }]}>
            <View style={styles.slide}>
              {<AppText style={styles.title}>{item.title}</AppText>}
              {<AppText style={styles.caption}>{item.description}</AppText>}
              
              if(currentIndex === slides.length - 1) {
                <AppButton
                  title="Get Started"
                  onPress={() => router.push("./select-role")}
                />
              } else {
                <AppButton
                  title="Next"
                  onPress={() => {
                    const nextIndex = currentIndex + 1;
                    if (nextIndex < slides.length) {
                      setCurrentIndex(nextIndex);
                    }
                  }}
                />
              }
              
              
            </View>
          </Screen>
        )}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
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
    </>

  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  slide: {
    flex: 1,
    justifyContent: "center",
  },
  title: {
    ...typography.hero,
    color: colors.primary,
    marginBottom: spacing.xl,

  },
  caption: {
    ...typography.body,
    color: colors.text.secondary,
  },
  pagination: {
    position: "absolute",
    bottom: 100,
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
