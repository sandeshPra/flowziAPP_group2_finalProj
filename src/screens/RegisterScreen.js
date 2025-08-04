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

const RegisterScreen = ({ navigation }) => {
  const { colors } = useContext(ThemeContext);
  const { register } = useContext(AuthContext);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (
      !firstName.trim() ||
      !lastName.trim() ||
      !email.trim() ||
      !password ||
      !confirmPassword
    ) {
      Alert.alert("Error", "Please fill in all fields.");
      return;
    }
    if (!isValidEmail(email)) {
      Alert.alert("Error", "Please enter a valid email address.");
      return;
    }
    if (password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const result = await register(
        email.trim(),
        password,
        firstName.trim(),
        lastName.trim()
      );
      setLoading(false);

      if (!result.success) {
        // Handle specific error cases
        const errorMessage = getRegistrationErrorMessage(result.error);
        Alert.alert("Registration Failed", errorMessage);
      } else {
        Alert.alert(
          "Success",
          "Account created successfully! Welcome to FLOWZI!"
        );
      }
    } catch (error) {
      setLoading(false);
      console.error("Registration error:", error);
      Alert.alert(
        "Registration Failed",
        "Something went wrong. Please try again."
      );
    }
  };

  const getRegistrationErrorMessage = (error) => {
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
      errorCode === "auth/email-already-in-use" ||
      lowerCode.includes("email-already-in-use")
    ) {
      return "This email is already in use. Please try with a different email or sign in instead.";
    }

    if (
      errorCode === "auth/weak-password" ||
      lowerCode.includes("weak-password")
    ) {
      return "Password is too weak. Please use at least 6 characters with a mix of letters and numbers.";
    }

    if (
      errorCode === "auth/invalid-email" ||
      lowerCode.includes("invalid-email")
    ) {
      return "Please enter a valid email address.";
    }

    if (
      errorCode === "auth/operation-not-allowed" ||
      lowerCode.includes("operation-not-allowed")
    ) {
      return "Account creation is currently disabled. Please try again later.";
    }

    if (
      errorCode === "auth/too-many-requests" ||
      lowerCode.includes("too-many-requests")
    ) {
      return "Too many attempts. Please wait a moment and try again.";
    }

    if (
      errorCode === "auth/network-request-failed" ||
      lowerCode.includes("network")
    ) {
      return "Network error. Please check your internet connection and try again.";
    }

    // Check for specific Firebase error messages in the error string
    if (
      lowerError.includes("auth/email-already-in-use") ||
      lowerError.includes("email-already-in-use") ||
      lowerError.includes("email already in use") ||
      lowerError.includes("email address is already in use")
    ) {
      return "This email is already in use. Please try with a different email or sign in instead.";
    }

    if (
      lowerError.includes("auth/weak-password") ||
      lowerError.includes("weak-password") ||
      lowerError.includes("password should be at least")
    ) {
      return "Password is too weak. Please use at least 6 characters with a mix of letters and numbers.";
    }

    if (
      lowerError.includes("auth/invalid-email") ||
      lowerError.includes("invalid-email") ||
      lowerError.includes("invalid email")
    ) {
      return "Please enter a valid email address.";
    }

    if (
      lowerError.includes("auth/operation-not-allowed") ||
      lowerError.includes("operation-not-allowed") ||
      lowerError.includes("operation not allowed")
    ) {
      return "Account creation is currently disabled. Please try again later.";
    }

    if (lowerError.includes("network") || lowerError.includes("connection")) {
      return "Network error. Please check your internet connection and try again.";
    }

    if (
      lowerError.includes("too-many-requests") ||
      lowerError.includes("too many requests")
    ) {
      return "Too many attempts. Please wait a moment and try again.";
    }

    // If it's already a user-friendly message, return it
    if (
      lowerError.includes("email is already in use") ||
      lowerError.includes("already in use")
    ) {
      return errorString;
    }

    // Default fallback for unrecognized errors
    return "Failed to create account. Please check your information and try again.";
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
              Join FLOWZI
            </Text>
            <Text style={[styles.flowziSubtitle, { color: colors.white }]}>
              Start Your Financial Success Story
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
            Create Account
          </Text>
          <Text style={[styles.welcomeSubtitle, { color: colors.textLight }]}>
            Join thousands of users managing their finances smartly with FLOWZI
          </Text>
        </View>

        {/* Registration Form */}
        <View
          style={[styles.formCard, { backgroundColor: colors.cardBackground }]}
        >
          {/* First Name */}
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
              <MaterialIcons name="person" size={20} color={colors.primary} />
            </View>
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="First Name"
              placeholderTextColor={colors.textLight}
              value={firstName}
              onChangeText={setFirstName}
              autoCapitalize="words"
              autoComplete="given-name"
            />
          </View>

          {/* Last Name */}
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
              <MaterialIcons
                name="person-outline"
                size={20}
                color={colors.primary}
              />
            </View>
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="Last Name"
              placeholderTextColor={colors.textLight}
              value={lastName}
              onChangeText={setLastName}
              autoCapitalize="words"
              autoComplete="family-name"
            />
          </View>

          {/* Email */}
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

          {/* Password */}
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
              placeholder="Password (min. 6 characters)"
              placeholderTextColor={colors.textLight}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoComplete="new-password"
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

          {/* Confirm Password */}
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
              <MaterialIcons
                name="lock-outline"
                size={20}
                color={colors.primary}
              />
            </View>
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="Confirm Password"
              placeholderTextColor={colors.textLight}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirmPassword}
              autoComplete="new-password"
            />
            <TouchableOpacity
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              style={styles.eyeIcon}
            >
              <MaterialIcons
                name={showConfirmPassword ? "visibility" : "visibility-off"}
                size={22}
                color={colors.textLight}
              />
            </TouchableOpacity>
          </View>

          {/* Terms and Conditions */}
          <View style={styles.termsContainer}>
            <Text style={[styles.termsText, { color: colors.textLight }]}>
              By creating an account, you agree to FLOWZI's{" "}
            </Text>
            <TouchableOpacity>
              <Text style={[styles.termsLink, { color: colors.primary }]}>
                Terms & Conditions
              </Text>
            </TouchableOpacity>
            <Text style={[styles.termsText, { color: colors.textLight }]}>
              {" "}
              and{" "}
            </Text>
            <TouchableOpacity>
              <Text style={[styles.termsLink, { color: colors.primary }]}>
                Privacy Policy
              </Text>
            </TouchableOpacity>
          </View>

          <CustomButton
            title={loading ? "Creating Account..." : "Join FLOWZI"}
            onPress={handleRegister}
            style={[styles.registerButton, { backgroundColor: colors.primary }]}
            textColor={colors.white}
            disabled={loading}
          />

          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.textLight }]}>
                Setting up your account...
              </Text>
            </View>
          )}
        </View>

        {/* Sign In Link */}
        <View style={styles.signinContainer}>
          <Text style={[styles.signinText, { color: colors.textLight }]}>
            Already have an account?{" "}
          </Text>
          <TouchableOpacity onPress={() => navigation.navigate("Login")}>
            <Text style={[styles.signinLink, { color: colors.primary }]}>
              Sign In
            </Text>
          </TouchableOpacity>
        </View>

        {/* Benefits Section */}
        <View style={styles.benefitsContainer}>
          <Text style={[styles.benefitsTitle, { color: colors.textLight }]}>
            What You'll Get With FLOWZI
          </Text>
          <View style={styles.benefitsList}>
            <View style={styles.benefitItem}>
              <MaterialIcons name="verified" size={18} color={colors.success} />
              <Text style={[styles.benefitText, { color: colors.textLight }]}>
                Secure & Private Data Protection
              </Text>
            </View>
            <View style={styles.benefitItem}>
              <MaterialIcons name="insights" size={18} color={colors.success} />
              <Text style={[styles.benefitText, { color: colors.textLight }]}>
                Personalized Financial Insights
              </Text>
            </View>
            <View style={styles.benefitItem}>
              <MaterialIcons
                name="track-changes"
                size={18}
                color={colors.success}
              />
              <Text style={[styles.benefitText, { color: colors.textLight }]}>
                Real-time Expense Monitoring
              </Text>
            </View>
            <View style={styles.benefitItem}>
              <MaterialIcons name="support" size={18} color={colors.success} />
              <Text style={[styles.benefitText, { color: colors.textLight }]}>
                24/7 Customer Support
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
    height: 180,
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
    fontSize: 36,
    fontWeight: "bold",
    letterSpacing: 2,
    marginBottom: 8,
  },
  flowziSubtitle: {
    fontSize: 16,
    fontStyle: "italic",
    opacity: 0.9,
    textAlign: "center",
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
    width: 80,
    height: 80,
    top: -20,
    right: -15,
  },
  circle2: {
    width: 50,
    height: 50,
    bottom: 15,
    left: -10,
  },
  circle3: {
    width: 65,
    height: 65,
    top: 40,
    left: -25,
  },
  welcomeSection: {
    padding: SIZES.padding * 1.2,
    alignItems: "center",
  },
  welcomeTitle: {
    fontSize: 26,
    fontWeight: "bold",
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
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
    paddingVertical: SIZES.padding * 0.8,
    marginBottom: SIZES.margin,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginRight: SIZES.margin,
  },
  input: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 4,
  },
  eyeIcon: {
    padding: 8,
  },
  termsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "center",
    marginVertical: SIZES.margin,
    paddingHorizontal: SIZES.padding / 2,
  },
  termsText: {
    fontSize: 12,
    textAlign: "center",
  },
  termsLink: {
    fontSize: 12,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
  registerButton: {
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
  signinContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: SIZES.margin,
    paddingHorizontal: SIZES.padding,
  },
  signinText: {
    fontSize: 15,
  },
  signinLink: {
    fontSize: 15,
    fontWeight: "bold",
  },
  benefitsContainer: {
    padding: SIZES.padding,
    marginTop: SIZES.margin / 2,
  },
  benefitsTitle: {
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: SIZES.margin,
  },
  benefitsList: {
    alignItems: "flex-start",
  },
  benefitItem: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 6,
    paddingHorizontal: SIZES.padding / 2,
  },
  benefitText: {
    fontSize: 13,
    marginLeft: 10,
    flex: 1,
  },
});

export default RegisterScreen;
