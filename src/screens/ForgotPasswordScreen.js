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
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { ThemeContext } from "../contexts/ThemeContext";
import { AuthContext } from "../contexts/AuthContext";
import CustomButton from "../components/CustomButton";
import { SIZES, FONTS } from "../constants/theme";

const ForgotPasswordScreen = ({ navigation }) => {
  const { colors } = useContext(ThemeContext);
  const { resetPassword } = useContext(AuthContext);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleResetPassword = async () => {
    if (!email.trim()) {
      Alert.alert("Error", "Please enter your email address.");
      return;
    }
    if (!isValidEmail(email)) {
      Alert.alert("Error", "Please enter a valid email address.");
      return;
    }

    setLoading(true);
    try {
      const result = await resetPassword(email.trim());
      setLoading(false);

      if (result.success) {
        setEmailSent(true);
        Alert.alert(
          "Reset Email Sent",
          "Check your email for password reset instructions.",
          [{ text: "OK" }]
        );
      } else {
        Alert.alert("Error", result.error);
      }
    } catch (error) {
      setLoading(false);
      Alert.alert("Error", "Failed to send reset email. Please try again.");
    }
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
            <MaterialIcons name="lock-reset" size={48} color={colors.white} />
            <Text style={[styles.flowziTitle, { color: colors.white }]}>
              FLOWZI
            </Text>
            <Text style={[styles.flowziSubtitle, { color: colors.white }]}>
              Password Recovery
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
            </View>
          </View>
        </View>

        {/* Main Content */}
        <View style={styles.contentContainer}>
          {!emailSent ? (
            <>
              {/* Instructions */}
              <View style={styles.instructionsSection}>
                <Text style={[styles.title, { color: colors.text }]}>
                  Forgot Password?
                </Text>
                <Text style={[styles.subtitle, { color: colors.textLight }]}>
                  No worries! Enter your email address and we'll send you
                  instructions to reset your password.
                </Text>
              </View>

              {/* Form Card */}
              <View
                style={[
                  styles.formCard,
                  { backgroundColor: colors.cardBackground },
                ]}
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
                    <MaterialIcons
                      name="email"
                      size={20}
                      color={colors.primary}
                    />
                  </View>
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    placeholder="Enter your email address"
                    placeholderTextColor={colors.textLight}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                  />
                </View>

                <CustomButton
                  title={loading ? "Sending..." : "Send Reset Instructions"}
                  onPress={handleResetPassword}
                  style={[
                    styles.resetButton,
                    { backgroundColor: colors.primary },
                  ]}
                  textColor={colors.white}
                  disabled={loading}
                />

                {loading && (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text
                      style={[styles.loadingText, { color: colors.textLight }]}
                    >
                      Sending reset email...
                    </Text>
                  </View>
                )}
              </View>
            </>
          ) : (
            /* Email Sent Confirmation */
            <View
              style={[
                styles.confirmationCard,
                { backgroundColor: colors.cardBackground },
              ]}
            >
              <View
                style={[
                  styles.successIconContainer,
                  { backgroundColor: colors.success + "20" },
                ]}
              >
                <MaterialIcons
                  name="mark-email-read"
                  size={48}
                  color={colors.success}
                />
              </View>
              <Text style={[styles.confirmationTitle, { color: colors.text }]}>
                Check Your Email
              </Text>
              <Text
                style={[styles.confirmationText, { color: colors.textLight }]}
              >
                We've sent password reset instructions to:
              </Text>
              <Text style={[styles.emailText, { color: colors.primary }]}>
                {email}
              </Text>
              <Text
                style={[
                  styles.confirmationSubtext,
                  { color: colors.textLight },
                ]}
              >
                If you don't see the email in your inbox, please check your spam
                folder.
              </Text>

              <CustomButton
                title="Resend Email"
                onPress={handleResetPassword}
                style={[
                  styles.resendButton,
                  { backgroundColor: colors.primary },
                ]}
                textColor={colors.white}
              />
            </View>
          )}

          {/* Back to Login */}
          <View style={styles.backToLoginContainer}>
            <TouchableOpacity
              style={styles.backToLoginButton}
              onPress={() => navigation.navigate("Login")}
            >
              <MaterialIcons
                name="arrow-back"
                size={20}
                color={colors.primary}
              />
              <Text style={[styles.backToLoginText, { color: colors.primary }]}>
                Back to Login
              </Text>
            </TouchableOpacity>
          </View>

          {/* Help Section */}
          <View style={styles.helpSection}>
            <Text style={[styles.helpTitle, { color: colors.textLight }]}>
              Need Help?
            </Text>
            <View style={styles.helpOptions}>
              <TouchableOpacity style={styles.helpOption}>
                <MaterialIcons
                  name="support-agent"
                  size={16}
                  color={colors.primary}
                />
                <Text style={[styles.helpText, { color: colors.textLight }]}>
                  Contact Support
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.helpOption}>
                <MaterialIcons name="help" size={16} color={colors.primary} />
                <Text style={[styles.helpText, { color: colors.textLight }]}>
                  FAQs
                </Text>
              </TouchableOpacity>
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
    height: 160,
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
    fontSize: 32,
    fontWeight: "bold",
    letterSpacing: 2,
    marginTop: 8,
    marginBottom: 4,
  },
  flowziSubtitle: {
    fontSize: 14,
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
    width: 70,
    height: 70,
    top: -20,
    right: -15,
  },
  circle2: {
    width: 50,
    height: 50,
    bottom: 10,
    left: -15,
  },
  contentContainer: {
    flex: 1,
    padding: SIZES.padding,
  },
  instructionsSection: {
    alignItems: "center",
    marginVertical: SIZES.margin * 1.5,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: SIZES.margin,
  },
  subtitle: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: SIZES.padding / 2,
  },
  formCard: {
    borderRadius: 20,
    padding: SIZES.padding * 1.5,
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    marginBottom: SIZES.margin * 2,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    paddingVertical: SIZES.padding,
    marginBottom: SIZES.margin * 1.5,
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
  resetButton: {
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
  confirmationCard: {
    borderRadius: 20,
    padding: SIZES.padding * 2,
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    alignItems: "center",
    marginVertical: SIZES.margin * 2,
  },
  successIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: SIZES.margin,
  },
  confirmationTitle: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: SIZES.margin,
  },
  confirmationText: {
    fontSize: 15,
    textAlign: "center",
    marginBottom: SIZES.margin / 2,
  },
  emailText: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: SIZES.margin,
  },
  confirmationSubtext: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
    marginBottom: SIZES.margin * 1.5,
  },
  resendButton: {
    borderRadius: 12,
    paddingVertical: SIZES.padding * 0.8,
    paddingHorizontal: SIZES.padding * 1.5,
  },
  backToLoginContainer: {
    alignItems: "center",
    marginBottom: SIZES.margin * 2,
  },
  backToLoginButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: SIZES.padding,
  },
  backToLoginText: {
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  helpSection: {
    alignItems: "center",
  },
  helpTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: SIZES.margin,
  },
  helpOptions: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
  },
  helpOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: SIZES.padding / 2,
  },
  helpText: {
    fontSize: 12,
    marginLeft: 6,
  },
});

export default ForgotPasswordScreen;
