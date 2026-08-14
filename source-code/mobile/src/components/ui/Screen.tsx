import {
  View,
  StyleSheet,
  ViewProps,
  ScrollView,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

interface ScreenProps extends ViewProps {
  children: React.ReactNode;
  scroll?: boolean;
}

export default function Screen({
  children,
  scroll = false,
  style,
  ...props
}: ScreenProps) {
  if (scroll) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={[
            styles.container,
            style,
          ]}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View
        {...props}
        style={[
          styles.container,
          style,
        ]}
      >
        {children}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    justifyContent: "center",
  },

  container: {
    flex: 1,
    paddingHorizontal: 20,
    backgroundColor: "#FFFFFF",
  },
});