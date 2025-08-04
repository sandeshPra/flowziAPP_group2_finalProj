import React, { useState, useEffect, useContext } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Modal,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Dimensions,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { MaterialIcons } from "@expo/vector-icons";
import { ThemeContext } from "../contexts/ThemeContext";
import { CurrencyContext } from "../contexts/CurrencyContext";
import { AuthContext } from "../contexts/AuthContext";
import TransactionItem from "../components/TransactionItem";
import CustomButton from "../components/CustomButton";
import { db } from "../services/firebaseConfig";
import {
  collection,
  addDoc,
  onSnapshot,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { SIZES, FONTS } from "../constants/theme";

const { width, height } = Dimensions.get("window");

const TransactionsScreen = () => {
  const { colors } = useContext(ThemeContext);
  const { formatCurrency, currency } = useContext(CurrencyContext);
  const { user, isLoading } = useContext(AuthContext);

  const [transactions, setTransactions] = useState([]);
  const [bills, setBills] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [billModalVisible, setBillModalVisible] = useState(false);
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [type, setType] = useState("Income");
  const [transactionType, setTransactionType] = useState("Miscellaneous");
  const [billName, setBillName] = useState("");
  const [billAmount, setBillAmount] = useState("");
  const [billDays, setBillDays] = useState("");
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [activeTab, setActiveTab] = useState("All");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!user?.uid) {
      setTransactions([]);
      setBills([]);
      setTotalIncome(0);
      setTotalExpenses(0);
      return;
    }

    let unsubscribeTransactions = null;
    let unsubscribeBills = null;

    try {
      // Setup transactions listener
      unsubscribeTransactions = onSnapshot(
        collection(db, "transactions"),
        (snapshot) => {
          try {
            const transactionList = snapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            }));
            setTransactions(transactionList);

            let income = 0;
            let expenses = 0;
            transactionList.forEach((transaction) => {
              try {
                if (transaction.amount >= 0) {
                  income += transaction.amount;
                } else {
                  expenses += Math.abs(transaction.amount);
                }
              } catch (error) {
                console.error("Error processing transaction:", error);
              }
            });
            setTotalIncome(income);
            setTotalExpenses(expenses);
          } catch (error) {
            console.error("Error processing transactions:", error);
          }
        },
        (error) => {
          console.error("Error fetching transactions:", error);
        }
      );

      // Setup bills listener
      unsubscribeBills = onSnapshot(
        collection(db, "bills"),
        (snapshot) => {
          try {
            const billList = snapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            }));
            setBills(billList);
          } catch (error) {
            console.error("Error processing bills:", error);
          }
        },
        (error) => {
          console.error("Error fetching bills:", error);
        }
      );
    } catch (error) {
      console.error("Error setting up listeners:", error);
    }

    return () => {
      try {
        if (unsubscribeTransactions) unsubscribeTransactions();
        if (unsubscribeBills) unsubscribeBills();
      } catch (error) {
        console.error("Error cleaning up listeners:", error);
      }
    };
  }, [user]);

  if (isLoading) {
    return (
      <View
        style={[
          styles.container,
          styles.centerContent,
          { backgroundColor: colors.background },
        ]}
      >
        <ActivityIndicator size="large" color={colors.primary} />
        <Text
          style={[
            FONTS.medium,
            { color: colors.text, marginTop: SIZES.margin },
          ]}
        >
          Loading your transactions...
        </Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View
        style={[
          styles.container,
          styles.centerContent,
          { backgroundColor: colors.background },
        ]}
      >
        <Text
          style={[FONTS.large, { color: colors.text, textAlign: "center" }]}
        >
          Please log in to view your transactions
        </Text>
      </View>
    );
  }

  const deleteTransaction = async (transactionId) => {
    try {
      await deleteDoc(doc(db, "transactions", transactionId));
      Alert.alert("Success", "Transaction deleted successfully");
    } catch (error) {
      console.error("Error deleting transaction:", error);
      Alert.alert("Error", "Failed to delete transaction. Please try again.");
    }
  };

  const addTransaction = async () => {
    if (!category.trim() || !amount.trim()) {
      Alert.alert(
        "Error",
        "Please fill in all required fields (Category and Amount)."
      );
      return;
    }

    setIsSubmitting(true);
    try {
      let amountValue = parseFloat(amount);
      if (isNaN(amountValue) || amountValue <= 0) {
        Alert.alert("Error", "Amount must be a positive number.");
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
      amountValue = amountValue / rate;

      const adjustedAmount = type === "Income" ? amountValue : -amountValue;
      const newTransaction = {
        category: category.trim(),
        amount: adjustedAmount,
        date: new Date().toISOString().split("T")[0],
        note: note.trim() || "",
        type,
        transactionType:
          type === "Expense" && transactionType === "Side Income"
            ? "Miscellaneous"
            : transactionType,
      };

      await addDoc(collection(db, "transactions"), newTransaction);
      setModalVisible(false);
      resetTransactionModal();
      Alert.alert("Success", "Transaction added successfully!");
    } catch (error) {
      console.error("Error adding transaction:", error);
      Alert.alert("Error", "Failed to add transaction. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const addBill = async () => {
    if (!billName.trim() || !billAmount.trim() || !billDays.trim()) {
      Alert.alert("Error", "Please fill in all required fields.");
      return;
    }

    setIsSubmitting(true);
    try {
      let amountValue = parseFloat(billAmount);
      const daysValue = parseInt(billDays);

      if (isNaN(amountValue) || amountValue <= 0) {
        Alert.alert("Error", "Bill amount must be a positive number.");
        return;
      }
      if (isNaN(daysValue) || daysValue < 0) {
        Alert.alert("Error", "Days until due must be a non-negative number.");
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
      amountValue = amountValue / rate;

      const newBill = {
        name: billName.trim(),
        amount: amountValue,
        days: daysValue,
      };

      await addDoc(collection(db, "bills"), newBill);
      setBillModalVisible(false);
      resetBillModal();
      Alert.alert("Success", "Bill added successfully!");
    } catch (error) {
      console.error("Error adding bill:", error);
      Alert.alert("Error", "Failed to add bill. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteBill = async (billId) => {
    Alert.alert("Delete Bill", "Are you sure you want to delete this bill?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteDoc(doc(db, "bills", billId));
            Alert.alert("Success", "Bill deleted successfully");
          } catch (error) {
            console.error("Error deleting bill:", error);
            Alert.alert("Error", "Failed to delete bill. Please try again.");
          }
        },
      },
    ]);
  };

  const resetTransactionModal = () => {
    setCategory("");
    setAmount("");
    setNote("");
    setType("Income");
    setTransactionType("Miscellaneous");
  };

  const resetBillModal = () => {
    setBillName("");
    setBillAmount("");
    setBillDays("");
  };

  // Filter transactions
  const filteredTransactions = React.useMemo(() => {
    try {
      return transactions.filter((transaction) => {
        const matchesSearch =
          searchQuery === "" ||
          (transaction.category &&
            transaction.category
              .toLowerCase()
              .includes(searchQuery.toLowerCase())) ||
          (transaction.note &&
            transaction.note.toLowerCase().includes(searchQuery.toLowerCase()));

        if (!matchesSearch) return false;

        if (activeTab === "All") return true;
        if (activeTab === "Expenses") {
          return (
            transaction.amount < 0 &&
            transaction.transactionType !== "Regular Expense"
          );
        } else if (activeTab === "Income") {
          return (
            transaction.amount >= 0 &&
            transaction.transactionType !== "Side Income"
          );
        } else if (activeTab === "Regular") {
          return (
            transaction.amount < 0 &&
            transaction.transactionType === "Regular Expense"
          );
        } else if (activeTab === "Side Income") {
          return (
            transaction.amount >= 0 &&
            transaction.transactionType === "Side Income"
          );
        }
        return false;
      });
    } catch (error) {
      console.error("Error filtering transactions:", error);
      return [];
    }
  }, [transactions, searchQuery, activeTab]);

  const userName = user?.firstName || user?.displayName || "User";
  const tabs = ["All", "Income", "Expenses", "Regular", "Side Income"];

  const renderTransaction = ({ item }) => {
    if (!item || !item.id) return null;

    return (
      <View
        style={[
          styles.transactionItem,
          { backgroundColor: colors.cardBackground },
        ]}
      >
        <View style={styles.transactionContent}>
          <TransactionItem
            category={item.category || "Unknown"}
            amount={item.amount || 0}
            date={item.date || new Date().toISOString().split("T")[0]}
            note={item.note || ""}
            textColor={colors.text}
            amountColor={
              (item.amount || 0) >= 0 ? colors.success : colors.error
            }
          />
        </View>
        <TouchableOpacity
          style={[
            styles.deleteButton,
            { backgroundColor: colors.error + "20" },
          ]}
          onPress={() => {
            Alert.alert(
              "Delete Transaction",
              "Are you sure you want to delete this transaction?",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Delete",
                  style: "destructive",
                  onPress: () => deleteTransaction(item.id),
                },
              ]
            );
          }}
        >
          <MaterialIcons name="delete" size={16} color={colors.error} />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <Text style={[styles.headerTitle, { color: colors.white }]}>
          FLOWZI WALLET
        </Text>
        <Text style={[styles.headerSubtitle, { color: colors.white }]}>
          {userName}'s Transactions
        </Text>
      </View>

      {/* Search Bar */}
      <View
        style={[
          styles.searchContainer,
          { backgroundColor: colors.cardBackground },
        ]}
      >
        <MaterialIcons name="search" size={20} color={colors.primary} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search transactions..."
          placeholderTextColor={colors.textLight}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery !== "" && (
          <TouchableOpacity onPress={() => setSearchQuery("")}>
            <MaterialIcons name="clear" size={20} color={colors.textLight} />
          </TouchableOpacity>
        )}
      </View>

      {/* Summary Cards */}
      <View style={styles.summaryContainer}>
        <View
          style={[
            styles.summaryCard,
            { backgroundColor: colors.cardBackground },
          ]}
        >
          <Text style={[styles.summaryLabel, { color: colors.textLight }]}>
            Income
          </Text>
          <Text style={[styles.summaryAmount, { color: colors.success }]}>
            {formatCurrency(totalIncome)}
          </Text>
        </View>
        <View
          style={[
            styles.summaryCard,
            { backgroundColor: colors.cardBackground },
          ]}
        >
          <Text style={[styles.summaryLabel, { color: colors.textLight }]}>
            Expenses
          </Text>
          <Text style={[styles.summaryAmount, { color: colors.error }]}>
            {formatCurrency(totalExpenses)}
          </Text>
        </View>
      </View>

      {/* Balance */}
      <View
        style={[styles.balanceCard, { backgroundColor: colors.cardBackground }]}
      >
        <Text style={[styles.balanceLabel, { color: colors.text }]}>
          Net Balance
        </Text>
        <Text
          style={[
            styles.balanceAmount,
            {
              color:
                totalIncome - totalExpenses >= 0
                  ? colors.success
                  : colors.error,
            },
          ]}
        >
          {formatCurrency(totalIncome - totalExpenses)}
        </Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[
                styles.tab,
                {
                  backgroundColor:
                    activeTab === tab ? colors.primary : colors.cardBackground,
                  borderColor: colors.primary,
                },
              ]}
              onPress={() => setActiveTab(tab)}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: activeTab === tab ? colors.white : colors.text },
                ]}
              >
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.primary }]}
          onPress={() => setModalVisible(true)}
        >
          <MaterialIcons name="add" size={20} color={colors.white} />
          <Text style={[styles.actionButtonText, { color: colors.white }]}>
            Add Transaction
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.secondary }]}
          onPress={() => setBillModalVisible(true)}
        >
          <MaterialIcons name="receipt" size={20} color={colors.white} />
          <Text style={[styles.actionButtonText, { color: colors.white }]}>
            Add Bill
          </Text>
        </TouchableOpacity>
      </View>

      {/* Transactions List */}
      <View style={styles.listContainer}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {activeTab} Transactions ({filteredTransactions.length})
        </Text>

        {filteredTransactions.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: colors.textLight }]}>
              {searchQuery ? "No matching transactions" : "No transactions yet"}
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredTransactions}
            renderItem={renderTransaction}
            keyExtractor={(item, index) => item?.id || `transaction-${index}`}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
          />
        )}
      </View>

      {/* Transaction Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView
          style={styles.modalContainer}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View
            style={[
              styles.modalContent,
              { backgroundColor: colors.cardBackground },
            ]}
          >
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  Add Transaction
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setModalVisible(false);
                    resetTransactionModal();
                  }}
                >
                  <MaterialIcons
                    name="close"
                    size={24}
                    color={colors.textLight}
                  />
                </TouchableOpacity>
              </View>

              <TextInput
                style={[
                  styles.input,
                  { borderColor: colors.textLight, color: colors.text },
                ]}
                placeholder="Category (e.g., Food, Transport)"
                placeholderTextColor={colors.textLight}
                value={category}
                onChangeText={setCategory}
              />

              <TextInput
                style={[
                  styles.input,
                  { borderColor: colors.textLight, color: colors.text },
                ]}
                placeholder="Amount"
                placeholderTextColor={colors.textLight}
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
              />

              <View style={styles.pickerContainer}>
                <Text style={[styles.pickerLabel, { color: colors.text }]}>
                  Type
                </Text>
                <View
                  style={[
                    styles.pickerWrapper,
                    { borderColor: colors.textLight },
                  ]}
                >
                  <Picker
                    selectedValue={type}
                    onValueChange={(value) => {
                      setType(value);
                      if (
                        value === "Expense" &&
                        transactionType === "Side Income"
                      ) {
                        setTransactionType("Miscellaneous");
                      } else if (
                        value === "Income" &&
                        transactionType === "Regular Expense"
                      ) {
                        setTransactionType("Miscellaneous");
                      }
                    }}
                    style={{ color: colors.text }}
                  >
                    <Picker.Item label="Income" value="Income" />
                    <Picker.Item label="Expense" value="Expense" />
                  </Picker>
                </View>
              </View>

              <View style={styles.pickerContainer}>
                <Text style={[styles.pickerLabel, { color: colors.text }]}>
                  Category
                </Text>
                <View
                  style={[
                    styles.pickerWrapper,
                    { borderColor: colors.textLight },
                  ]}
                >
                  <Picker
                    selectedValue={transactionType}
                    onValueChange={setTransactionType}
                    style={{ color: colors.text }}
                  >
                    <Picker.Item label="Miscellaneous" value="Miscellaneous" />
                    {type === "Expense" && (
                      <Picker.Item
                        label="Regular Expense"
                        value="Regular Expense"
                      />
                    )}
                    {type === "Income" && (
                      <Picker.Item label="Side Income" value="Side Income" />
                    )}
                  </Picker>
                </View>
              </View>

              <TextInput
                style={[
                  styles.input,
                  { borderColor: colors.textLight, color: colors.text },
                ]}
                placeholder="Note (optional)"
                placeholderTextColor={colors.textLight}
                value={note}
                onChangeText={setNote}
                multiline
              />
            </ScrollView>

            <View style={styles.modalButtons}>
              <CustomButton
                title="Cancel"
                onPress={() => {
                  setModalVisible(false);
                  resetTransactionModal();
                }}
                style={[
                  styles.modalButton,
                  { backgroundColor: colors.textLight },
                ]}
                textColor={colors.text}
              />
              <CustomButton
                title={isSubmitting ? "Adding..." : "Add Transaction"}
                onPress={addTransaction}
                disabled={isSubmitting}
                style={[
                  styles.modalButton,
                  { backgroundColor: colors.primary },
                ]}
                textColor={colors.white}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Bill Modal */}
      <Modal visible={billModalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView
          style={styles.modalContainer}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View
            style={[
              styles.modalContent,
              { backgroundColor: colors.cardBackground },
            ]}
          >
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  Add Bill
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setBillModalVisible(false);
                    resetBillModal();
                  }}
                >
                  <MaterialIcons
                    name="close"
                    size={24}
                    color={colors.textLight}
                  />
                </TouchableOpacity>
              </View>

              <TextInput
                style={[
                  styles.input,
                  { borderColor: colors.textLight, color: colors.text },
                ]}
                placeholder="Bill Name (e.g., Hydro One)"
                placeholderTextColor={colors.textLight}
                value={billName}
                onChangeText={setBillName}
              />

              <TextInput
                style={[
                  styles.input,
                  { borderColor: colors.textLight, color: colors.text },
                ]}
                placeholder="Amount"
                placeholderTextColor={colors.textLight}
                value={billAmount}
                onChangeText={setBillAmount}
                keyboardType="numeric"
              />

              <TextInput
                style={[
                  styles.input,
                  { borderColor: colors.textLight, color: colors.text },
                ]}
                placeholder="Days Until Due"
                placeholderTextColor={colors.textLight}
                value={billDays}
                onChangeText={setBillDays}
                keyboardType="numeric"
              />
            </ScrollView>

            <View style={styles.modalButtons}>
              <CustomButton
                title="Cancel"
                onPress={() => {
                  setBillModalVisible(false);
                  resetBillModal();
                }}
                style={[
                  styles.modalButton,
                  { backgroundColor: colors.textLight },
                ]}
                textColor={colors.text}
              />
              <CustomButton
                title={isSubmitting ? "Adding..." : "Add Bill"}
                onPress={addBill}
                disabled={isSubmitting}
                style={[
                  styles.modalButton,
                  { backgroundColor: colors.secondary },
                ]}
                textColor={colors.white}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContent: {
    justifyContent: "center",
    alignItems: "center",
    padding: SIZES.padding,
  },
  header: {
    paddingTop: 50,
    paddingBottom: SIZES.padding,
    paddingHorizontal: SIZES.padding,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    marginBottom: SIZES.margin,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    textAlign: "center",
    opacity: 0.9,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    margin: SIZES.padding,
    padding: SIZES.padding,
    borderRadius: 12,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
  },
  summaryContainer: {
    flexDirection: "row",
    paddingHorizontal: SIZES.padding,
    marginBottom: SIZES.margin,
  },
  summaryCard: {
    flex: 1,
    padding: SIZES.padding,
    borderRadius: 12,
    marginHorizontal: 4,
    elevation: 2,
    alignItems: "center",
  },
  summaryLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  summaryAmount: {
    fontSize: 16,
    fontWeight: "600",
  },
  balanceCard: {
    margin: SIZES.padding,
    padding: SIZES.padding * 1.5,
    borderRadius: 15,
    alignItems: "center",
    elevation: 3,
  },
  balanceLabel: {
    fontSize: 16,
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 24,
    fontWeight: "bold",
  },
  tabsContainer: {
    paddingHorizontal: SIZES.padding,
    marginBottom: SIZES.margin,
  },
  tab: {
    paddingHorizontal: SIZES.padding,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "500",
  },
  actionButtons: {
    flexDirection: "row",
    paddingHorizontal: SIZES.padding,
    marginBottom: SIZES.margin,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    padding: SIZES.padding,
    borderRadius: 12,
    marginHorizontal: 4,
    elevation: 3,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 6,
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: SIZES.padding,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: SIZES.margin,
  },
  listContent: {
    paddingBottom: SIZES.padding,
  },
  transactionItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: SIZES.padding,
    borderRadius: 12,
    marginBottom: 8,
    elevation: 2,
  },
  transactionContent: {
    flex: 1,
  },
  deleteButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: SIZES.padding * 2,
  },
  emptyText: {
    fontSize: 16,
    textAlign: "center",
  },
  modalContainer: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: height * 0.8,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: SIZES.padding,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "600",
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: SIZES.padding,
    margin: SIZES.padding,
    fontSize: 16,
  },
  pickerContainer: {
    margin: SIZES.padding,
  },
  pickerLabel: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 8,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderRadius: 12,
  },
  modalButtons: {
    flexDirection: "row",
    padding: SIZES.padding,
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
  },
  modalButton: {
    flex: 1,
    marginHorizontal: 4,
    borderRadius: 12,
  },
});

export default TransactionsScreen;
