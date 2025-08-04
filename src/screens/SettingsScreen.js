import React, { useState, useEffect, useContext } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { ThemeContext } from "../contexts/ThemeContext";
import { CurrencyContext } from "../contexts/CurrencyContext";
import { AuthContext } from "../contexts/AuthContext";
import CustomButton from "../components/CustomButton";
import { db } from "../services/firebaseConfig";
import {
  doc,
  setDoc,
  onSnapshot,
  collection,
  query,
  getDocs,
  deleteDoc,
  writeBatch,
} from "firebase/firestore";
import { SIZES, FONTS } from "../constants/theme";

const SettingsScreen = () => {
  const { theme, updateTheme, colors } = useContext(ThemeContext);
  const {
    currency,
    showCents,
    symbolPosition,
    updateCurrencyPreferences,
    convertAmount,
  } = useContext(CurrencyContext);
  const { user, logout } = useContext(AuthContext);
  const [selectedCurrency, setSelectedCurrency] = useState(currency);
  const [isShowCents, setIsShowCents] = useState(showCents);
  const [isSymbolBefore, setIsSymbolBefore] = useState(
    symbolPosition === "before"
  );
  const [incomeAmount, setIncomeAmount] = useState("");
  const [incomeFrequency, setIncomeFrequency] = useState("monthly");
  const [clearing, setClearing] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    if (!user?.uid) return;

    let unsubscribe = null;

    const setupUserListener = async () => {
      try {
        const userId = user.uid;
        unsubscribe = onSnapshot(
          doc(db, "users", userId),
          (userDoc) => {
            try {
              if (userDoc.exists()) {
                const data = userDoc.data();
                if (data.incomeAmount && convertAmount) {
                  const displayAmount = convertAmount(data.incomeAmount);
                  setIncomeAmount(displayAmount.toString());
                }
                if (data.incomeFrequency) {
                  setIncomeFrequency(data.incomeFrequency);
                }
              }
            } catch (error) {
              console.error("Settings: Error processing user document:", error);
            }
          },
          (error) => {
            console.error("Settings: Error fetching user settings:", error);
          }
        );
      } catch (error) {
        console.error("Settings: Error setting up user listener:", error);
      }
    };

    setupUserListener().catch((error) => {
      console.error("Settings: Error in setupUserListener:", error);
    });

    return () => {
      if (unsubscribe) {
        try {
          unsubscribe();
        } catch (error) {
          console.error("Settings: Error unsubscribing:", error);
        }
      }
    };
  }, [convertAmount, user]);

  const handleSaveSettings = async () => {
    try {
      // Update currency preferences with error handling
      if (updateCurrencyPreferences) {
        await updateCurrencyPreferences(
          selectedCurrency,
          isShowCents,
          isSymbolBefore ? "before" : "after"
        );
      }

      if (incomeAmount && user?.uid) {
        const userId = user.uid;
        let monthlyIncome = parseFloat(incomeAmount);

        if (isNaN(monthlyIncome)) {
          Alert.alert("Error", "Please enter a valid income amount");
          return;
        }

        const exchangeRates = {
          USD: 1,
          EUR: 0.92,
          GBP: 0.76,
          CAD: 1.34,
          INR: 83.5,
          AUD: 1.47,
          JPY: 149.2,
          CNY: 7.09,
        };

        const rate = exchangeRates[currency] || 1;
        monthlyIncome = monthlyIncome / rate;

        if (incomeFrequency === "weekly") {
          monthlyIncome = monthlyIncome * 4;
        } else if (incomeFrequency === "yearly") {
          monthlyIncome = monthlyIncome / 12;
        }

        console.log(
          "Settings: Writing to Firestore - monthlyIncome (USD):",
          monthlyIncome
        );

        try {
          await setDoc(
            doc(db, "users", userId),
            {
              incomeAmount: parseFloat(incomeAmount),
              incomeFrequency,
              monthlyIncome,
            },
            { merge: true }
          );
          console.log(
            "Settings: Successfully wrote monthlyIncome to Firestore"
          );
        } catch (firestoreError) {
          console.error(
            "Settings: Error writing to Firestore:",
            firestoreError
          );
          Alert.alert(
            "Error",
            "Failed to save income settings. Please try again."
          );
          return;
        }
      }

      Alert.alert("Success", "Settings saved successfully!");
    } catch (error) {
      console.error("Settings: Error in handleSaveSettings:", error);
      Alert.alert("Error", "Failed to save settings. Please try again.");
    }
  };

  const clearAllData = () => {
    Alert.alert(
      "Clear All Data",
      "This will reset all transactions, goals, bills, and income across Home, Wallet, Goals, and Analytics tabs. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Yes",
          onPress: async () => {
            setClearing(true);
            try {
              if (!user?.uid) {
                Alert.alert("Error", "User not authenticated");
                return;
              }

              const userId = user.uid;
              const batch = writeBatch(db);

              try {
                // Batch delete transactions with error handling
                const transactionsQuery = query(collection(db, "transactions"));
                const transactionsSnapshot = await getDocs(transactionsQuery);
                transactionsSnapshot.docs.forEach((docSnap) => {
                  batch.delete(docSnap.ref);
                });

                // Batch delete goals with error handling
                const goalsQuery = query(collection(db, "goals"));
                const goalsSnapshot = await getDocs(goalsQuery);
                goalsSnapshot.docs.forEach((docSnap) => {
                  batch.delete(docSnap.ref);
                });

                // Batch delete bills with error handling
                const billsQuery = query(collection(db, "bills"));
                const billsSnapshot = await getDocs(billsQuery);
                billsSnapshot.docs.forEach((docSnap) => {
                  batch.delete(docSnap.ref);
                });

                // Commit batch deletes
                await batch.commit();
                console.log("Cleared all transactions, goals, and bills");
              } catch (batchError) {
                console.error("Error during batch operations:", batchError);
                throw new Error("Failed to clear data from database");
              }

              try {
                // Reset user settings
                await setDoc(
                  doc(db, "users", userId),
                  {
                    monthlyIncome: 0,
                    incomeAmount: 0,
                    incomeFrequency: "monthly",
                    currency: "USD",
                    showCents: true,
                    symbolPosition: "before",
                  },
                  { merge: true }
                );
                console.log("Reset user settings");
              } catch (resetError) {
                console.error("Error resetting user settings:", resetError);
                throw new Error("Failed to reset user settings");
              }

              try {
                // Reset local state to reflect changes immediately
                setIncomeAmount("");
                setIncomeFrequency("monthly");
                setSelectedCurrency("USD");
                setIsShowCents(true);
                setIsSymbolBefore(true);

                // Update currency preferences to reflect the reset
                if (updateCurrencyPreferences) {
                  await updateCurrencyPreferences("USD", true, "before");
                }
              } catch (stateError) {
                console.error("Error updating local state:", stateError);
                // Don't throw here as data is already cleared from database
              }

              Alert.alert(
                "Success",
                "All data cleared! Your app has been reset to default settings."
              );
            } catch (error) {
              console.error("Error clearing data:", error);
              Alert.alert(
                "Error",
                `Failed to clear data: ${error.message || "Unknown error"}`
              );
            } finally {
              setClearing(false);
            }
          },
        },
      ]
    );
  };

  const handleLogout = async () => {
    Alert.alert("Logout", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Yes",
        onPress: async () => {
          setLoggingOut(true);
          try {
            if (!logout) {
              throw new Error("Logout function not available");
            }

            // Call logout and check the result
            const result = await logout();

            if (result.success) {
              // Logout successful - AuthContext will handle navigation
              console.log("Logout successful");
            } else {
              // Logout failed - show error
              const errorMessage =
                result.error?.message ||
                result.error?.code ||
                "Unknown error occurred";
              console.error("Logout failed:", result.error);
              Alert.alert(
                "Logout Failed",
                `Could not log out: ${errorMessage}`
              );
            }
          } catch (error) {
            // Handle any unexpected errors
            console.error("Unexpected logout error:", error);
            Alert.alert(
              "Error",
              `Logout failed: ${
                error.message || "An unexpected error occurred"
              }`
            );
          } finally {
            setLoggingOut(false);
          }
        },
      },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* FLOWZI Branding Header */}
        <View
          style={[styles.brandingCard, { backgroundColor: colors.primary }]}
        >
          <Text style={[styles.flowziTitle, { color: colors.white }]}>
            FLOWZI
          </Text>
          <Text style={[styles.flowziSubtitle, { color: colors.white }]}>
            Your Smart Finance Companion
          </Text>
          <Text style={[styles.flowziVersion, { color: colors.white }]}>
            Version 1.0.0
          </Text>
        </View>

        <Text style={[FONTS.large, styles.header, { color: colors.text }]}>
          Settings
        </Text>

        {/* Profile Section */}
        {user && (
          <View
            style={[styles.card, { backgroundColor: colors.cardBackground }]}
          >
            <Text style={[FONTS.medium, { color: colors.text }]}>Profile</Text>
            <Text style={[FONTS.small, { color: colors.text }]}>
              Name: {user.firstName || "N/A"} {user.lastName || ""}
            </Text>
            <Text style={[FONTS.small, { color: colors.text }]}>
              Email: {user.email}
            </Text>
          </View>
        )}

        {/* Theme Selection */}
        <View style={[styles.card, { backgroundColor: colors.cardBackground }]}>
          <Text style={[FONTS.medium, { color: colors.text }]}>Theme</Text>
          <Picker
            selectedValue={theme}
            onValueChange={(value) => {
              try {
                if (updateTheme) {
                  updateTheme(value);
                }
              } catch (error) {
                console.error("Error updating theme:", error);
              }
            }}
            style={[styles.picker, { color: colors.text }]}
          >
            <Picker.Item label="Light" value="light" />
            <Picker.Item label="Dark" value="dark" />
            <Picker.Item label="System Default" value="system" />
          </Picker>
        </View>

        {/* Currency Preferences */}
        <View style={[styles.card, { backgroundColor: colors.cardBackground }]}>
          <Text style={[FONTS.medium, { color: colors.text }]}>
            Currency Preferences
          </Text>
          <Text style={[FONTS.small, { color: colors.text }]}>Currency</Text>
          <Picker
            selectedValue={selectedCurrency}
            onValueChange={(value) => setSelectedCurrency(value)}
            style={[styles.picker, { color: colors.text }]}
          >
            <Picker.Item label="US Dollar (USD)" value="USD" />
            <Picker.Item label="Euro (EUR)" value="EUR" />
            <Picker.Item label="British Pound (GBP)" value="GBP" />
            <Picker.Item label="Canadian Dollar (CAD)" value="CAD" />
            <Picker.Item label="Indian Rupee (INR)" value="INR" />
            <Picker.Item label="Australian Dollar (AUD)" value="AUD" />
            <Picker.Item label="Japanese Yen (JPY)" value="JPY" />
            <Picker.Item label="Chinese Yuan (CNY)" value="CNY" />
          </Picker>

          <View style={styles.switchRow}>
            <Text style={[FONTS.small, { color: colors.text }]}>
              Show Cents
            </Text>
            <Switch
              value={isShowCents}
              onValueChange={(value) => setIsShowCents(value)}
              thumbColor={isShowCents ? colors.primary : colors.textLight}
              trackColor={{ false: colors.textLight, true: colors.primary }}
            />
          </View>

          <View style={styles.switchRow}>
            <Text style={[FONTS.small, { color: colors.text }]}>
              Symbol Position (Before/After)
            </Text>
            <Switch
              value={isSymbolBefore}
              onValueChange={(value) => setIsSymbolBefore(value)}
              thumbColor={isSymbolBefore ? colors.primary : colors.textLight}
              trackColor={{ false: colors.textLight, true: colors.primary }}
            />
          </View>
        </View>

        {/* Income Update */}
        <View style={[styles.card, { backgroundColor: colors.cardBackground }]}>
          <Text style={[FONTS.medium, { color: colors.text }]}>Income</Text>
          <TextInput
            style={[
              styles.input,
              { borderColor: colors.textLight, color: colors.text },
            ]}
            placeholder="Income Amount"
            placeholderTextColor={colors.textLight}
            value={incomeAmount}
            onChangeText={setIncomeAmount}
            keyboardType="numeric"
          />
          <Text style={[FONTS.small, { color: colors.text }]}>Frequency</Text>
          <Picker
            selectedValue={incomeFrequency}
            onValueChange={(value) => setIncomeFrequency(value)}
            style={[styles.picker, { color: colors.text }]}
          >
            <Picker.Item label="Monthly" value="monthly" />
            <Picker.Item label="Weekly" value="weekly" />
            <Picker.Item label="Yearly" value="yearly" />
          </Picker>
        </View>

        {/* Save Button */}
        <CustomButton
          title="Save Settings"
          onPress={handleSaveSettings}
          style={styles.button}
          textColor={colors.white}
          backgroundColor={colors.primary}
        />

        {/* Clear All Data Button */}
        <CustomButton
          title="Clear All Data"
          onPress={clearAllData}
          style={[styles.button, { backgroundColor: colors.error }]}
          textColor={colors.white}
        />
        {clearing && (
          <ActivityIndicator
            size="large"
            color={colors.primary}
            style={styles.loader}
          />
        )}

        {/* Logout Button */}
        <CustomButton
          title={loggingOut ? "Logging out..." : "Logout"}
          onPress={handleLogout}
          style={[
            styles.button,
            {
              backgroundColor: colors.error,
              opacity: loggingOut ? 0.7 : 1,
            },
          ]}
          textColor={colors.white}
          disabled={loggingOut}
        />
        {loggingOut && (
          <ActivityIndicator
            size="small"
            color={colors.primary}
            style={styles.loader}
          />
        )}

        {/* FLOWZI Footer */}
        <View
          style={[
            styles.footerCard,
            { backgroundColor: colors.cardBackground },
          ]}
        >
          <Text style={[styles.footerText, { color: colors.textLight }]}>
            Made with ❤️ by FLOWZI Team
          </Text>
          <Text style={[styles.footerText, { color: colors.textLight }]}>
            Simplifying Personal Finance Management
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: SIZES.padding,
    paddingBottom: SIZES.padding * 2,
  },
  brandingCard: {
    borderRadius: SIZES.radius,
    padding: SIZES.padding * 1.5,
    marginBottom: SIZES.margin,
    alignItems: "center",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  flowziTitle: {
    fontSize: 32,
    fontWeight: "bold",
    letterSpacing: 2,
    marginBottom: SIZES.margin / 4,
  },
  flowziSubtitle: {
    fontSize: 16,
    fontStyle: "italic",
    opacity: 0.9,
    marginBottom: SIZES.margin / 4,
  },
  flowziVersion: {
    fontSize: 12,
    opacity: 0.8,
  },
  header: {
    marginBottom: SIZES.margin,
  },
  card: {
    borderRadius: SIZES.radius,
    padding: SIZES.padding,
    marginVertical: SIZES.margin / 2,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  footerCard: {
    borderRadius: SIZES.radius,
    padding: SIZES.padding,
    marginTop: SIZES.margin * 2,
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  footerText: {
    fontSize: 12,
    textAlign: "center",
    marginVertical: 2,
  },
  picker: {
    marginVertical: SIZES.margin / 2,
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: SIZES.margin / 2,
  },
  input: {
    borderWidth: 1,
    borderRadius: SIZES.radius,
    padding: SIZES.padding / 2,
    marginVertical: SIZES.margin / 2,
    fontSize: SIZES.fontMedium,
  },
  button: {
    alignSelf: "center",
    width: "50%",
    marginVertical: SIZES.margin / 2,
  },
  loader: {
    marginVertical: SIZES.margin,
    alignSelf: "center",
  },
});

export default SettingsScreen;
