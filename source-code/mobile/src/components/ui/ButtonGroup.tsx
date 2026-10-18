import { View, StyleSheet } from "react-native";

interface ButtonGroupProps {
  children: React.ReactNode;
}

export default function ButtonGroup({
  children,
}: ButtonGroupProps) {
  return (
    <View style={styles.container}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    gap: 12,
  },
});