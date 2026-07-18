import { ReactNode } from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";

interface HStackProps {
  children: ReactNode;
  spacing?: number;
  style?: StyleProp<ViewStyle>;
  align?: "flex-start" | "center" | "flex-end" | "stretch";
  justify?:
    | "flex-start"
    | "center"
    | "flex-end"
    | "space-between"
    | "space-around"
    | "space-evenly";
}

export default function HStack({
  children,
  spacing = 0,
  style,
  align = "center",
  justify = "flex-start",
}: HStackProps) {
  const childArray = Array.isArray(children) ? children : [children];

  return (
    <View
      style={[
        styles.container,
        { alignItems: align, justifyContent: justify },
        style,
      ]}
    >
      {childArray.map((child, index) => (
        <View
          key={index}
          style={{ marginRight: index < childArray.length - 1 ? spacing : 0 }}
        >
          {child}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
  },
  item: {
    justifyContent: "center",
  },
});
