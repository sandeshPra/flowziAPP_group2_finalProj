import React, { useContext } from "react";
import { View, Text, StyleSheet } from "react-native";
import { CurrencyContext } from "../contexts/CurrencyContext";
import { SIZES, FONTS } from "../constants/theme"; // Added SIZES import

const TransactionItem = ({
  category,
  amount,
  date,
  note,
  textColor,
  amountColor,
}) => {
  const { formatCurrency } = useContext(CurrencyContext);

  return (
    <View style={styles.container}>
      <View style={styles.details}>
        <Text style={[FONTS.medium, { color: textColor }]}>{category}</Text>
        <Text style={[FONTS.small, { color: textColor }]}>{note}</Text>
        <Text style={[FONTS.small, { color: textColor }]}>{date}</Text>
      </View>
      <Text style={[FONTS.medium, { color: amountColor }]}>
        {amount < 0 ? "-" : "+"}
        {formatCurrency(Math.abs(amount))}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: SIZES.radius,
    padding: SIZES.padding,
    marginVertical: SIZES.margin / 2,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  details: {
    flex: 1,
  },
});

export default TransactionItem;
