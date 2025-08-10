import React from "react";
import { LogBox } from "react-native";
import AppNavigator from "./src/navigation/AppNavigator";
import { ThemeProvider } from "./src/contexts/ThemeContext";
import { CurrencyProvider } from "./src/contexts/CurrencyContext";
import { AuthProvider } from "./src/contexts/AuthContext";

if (__DEV__) {
  LogBox.ignoreLogs([
    "Possible unhandled promise rejection",
    "Unable to save asset to directory",
    "ExponentExperienceData",
    "CoreSimulator",
    "Non-serializable values were found in the navigation state",
    "VirtualizedLists should never be nested inside plain ScrollViews",
    'Warning: Each child in a list should have a unique "key" prop',
    "Setting a timer for a long period of time",
    "Constants.deviceId has been deprecated",
  ]);
}

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <CurrencyProvider>
          <AppNavigator />
        </CurrencyProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}
