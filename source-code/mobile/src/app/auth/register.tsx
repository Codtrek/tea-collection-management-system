import { useState  } from "react";
import { StyleSheet, View, Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { Link , useRouter} from "expo-router";

import {
  Screen,
  AppText,
  AppInput,
  PasswordInput,
  AppButton,
} from "@/components/ui";

import { colors } from "@/theme/colors";
import { spacing } from "@/theme/spacing";
import { register } from "../services/api/auth.api";

export default function SignUpScreen() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [NIC, setNIC] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  //this function won't be necessary when running on mobile
    async function persistSession(accessToken: string, user: object) {
      const serializedUser = JSON.stringify(user);
      if (Platform.OS === "web") {
        localStorage.setItem("accessToken", accessToken);
        localStorage.setItem("user", serializedUser);
        return;
      }
  
      await SecureStore.setItemAsync("accessToken", accessToken);
      await SecureStore.setItemAsync("user", serializedUser);
    }
  async function handleRegister() {
    // Clear previous error
    setError("");

    if (!phoneNumber || !name || !NIC || !password || !confirmPassword) {
      setError("Please complete all required fields.");
      return;
    }

    if (phoneNumber.length !== 10) {
      setError("Enter a valid phone number.");
      return;
    }

    // NIC validation
    const nicRegex = /^(?:\d{12}|\d{9}[VX])$/;

    if (!nicRegex.test(NIC.trim())) {
      setError("Please enter a valid NIC number.");
      return;
    }

    // Password length
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    // Password confirmation
    if (password !== confirmPassword) {
      setError("Passwords don't match. Try again.");
      return;
    }

    try {
      setLoading(true);

      const result = await register(
        name,
        phoneNumber,
        NIC,
        password,
        confirmPassword
      );

      router.replace("/(estate-owner)/home");

      // TODO:
      // Navigate to login or show success message
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to register."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen scroll style={styles.container}>
      <View style={styles.header}>
        <View style={styles.logoCircle}>
          <AppText variant="heading" style={styles.logoText}>
            🌿
          </AppText>
        </View>

        <AppText variant="heading" style={styles.title}>
          Estate Owner Registration
        </AppText>
      </View>

      <View style={styles.form}>
        <AppInput
          label="Full Name"
          placeholder="Eg: Kasun Perera"
          maxLength={32}
          value={name}
          onChangeText={setName}
        />

        <AppInput
          label="Phone Number"
          placeholder="Eg: 0712345678"
          keyboardType="numeric"
          maxLength={10}
          value={phoneNumber}
          onChangeText={setPhoneNumber}
        />

        <AppInput
          label="NIC number"
          placeholder="Eg: 20XXXXXXXXXX or 123456789V"
          keyboardType="default"
          autoCapitalize="characters"
          maxLength={12}
          value={NIC}
          onChangeText={(text) => setNIC(text.toUpperCase())}
        />

        <PasswordInput
          label="Password"
          placeholder="Create a password"
          value={password}
          onChangeText={setPassword}
        />

        <PasswordInput
          label="Confirm Password"
          placeholder="Confirm your password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
        />

        {error ? (
          <AppText style={styles.error}>
            {error}
          </AppText>
        ) : null}

        <AppButton
          title={loading ? "Registering..." : "Register"}
          onPress={handleRegister}
          disabled={loading}
        />

        <View style={styles.signinContainer}>
          <AppText variant="bodySmall">
            Already have an account?{" "}
          </AppText>

          <Link href="/auth/login">
            <AppText
              variant="bodySmall"
              style={styles.link}
            >
              Sign In
            </AppText>
          </Link>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    alignItems: "center",
    width: "100%",
    maxWidth: Platform.OS === "web" ? 393 : "100%",
    alignSelf: "center",
    backgroundColor: colors.background,
    paddingTop: spacing.xl,
    paddingBottom: 48,
  },

  header: {
    width: "100%",
    alignItems: "center",
    marginBottom: spacing.xl,
  },

  logoCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,

    backgroundColor: colors.surface,

    alignItems: "center",
    justifyContent: "center",

    borderWidth: 2,
    borderColor: colors.primary,

    marginBottom: spacing.md,
  },

  logoText: {
    color: colors.primary,
  },

  title: {
    color: colors.text.primaryGreen,
    marginBottom: spacing.xs,
  },

  form: {
    width: "100%",
  },

  error: {
    color: "red",
    marginBottom: spacing.md,
  },

  signinContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",

    marginTop: spacing.lg,
  },

  link: {
    color: colors.primary,
    fontWeight: "600",
  },
});