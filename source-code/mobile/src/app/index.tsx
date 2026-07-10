import{ View, Text, StyleSheet } from "react-native";
import { colors, spacing, typography } from "@/theme";

export default function HomeScreen() {
  return(
    <View style={styles.container}>
      <Text style={typography.heading as any}>Hello world!</Text>
    </View>
  );

}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.primary,
    padding: spacing.lg,
  }
});