import React, { createContext, useState, useEffect, useContext } from "react";
import { Appearance } from "react-native";
import { db } from "../services/firebaseConfig";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { AuthContext } from "./AuthContext";

export const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const { user } = useContext(AuthContext);
  const [theme, setTheme] = useState("light");

  useEffect(() => {
    if (!user) {
      setTheme("light");
      return () => {}; // No unsubscribe needed
    }

    const userId = user.uid;
    const unsubscribe = onSnapshot(
      doc(db, "users", userId),
      (userDocSnap) => {
        // Renamed from doc to userDocSnap
        try {
          if (userDocSnap.exists()) {
            const data = userDocSnap.data();
            if (data.theme) {
              setTheme(data.theme);
            }
          } else {
            setDoc(doc(db, "users", userId), { theme: "light" }).catch(
              (error) => {
                console.error("Error creating user document:", error);
              }
            );
          }
        } catch (error) {
          console.warn("Theme fetch warning:", error.message);
        }
      },
      (error) => {
        console.warn("Theme snapshot warning:", error.message);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const updateTheme = async (newTheme) => {
    if (!user) return;
    try {
      const userId = user.uid;
      await setDoc(
        doc(db, "users", userId),
        { theme: newTheme },
        { merge: true }
      );
      setTheme(newTheme);
    } catch (error) {
      console.error("Error updating theme:", error);
    }
  };

  // Determine colors based on theme
  const getThemeColors = () => {
    let themeMode = theme;
    if (theme === "system") {
      themeMode = Appearance.getColorScheme() || "light";
    }

    return themeMode === "dark"
      ? {
          background: "#1C2526",
          text: "#FFFFFF",
          textLight: "#B0BEC5",
          cardBackground: "#2C3E50",
          primary: "#4A90E2",
          secondary: "#50C878",
          error: "#FF6B6B",
          success: "#50C878",
        }
      : {
          background: "#F5F7FA",
          text: "#2D3436",
          textLight: "#636E72",
          cardBackground: "#FFFFFF",
          primary: "#4A90E2",
          secondary: "#50C878",
          error: "#FF6B6B",
          success: "#50C878",
        };
  };

  const themeColors = getThemeColors();

  return (
    <ThemeContext.Provider value={{ theme, updateTheme, colors: themeColors }}>
      {children}
    </ThemeContext.Provider>
  );
};
