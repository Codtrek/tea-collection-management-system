import {
  View,
  StyleSheet,
  ViewProps,
  ScrollView,
  Platform,
} from "react-native";

import {SafeAreaView} from "react-native-safe-area-context";

interface ScreenProps extends ViewProps {
  children: React.ReactNode;
  scroll?: boolean;
  header?: React.ReactNode;
}

export default function Screen({
  children,
  scroll = false,
  header,
  style,
  ...props
}: ScreenProps) {
  if (scroll) {
    return (
      <SafeAreaView style={styles.safeArea}>
        {header}
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
      {header}
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
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    alignSelf: "center",
    maxWidth: Platform.OS === 'web' ? 393 : '100%',
    width: "100%",
  },
});