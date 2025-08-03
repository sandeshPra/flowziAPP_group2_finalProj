import React, { createContext, useState, useEffect, useContext } from "react";
import { db } from "../services/firebaseConfig";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { AuthContext } from "./AuthContext";

export const CurrencyContext = createContext();

export const CurrencyProvider = ({ children }) => {
  const { user } = useContext(AuthContext);
  const [currency, setCurrency] = useState("USD");
  const [showCents, setShowCents] = useState(true);
  const [symbolPosition, setSymbolPosition] = useState("before");

  // Static exchange rates relative to USD
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

  // Currency symbols map
  const currencySymbols = {
    USD: "$",
    EUR: "€",
    GBP: "£",
    CAD: "C$",
    INR: "₹",
    AUD: "A$",
    JPY: "¥",
    CNY: "¥",
  };

  useEffect(() => {
    if (!user) {
      setCurrency("USD");
      setShowCents(true);
      setSymbolPosition("before");
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
            if (data.currency) setCurrency(data.currency);
            if (data.showCents !== undefined) setShowCents(data.showCents);
            if (data.symbolPosition) setSymbolPosition(data.symbolPosition);
          } else {
            setDoc(doc(db, "users", userId), {
              currency: "USD",
              showCents: true,
              symbolPosition: "before",
            }).catch((error) => {
              console.error("Error creating user document:", error);
            });
          }
        } catch (error) {
          console.warn("Currency fetch warning:", error.message);
        }
      },
      (error) => {
        console.warn("Currency snapshot warning:", error.message);
      }
    );

    // Cleanup on unmount or user change
    return () => unsubscribe();
  }, [user]);

  const updateCurrencyPreferences = async (
    newCurrency,
    newShowCents,
    newSymbolPosition
  ) => {
    if (!user) return;
    try {
      const userId = user.uid;
      await setDoc(
        doc(db, "users", userId),
        {
          currency: newCurrency,
          showCents: newShowCents,
          symbolPosition: newSymbolPosition,
        },
        { merge: true }
      );
      setCurrency(newCurrency);
      setShowCents(newShowCents);
      setSymbolPosition(newSymbolPosition);
    } catch (error) {
      console.error("Error updating currency preferences:", error);
    }
  };

  // Convert amount from USD to the selected currency
  const convertAmount = (amount) => {
    const rate = exchangeRates[currency] || 1;
    return amount * rate;
  };

  const formatCurrency = (amount) => {
    const convertedAmount = convertAmount(amount);
    const symbol = currencySymbols[currency] || "$";
    const formattedAmount = showCents
      ? convertedAmount.toFixed(2)
      : Math.floor(convertedAmount).toString();
    return symbolPosition === "before"
      ? `${symbol}${formattedAmount}`
      : `${formattedAmount}${symbol}`;
  };

  return (
    <CurrencyContext.Provider
      value={{
        currency,
        showCents,
        symbolPosition,
        updateCurrencyPreferences,
        formatCurrency,
        convertAmount,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
};
