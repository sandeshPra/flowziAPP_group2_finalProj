import React, { useState, useContext } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Dimensions,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { ThemeContext } from "../contexts/ThemeContext";
import { AuthContext } from "../contexts/AuthContext";
import CustomButton from "../components/CustomButton";
import { SIZES, FONTS } from "../constants/theme";

const { width } = Dimensions.get("window");

const LoginScreen = ({ navigation }) => {
  const { colors } = useContext(ThemeContext);
  const { login } = useContext(AuthContext);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert("Error", "Please fill in all fields.");
      return;
    }
    if (!isValidEmail(email)) {
      Alert.alert("Error", "Please enter a valid email address.");
      return;
    }

    setLoading(true);
    try {
      const result = await login(email.trim(), password);
      setLoading(false);

      if (!result.success) {
        // Handle specific error cases
        const errorMessage = getLoginErrorMessage(result.error);
        Alert.alert("Login Failed", errorMessage);
      }
    } catch (error) {
      setLoading(false);
      console.error("Login error:", error);
      Alert.alert("Login Failed", "Something went wrong. Please try again.");
    }
  };

  const getLoginErrorMessage = (error) => {
    // Handle different error formats
    let errorString = "";
    let errorCode = "";

    if (typeof error === "string") {
      errorString = error;
    } else if (error?.code) {
      // Firebase error with code property
      errorCode = error.code;
      errorString = error.message || error.toString();
    } else if (error?.message) {
      errorString = error.message;
    } else {
      errorString = error?.toString() || "";
    }

    const lowerError = errorString.toLowerCase();
    const lowerCode = errorCode.toLowerCase();

    // Check Firebase error codes first (most reliable)
    if (
      errorCode === "auth/invalid-credential" ||
      errorCode === "auth/wrong-password" ||
      errorCode === "auth/user-not-found" ||
      lowerCode.includes("invalid-credential") ||
      lowerCode.includes("wrong-password") ||
      lowerCode.includes("user-not-found")
    ) {
      return "Wrong email or password. Please try again.";
    }

    if (
      errorCode === "auth/invalid-email" ||
      lowerCode.includes("invalid-email")
    ) {
      return "Please enter a valid email address.";
    }

    if (
      errorCode === "auth/too-many-requests" ||
      lowerCode.includes("too-many-requests")
    ) {
      return "Too many failed attempts. Please try again later.";
    }

    if (
      errorCode === "auth/network-request-failed" ||
      lowerCode.includes("network")
    ) {
      return "Network error. Please check your internet connection.";
    }

    // Check for specific Firebase error messages in the error string
    if (
      lowerError.includes("auth/invalid-credential") ||
      lowerError.includes("invalid-credential") ||
      lowerError.includes("invalid credential")
    ) {
      return "Wrong email or password. Please try again.";
    }

    if (
      lowerError.includes("user-not-found") ||
      lowerError.includes("user not found") ||
      lowerError.includes("no user record")
    ) {
      return "Wrong email or password. Please try again.";
    }

    if (
      lowerError.includes("wrong-password") ||
      lowerError.includes("password is invalid")
    ) {
      return "Wrong email or password. Please try again.";
    }

    if (
      lowerError.includes("invalid-email") ||
      lowerError.includes("invalid email")
    ) {
      return "Please enter a valid email address.";
    }

    if (
      lowerError.includes("too-many-requests") ||
      lowerError.includes("too many requests")
    ) {
      return "Too many failed attempts. Please try again later.";
    }

    if (lowerError.includes("network") || lowerError.includes("connection")) {
      return "Network error. Please check your internet connection.";
    }

    // If it's already a user-friendly message, return it
    if (lowerError.includes("wrong email or password")) {
      return errorString;
    }

    // Default fallback for unrecognized errors
    return "Wrong email or password. Please try again.";
  };

  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* FLOWZI Branding Header */}
        <View
          style={[
            styles.brandingContainer,
            { backgroundColor: colors.primary },
          ]}
        >
          <View style={styles.brandingContent}>
            <Text style={[styles.flowziTitle, { color: colors.white }]}>
              FLOWZI
            </Text>
            <Text style={[styles.flowziSubtitle, { color: colors.white }]}>
              Smart Finance Made Simple
            </Text>
            <View style={styles.decorativeElements}>
              <View
                style={[
                  styles.decorativeCircle,
                  styles.circle1,
                  { backgroundColor: "rgba(255,255,255,0.2)" },
                ]}
              />
              <View
                style={[
                  styles.decorativeCircle,
                  styles.circle2,
                  { backgroundColor: "rgba(255,255,255,0.1)" },
                ]}
              />
              <View
                style={[
                  styles.decorativeCircle,
                  styles.circle3,
                  { backgroundColor: "rgba(255,255,255,0.15)" },
                ]}
              />
            </View>
          </View>
        </View>

        {/* Welcome Section */}
        <View style={styles.welcomeSection}>
          <Text style={[styles.welcomeTitle, { color: colors.text }]}>
            Welcome Back!
          </Text>
          <Text style={[styles.welcomeSubtitle, { color: colors.textLight }]}>
            Sign in to continue your financial journey with FLOWZI
          </Text>
        </View>

        {/* Login Form */}
        <View
          style={[styles.formCard, { backgroundColor: colors.cardBackground }]}
        >
          <View
            style={[
              styles.inputContainer,
              { borderBottomColor: colors.textLight },
            ]}
          >
            <View
              style={[
                styles.iconContainer,
                { backgroundColor: colors.primary + "20" },
              ]}
            >
              <MaterialIcons name="email" size={20} color={colors.primary} />
            </View>
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="Email Address"
              placeholderTextColor={colors.textLight}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
          </View>

          <View
            style={[
              styles.inputContainer,
              { borderBottomColor: colors.textLight },
            ]}
          >
            <View
              style={[
                styles.iconContainer,
                { backgroundColor: colors.primary + "20" },
              ]}
            >
              <MaterialIcons name="lock" size={20} color={colors.primary} />
            </View>
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="Password"
              placeholderTextColor={colors.textLight}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoComplete="password"
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeIcon}
            >
              <MaterialIcons
                name={showPassword ? "visibility" : "visibility-off"}
                size={22}
                color={colors.textLight}
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.forgotPassword}
            onPress={() => navigation.navigate("ForgotPassword")}
          >
            <Text
              style={[styles.forgotPasswordText, { color: colors.primary }]}
            >
              Forgot Password?
            </Text>
          </TouchableOpacity>

          <CustomButton
            title={loading ? "Signing In..." : "Sign In to FLOWZI"}
            onPress={handleLogin}
            style={[styles.loginButton, { backgroundColor: colors.primary }]}
            textColor={colors.white}
            disabled={loading}
          />

          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.textLight }]}>
                Authenticating...
              </Text>
            </View>
          )}
        </View>

        {/* Sign Up Link */}
        <View style={styles.signupContainer}>
          <Text style={[styles.signupText, { color: colors.textLight }]}>
            New to FLOWZI?{" "}
          </Text>
          <TouchableOpacity onPress={() => navigation.navigate("Register")}>
            <Text style={[styles.signupLink, { color: colors.primary }]}>
              Create Account
            </Text>
          </TouchableOpacity>
        </View>

        {/* Features Preview */}
        <View style={styles.featuresContainer}>
          <Text style={[styles.featuresTitle, { color: colors.textLight }]}>
            Why Choose FLOWZI?
          </Text>
          <View style={styles.featuresList}>
            <View style={styles.featureItem}>
              <MaterialIcons
                name="trending-up"
                size={16}
                color={colors.success}
              />
              <Text style={[styles.featureText, { color: colors.textLight }]}>
                Smart Expense Tracking
              </Text>
            </View>
            <View style={styles.featureItem}>
              <MaterialIcons name="savings" size={16} color={colors.success} />
              <Text style={[styles.featureText, { color: colors.textLight }]}>
                Goal-Based Savings
              </Text>
            </View>
            <View style={styles.featureItem}>
              <MaterialIcons
                name="analytics"
                size={16}
                color={colors.success}
              />
              <Text style={[styles.featureText, { color: colors.textLight }]}>
                Financial Analytics
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  brandingContainer: {
    height: 200,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    overflow: "hidden",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  brandingContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: SIZES.padding,
  },
  flowziTitle: {
    fontSize: 42,
    fontWeight: "bold",
    letterSpacing: 3,
    marginBottom: 8,
  },
  flowziSubtitle: {
    fontSize: 16,
    fontStyle: "italic",
    opacity: 0.9,
  },
  decorativeElements: {
    position: "absolute",
    width: "100%",
    height: "100%",
  },
  decorativeCircle: {
    position: "absolute",
    borderRadius: 50,
  },
  circle1: {
    width: 100,
    height: 100,
    top: -30,
    right: -20,
  },
  circle2: {
    width: 60,
    height: 60,
    bottom: 20,
    left: -10,
  },
  circle3: {
    width: 80,
    height: 80,
    top: 60,
    left: -30,
  },
  welcomeSection: {
    padding: SIZES.padding * 1.5,
    alignItems: "center",
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
  },
  formCard: {
    margin: SIZES.padding,
    borderRadius: 20,
    padding: SIZES.padding * 1.5,
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    paddingVertical: SIZES.padding,
    marginBottom: SIZES.margin * 1.2,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: SIZES.margin,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 4,
  },
  eyeIcon: {
    padding: 8,
  },
  forgotPassword: {
    alignSelf: "flex-end",
    marginBottom: SIZES.margin * 1.5,
    padding: 4,
  },
  forgotPasswordText: {
    fontSize: 14,
    fontWeight: "500",
  },
  loginButton: {
    marginVertical: SIZES.margin,
    borderRadius: 12,
    paddingVertical: SIZES.padding,
  },
  loadingContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: SIZES.margin,
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
  },
  signupContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: SIZES.margin * 1.5,
    paddingHorizontal: SIZES.padding,
  },
  signupText: {
    fontSize: 15,
  },
  signupLink: {
    fontSize: 15,
    fontWeight: "bold",
  },
  featuresContainer: {
    padding: SIZES.padding,
    marginTop: SIZES.margin,
  },
  featuresTitle: {
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: SIZES.margin,
  },
  featuresList: {
    alignItems: "center",
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 4,
  },
  featureText: {
    fontSize: 12,
    marginLeft: 8,
  },
});

export default LoginScreen;
