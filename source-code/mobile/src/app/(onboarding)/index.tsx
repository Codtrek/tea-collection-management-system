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
    description:
      "Digitize tea collection, and manage estate operations with confidence.",
  },
  {
    id: "2",
    title: "Connecting Every Step of Tea Collection",
    description:
      "One connected platform for seamless communication and operations.",
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

  const flatListRef = useRef<FlatList<(typeof slides)[0]>>(null);

  const handleNext = () => {
    console.log("BUTTON PRESSED:", currentIndex);

    // If this is the last slide
    if (currentIndex === slides.length - 1) {
      router.push("/select-role");
      return;
    }

    // Move to next slide
    const nextIndex = currentIndex + 1;

    // Update pagination dot
    setCurrentIndex(nextIndex);

    // Scroll FlatList
    flatListRef.current?.scrollToOffset({
      offset: containerWidth * nextIndex,
      animated: true,
    });
  };

  return (
    <Screen style={styles.container}>
      <View
        style={styles.content}
        onLayout={(event) => {
          setContainerWidth(event.nativeEvent.layout.width);
        }}
      >
        <FlatList
          ref={flatListRef}
          data={slides}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View
              style={[
                styles.slide,
                {
                  width: containerWidth,
                },
              ]}
            >
              <AppText style={styles.title}>
                {item.title}
              </AppText>

              <AppText style={styles.caption}>
                {item.description}
              </AppText>
            </View>
          )}
        />

        {/* Next / Get Started Button */}
        <AppButton
          title={
            currentIndex === slides.length - 1
              ? "Get Started"
              : "Next"
          }
          onPress={handleNext}
          style={styles.button}
        />

        {/* Pagination Dots */}
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
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  content: {
    flex: 1,
    width: "100%",
  },

  slide: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },

  title: {
    ...typography.heading,
    color: colors.black,
    marginBottom: spacing.xl,
    textAlign: "center",
  },

  caption: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: "center",
  },

  button: {
    position: "absolute",
    bottom: 50,
    alignSelf: "center",
    zIndex: 10,
    elevation: 10,
  },

  pagination: {
    position: "absolute",
    bottom: 25,
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
});