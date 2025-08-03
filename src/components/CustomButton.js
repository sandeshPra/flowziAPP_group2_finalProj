import React from "react";
import { TouchableOpacity, Text, StyleSheet } from "react-native";
import { SIZES, FONTS } from "../constants/theme";

const CustomButton = ({
  title,
  onPress,
  style,
  textColor,
  backgroundColor,
}) => {
  return (
    <TouchableOpacity
      style={[styles.button, style, backgroundColor && { backgroundColor }]}
      onPress={onPress}
    >
      <Text
        style={[
          FONTS.medium,
          styles.buttonText,
          textColor && { color: textColor },
        ]}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    padding: SIZES.padding,
    borderRadius: SIZES.radius,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    textAlign: "center",
  },
});

export default CustomButton;
