import { colors } from "@/theme";
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
  const Container = header ? View : SafeAreaView;

  if (scroll) {
    return (
      <Container style={styles.container}>
        {header}
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={[
              styles.scrollContainer,
              style,
            ]}
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
      </Container>
    );
  }

  return (
    <Container style={styles.container}>
      {header}
      <View
        {...props}
        style={[
          styles.content,
          style,
        ]}
      >
        {children}
      </View>
    </Container>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    flex: 1,
    width: "100%",
  },
  scrollView: {
    flex: 1,
    width: "100%",
  },
  scrollContainer: {
    paddingHorizontal: 20,
    backgroundColor: "#FFFFFF",
    alignSelf: "center",
    maxWidth: Platform.OS === 'web' ? 393 : '100%',
    width: "100%",
  },
  content:{
    flex: 1,
    paddingHorizontal: 20,
    backgroundColor: colors.white,
    alignSelf: "center",
    width: "100%",
    maxWidth: Platform.OS === "web" ? 393 : undefined,
  },
});