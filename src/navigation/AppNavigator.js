import React, { useContext } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { AuthContext } from "../contexts/AuthContext";
import DashboardScreen from "../screens/DashboardScreen";
import TransactionsScreen from "../screens/TransactionsScreen";
import GoalsScreen from "../screens/GoalsScreen";
import ReportsScreen from "../screens/ReportsScreen";
import SettingsScreen from "../screens/SettingsScreen";
import AuthNavigator from "./AuthNavigator";
import { COLORS, SIZES } from "../constants/theme";

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const MainTabs = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      tabBarStyle: styles.tabBar,
      tabBarIcon: ({ focused }) => {
        let iconName;
        let label;

        switch (route.name) {
          case "Dashboard":
            iconName = "dashboard";
            label = "Home";
            break;
          case "Transactions":
            iconName = "account-balance-wallet";
            label = "Wallet";
            break;
          case "Goals":
            iconName = "flag";
            label = "Goals";
            break;
          case "Reports":
            iconName = "bar-chart";
            label = "Analytics";
            break;
          case "Settings":
            iconName = "settings";
            label = "Settings";
            break;
          default:
            iconName = "help";
            label = route.name;
        }

        return (
          <View style={[styles.tabItem, focused && styles.tabItemActive]}>
            <MaterialIcons
              name={iconName}
              size={24}
              color={focused ? COLORS.white : COLORS.textLight}
            />
            <Text style={[styles.label, focused && styles.labelActive]}>
              {label}
            </Text>
          </View>
        );
      },
      tabBarLabel: () => null,
    })}
  >
    <Tab.Screen name="Dashboard" component={DashboardScreen} />
    <Tab.Screen name="Transactions" component={TransactionsScreen} />
    <Tab.Screen name="Goals" component={GoalsScreen} />
    <Tab.Screen name="Reports" component={ReportsScreen} />
    <Tab.Screen name="Settings" component={SettingsScreen} />
  </Tab.Navigator>
);

const AppNavigator = () => {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <Stack.Screen name="Main" component={MainTabs} />
        ) : (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: COLORS.white,
    borderTopWidth: 0,
    borderRadius: SIZES.radius,
    marginHorizontal: SIZES.margin,
    marginBottom: SIZES.margin,
    paddingVertical: SIZES.padding / 2,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  tabItem: {
    alignItems: "center",
    justifyContent: "center",
    padding: SIZES.padding / 2,
    borderRadius: SIZES.radius,
  },
  tabItemActive: {
    backgroundColor: COLORS.primary,
  },
  icon: {
    fontSize: 24,
    color: COLORS.textLight,
  },
  iconActive: {
    color: COLORS.white,
  },
  label: {
    fontSize: SIZES.fontSmall,
    color: COLORS.textLight,
  },
  labelActive: {
    color: COLORS.white,
  },
});

export default AppNavigator;
