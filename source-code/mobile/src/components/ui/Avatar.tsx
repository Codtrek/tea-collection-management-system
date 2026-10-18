import { Image, StyleSheet, View } from "react-native";

import AppText from "./AppText";
import { colors } from "@/theme/colors";

interface AvatarProps {
  image?: string;
  name?: string;
  size?: number;
}

export default function Avatar({
  image,
  name = "",
  size = 40,
}: AvatarProps) {
  if (image) {
    return (
      <Image
        source={{ uri: image }}
        style={[
          styles.image,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
          },
        ]}
      />
    );
  }

  const initial = name.length > 0 ? name.charAt(0).toUpperCase() : "?";

  return (
    <View
      style={[
        styles.placeholder,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
        },
      ]}
    >
      <AppText style={styles.text}>{initial}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    resizeMode: "cover",
  },

  placeholder: {
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },

  text: {
    color: colors.white,
    fontWeight: "700",
    fontSize: 16,
  },
});