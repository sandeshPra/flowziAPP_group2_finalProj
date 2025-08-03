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

const { width } = Dimensions.get("window");

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

  // Search functionality
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [selectedTransactions, setSelectedTransactions] = useState(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  useEffect(() => {
    if (!user) {
      setTransactions([]);
      setBills([]);
      setTotalIncome(0);
      setTotalExpenses(0);
      return;
    }

    const unsubscribeTransactions = onSnapshot(
      collection(db, "transactions"),
      (snapshot) => {
        const transactionList = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setTransactions(transactionList);

        let income = 0;
        let expenses = 0;
        transactionList.forEach((transaction) => {
          if (transaction.amount >= 0) {
            income += transaction.amount;
          } else {
            expenses += Math.abs(transaction.amount);
          }
        });
        setTotalIncome(income);
        setTotalExpenses(expenses);
      },
      (error) => {
        console.error("Wallet: Error fetching transactions:", error);
        Alert.alert("Error", "Failed to fetch transactions. Please try again.");
      }
    );

    const unsubscribeBills = onSnapshot(
      collection(db, "bills"),
      (snapshot) => {
        const billList = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setBills(billList);
      },
      (error) => {
        console.error("Wallet: Error fetching bills:", error);
        Alert.alert("Error", "Failed to fetch bills. Please try again.");
      }
    );

    return () => {
      unsubscribeTransactions();
      unsubscribeBills();
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
        accessibilityLabel="Loading transactions screen"
        accessibilityHint="Please wait while we load your transaction data"
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
        accessibilityLabel="Authentication required"
        accessibilityHint="Please log in to access your transactions"
      >
        <Text
          style={[FONTS.large, { color: colors.text, textAlign: "center" }]}
        >
          Please log in to view your transactions
        </Text>
      </View>
    );
  }

  // Delete transaction function
  const deleteTransaction = async (transactionId) => {
    try {
      await deleteDoc(doc(db, "transactions", transactionId));
      Alert.alert("Success", "Transaction deleted successfully");
    } catch (error) {
      console.error("Error deleting transaction:", error);
      Alert.alert("Error", "Failed to delete transaction. Please try again.");
    }
  };

  // Delete selected transactions
  const deleteSelectedTransactions = async () => {
    if (selectedTransactions.size === 0) {
      Alert.alert("No Selection", "Please select transactions to delete");
      return;
    }

    Alert.alert(
      "Delete Transactions",
      `Are you sure you want to delete ${selectedTransactions.size} transaction(s)?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const deletePromises = Array.from(selectedTransactions).map(
                (id) => deleteDoc(doc(db, "transactions", id))
              );
              await Promise.all(deletePromises);
              setSelectedTransactions(new Set());
              setIsSelectionMode(false);
              Alert.alert(
                "Success",
                "Selected transactions deleted successfully"
              );
            } catch (error) {
              console.error("Error deleting transactions:", error);
              Alert.alert("Error", "Failed to delete some transactions");
            }
          },
        },
      ]
    );
  };

  // Toggle transaction selection
  const toggleTransactionSelection = (transactionId) => {
    const newSelection = new Set(selectedTransactions);
    if (newSelection.has(transactionId)) {
      newSelection.delete(transactionId);
    } else {
      newSelection.add(transactionId);
    }
    setSelectedTransactions(newSelection);
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedTransactions(new Set());
    setIsSelectionMode(false);
  };

  const addTransaction = async () => {
    if (!category || !amount) {
      Alert.alert(
        "Error",
        "Please fill in all required fields (Category and Amount)."
      );
      return;
    }

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
        category,
        amount: adjustedAmount,
        date: new Date().toISOString().split("T")[0],
        note: note || "",
        type,
        transactionType:
          type === "Expense" && transactionType === "Side Income"
            ? "Miscellaneous"
            : transactionType,
      };
      await addDoc(collection(db, "transactions"), newTransaction);
      setModalVisible(false);
      resetTransactionModal();
    } catch (error) {
      console.error("Wallet: Error adding transaction:", error);
      Alert.alert("Error", "Failed to add transaction. Please try again.");
    }
  };

  const addBill = async () => {
    if (!billName || !billAmount || !billDays) {
      Alert.alert(
        "Error",
        "Please fill in all required fields (Bill Name, Amount, and Days)."
      );
      return;
    }

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
        name: billName,
        amount: amountValue,
        days: daysValue,
      };
      await addDoc(collection(db, "bills"), newBill);
      setBillModalVisible(false);
      resetBillModal();
    } catch (error) {
      console.error("Wallet: Error adding bill:", error);
      Alert.alert("Error", "Failed to add bill. Please try again.");
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
            console.error("Wallet: Error deleting bill:", error);
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

  // Filter transactions based on search and tab
  const filteredTransactions = transactions.filter((transaction) => {
    // Search filter
    const matchesSearch =
      searchQuery === "" ||
      transaction.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (transaction.note &&
        transaction.note.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    // Tab filter
    if (activeTab === "All") return true;
    if (activeTab === "Expenses") {
      return (
        transaction.amount < 0 &&
        transaction.transactionType !== "Regular Expense"
      );
    } else if (activeTab === "Income") {
      return (
        transaction.amount >= 0 && transaction.transactionType !== "Side Income"
      );
    } else if (activeTab === "Regular") {
      return (
        transaction.amount < 0 &&
        transaction.transactionType === "Regular Expense"
      );
    } else if (activeTab === "Side Income") {
      return (
        transaction.amount >= 0 && transaction.transactionType === "Side Income"
      );
    }
    return false;
  });

  // Get user's display name
  const userName = user?.firstName || user?.displayName || "User";

  const tabs = ["All", "Income", "Expenses", "Regular", "Side Income"];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.headerCard, { backgroundColor: colors.primary }]}>
        <View style={styles.headerContent}>
          <Text
            style={[styles.flowziTitle, { color: colors.white }]}
            accessibilityRole="header"
            accessibilityLabel="FLOWZI Wallet"
          >
            FLOWZI WALLET
          </Text>
          <Text
            style={[styles.headerSubtitle, { color: colors.white }]}
            accessibilityLabel={`${userName}'s transactions and bills`}
          >
            {userName}'s Transactions & Bills
          </Text>
        </View>

        {/* Header Actions */}
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[
              styles.headerButton,
              { backgroundColor: "rgba(255,255,255,0.2)" },
            ]}
            onPress={() => setIsSearchVisible(!isSearchVisible)}
            accessibilityLabel="Toggle search"
            accessibilityHint="Show or hide transaction search"
            accessibilityRole="button"
          >
            <MaterialIcons name="search" size={20} color={colors.white} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.headerButton,
              { backgroundColor: "rgba(255,255,255,0.2)" },
            ]}
            onPress={() => setIsSelectionMode(!isSelectionMode)}
            accessibilityLabel={
              isSelectionMode ? "Exit selection mode" : "Enter selection mode"
            }
            accessibilityHint="Select multiple transactions for bulk operations"
            accessibilityRole="button"
          >
            <MaterialIcons
              name={isSelectionMode ? "close" : "checklist"}
              size={20}
              color={colors.white}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.decorativeElements}>
          <View
            style={[
              styles.decorativeCircle,
              styles.circle1,
              { backgroundColor: "rgba(255,255,255,0.1)" },
            ]}
          />
          <View
            style={[
              styles.decorativeCircle,
              styles.circle2,
              { backgroundColor: "rgba(255,255,255,0.15)" },
            ]}
          />
        </View>
      </View>

      {/* Search Bar */}
      {isSearchVisible && (
        <View
          style={[
            styles.searchContainer,
            { backgroundColor: colors.cardBackground },
          ]}
        >
          <MaterialIcons name="search" size={20} color={colors.textLight} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search transactions by category or note..."
            placeholderTextColor={colors.textLight}
            value={searchQuery}
            onChangeText={setSearchQuery}
            accessibilityLabel="Search transactions"
            accessibilityHint="Type to filter transactions by category or note"
          />
          {searchQuery !== "" && (
            <TouchableOpacity
              onPress={() => setSearchQuery("")}
              accessibilityLabel="Clear search"
              accessibilityHint="Remove search filter"
              accessibilityRole="button"
            >
              <MaterialIcons name="clear" size={20} color={colors.textLight} />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Selection Mode Header */}
      {isSelectionMode && (
        <View
          style={[
            styles.selectionHeader,
            { backgroundColor: colors.secondary + "20" },
          ]}
        >
          <Text style={[styles.selectionText, { color: colors.text }]}>
            {selectedTransactions.size} selected
          </Text>
          <View style={styles.selectionActions}>
            <TouchableOpacity
              style={[
                styles.selectionButton,
                { backgroundColor: colors.error },
              ]}
              onPress={deleteSelectedTransactions}
              accessibilityLabel="Delete selected transactions"
              accessibilityHint="Remove all selected transactions permanently"
              accessibilityRole="button"
            >
              <MaterialIcons name="delete" size={16} color={colors.white} />
              <Text
                style={[styles.selectionButtonText, { color: colors.white }]}
              >
                Delete
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.selectionButton,
                { backgroundColor: colors.textLight },
              ]}
              onPress={clearSelection}
              accessibilityLabel="Clear selection"
              accessibilityHint="Deselect all transactions"
              accessibilityRole="button"
            >
              <Text
                style={[styles.selectionButtonText, { color: colors.text }]}
              >
                Clear
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Summary Cards */}
      <View style={styles.summaryContainer}>
        <View
          style={[
            styles.summaryCard,
            { backgroundColor: colors.cardBackground },
          ]}
          accessibilityLabel={`Total income: ${formatCurrency(totalIncome)}`}
          accessibilityRole="summary"
        >
          <View
            style={[
              styles.summaryIcon,
              { backgroundColor: colors.success + "20" },
            ]}
          >
            <MaterialIcons
              name="trending-up"
              size={24}
              color={colors.success}
            />
          </View>
          <View style={styles.summaryInfo}>
            <Text style={[styles.summaryLabel, { color: colors.textLight }]}>
              Total Income
            </Text>
            <Text style={[styles.summaryAmount, { color: colors.success }]}>
              {formatCurrency(totalIncome)}
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.summaryCard,
            { backgroundColor: colors.cardBackground },
          ]}
          accessibilityLabel={`Total expenses: ${formatCurrency(
            totalExpenses
          )}`}
          accessibilityRole="summary"
        >
          <View
            style={[
              styles.summaryIcon,
              { backgroundColor: colors.error + "20" },
            ]}
          >
            <MaterialIcons
              name="trending-down"
              size={24}
              color={colors.error}
            />
          </View>
          <View style={styles.summaryInfo}>
            <Text style={[styles.summaryLabel, { color: colors.textLight }]}>
              Total Expenses
            </Text>
            <Text style={[styles.summaryAmount, { color: colors.error }]}>
              {formatCurrency(totalExpenses)}
            </Text>
          </View>
        </View>
      </View>

      {/* Balance Card */}
      <View
        style={[styles.balanceCard, { backgroundColor: colors.cardBackground }]}
        accessibilityLabel={`Net balance: ${formatCurrency(
          totalIncome - totalExpenses
        )}`}
        accessibilityRole="summary"
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

      {/* Tab Navigation */}
      <View style={styles.tabsContainer}>
        <FlatList
          data={tabs}
          horizontal
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.tab,
                {
                  backgroundColor:
                    activeTab === item ? colors.primary : colors.cardBackground,
                },
              ]}
              onPress={() => setActiveTab(item)}
              accessibilityLabel={`Filter by ${item}`}
              accessibilityHint={`Show only ${item.toLowerCase()} transactions`}
              accessibilityRole="tab"
              accessibilityState={{ selected: activeTab === item }}
            >
              <Text
                style={[
                  styles.tabText,
                  {
                    color: activeTab === item ? colors.white : colors.text,
                    fontWeight: activeTab === item ? "600" : "400",
                  },
                ]}
              >
                {item}
              </Text>
            </TouchableOpacity>
          )}
          keyExtractor={(item) => item}
          contentContainerStyle={styles.tabsList}
        />
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtonsContainer}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.primary }]}
          onPress={() => setModalVisible(true)}
          accessibilityLabel="Add new transaction"
          accessibilityHint="Open form to create a new income or expense transaction"
          accessibilityRole="button"
        >
          <MaterialIcons name="add" size={20} color={colors.white} />
          <Text style={[styles.actionButtonText, { color: colors.white }]}>
            Add Transaction
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.secondary }]}
          onPress={() => setBillModalVisible(true)}
          accessibilityLabel="Add new bill"
          accessibilityHint="Open form to create a new upcoming bill reminder"
          accessibilityRole="button"
        >
          <MaterialIcons name="receipt" size={20} color={colors.white} />
          <Text style={[styles.actionButtonText, { color: colors.white }]}>
            Add Bill
          </Text>
        </TouchableOpacity>
      </View>

      {/* Transactions List */}
      <View
        style={[
          styles.transactionsCard,
          { backgroundColor: colors.cardBackground },
        ]}
      >
        <View style={styles.sectionHeader}>
          <Text
            style={[styles.sectionTitle, { color: colors.text }]}
            accessibilityRole="header"
          >
            {activeTab} Transactions
          </Text>
          <Text
            style={[styles.transactionCount, { color: colors.textLight }]}
            accessibilityLabel={`${filteredTransactions.length} transactions found`}
          >
            {filteredTransactions.length} items
          </Text>
        </View>

        {filteredTransactions.length === 0 ? (
          <View
            style={styles.emptyState}
            accessibilityLabel="No transactions found"
            accessibilityHint={
              searchQuery
                ? "Try adjusting your search terms"
                : "Add your first transaction to get started"
            }
          >
            <MaterialIcons
              name="receipt-long"
              size={64}
              color={colors.textLight}
            />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              {searchQuery
                ? "No matching transactions"
                : `No ${activeTab.toLowerCase()} transactions`}
            </Text>
            <Text style={[styles.emptyText, { color: colors.textLight }]}>
              {searchQuery
                ? "Try adjusting your search terms"
                : "Add your first transaction to get started!"}
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredTransactions.slice(0, 20)}
            renderItem={({ item }) => (
              <View style={styles.transactionItemWrapper}>
                {isSelectionMode && (
                  <TouchableOpacity
                    style={styles.selectionCheckbox}
                    onPress={() => toggleTransactionSelection(item.id)}
                    accessibilityLabel={
                      selectedTransactions.has(item.id)
                        ? "Deselect transaction"
                        : "Select transaction"
                    }
                    accessibilityRole="checkbox"
                    accessibilityState={{
                      checked: selectedTransactions.has(item.id),
                    }}
                  >
                    <MaterialIcons
                      name={
                        selectedTransactions.has(item.id)
                          ? "check-box"
                          : "check-box-outline-blank"
                      }
                      size={24}
                      color={
                        selectedTransactions.has(item.id)
                          ? colors.primary
                          : colors.textLight
                      }
                    />
                  </TouchableOpacity>
                )}

                <View style={styles.transactionContent}>
                  <TransactionItem
                    category={item.category}
                    amount={item.amount}
                    date={item.date}
                    note={item.note}
                    textColor={colors.text}
                    amountColor={
                      item.amount >= 0 ? colors.success : colors.error
                    }
                  />
                </View>

                {!isSelectionMode && (
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
                    accessibilityLabel="Delete this transaction"
                    accessibilityHint="Remove this transaction permanently"
                    accessibilityRole="button"
                  >
                    <MaterialIcons
                      name="delete"
                      size={16}
                      color={colors.error}
                    />
                  </TouchableOpacity>
                )}
              </View>
            )}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            style={styles.transactionsList}
            accessibilityLabel="List of transactions"
          />
        )}
      </View>

      {/* Bills Section */}
      <View
        style={[styles.billsCard, { backgroundColor: colors.cardBackground }]}
      >
        <View style={styles.sectionHeader}>
          <Text
            style={[styles.sectionTitle, { color: colors.text }]}
            accessibilityRole="header"
          >
            Upcoming Bills
          </Text>
          <MaterialIcons name="schedule" size={20} color={colors.primary} />
        </View>

        {bills.length === 0 ? (
          <View
            style={styles.emptyStateBills}
            accessibilityLabel="No upcoming bills"
            accessibilityHint="Add a bill to track your payment reminders"
          >
            <MaterialIcons
              name="event-note"
              size={48}
              color={colors.textLight}
            />
            <Text style={[styles.emptyText, { color: colors.textLight }]}>
              No upcoming bills. Add one to track your payments!
            </Text>
          </View>
        ) : (
          bills.slice(0, 5).map((bill) => (
            <View
              key={bill.id}
              style={styles.billItem}
              accessibilityLabel={`${bill.name} bill: ${formatCurrency(
                bill.amount
              )} due in ${bill.days} days`}
            >
              <View
                style={[
                  styles.billIcon,
                  { backgroundColor: colors.error + "20" },
                ]}
              >
                <MaterialIcons name="receipt" size={20} color={colors.error} />
              </View>
              <View style={styles.billDetails}>
                <Text style={[styles.billName, { color: colors.text }]}>
                  {bill.name}
                </Text>
                <Text style={[styles.billDue, { color: colors.textLight }]}>
                  Due in {bill.days} days
                </Text>
              </View>
              <View style={styles.billActions}>
                <Text style={[styles.billAmount, { color: colors.error }]}>
                  {formatCurrency(bill.amount)}
                </Text>
                <TouchableOpacity
                  onPress={() => deleteBill(bill.id)}
                  style={[
                    styles.deleteBillButton,
                    { backgroundColor: colors.error + "20" },
                  ]}
                  accessibilityLabel={`Delete ${bill.name} bill`}
                  accessibilityHint="Remove this bill reminder permanently"
                  accessibilityRole="button"
                >
                  <MaterialIcons name="delete" size={16} color={colors.error} />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </View>

      {/* Transaction Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => {
          setModalVisible(false);
          resetTransactionModal();
        }}
        accessibilityViewIsModal={true}
      >
        <View style={styles.modalContainer}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: colors.cardBackground },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text
                style={[styles.modalTitle, { color: colors.text }]}
                accessibilityRole="header"
              >
                Add New Transaction
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setModalVisible(false);
                  resetTransactionModal();
                }}
                accessibilityLabel="Close dialog"
                accessibilityRole="button"
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
              accessibilityLabel="Transaction category"
              accessibilityHint="Enter the category for this transaction"
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
              accessibilityLabel="Transaction amount"
              accessibilityHint="Enter the amount for this transaction"
            />

            <View style={styles.pickerContainer}>
              <Text
                style={[styles.pickerLabel, { color: colors.text }]}
                accessibilityRole="header"
              >
                Type
              </Text>
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
                style={[styles.picker, { color: colors.text }]}
                accessibilityLabel="Transaction type"
                accessibilityHint="Choose whether this is income or expense"
              >
                <Picker.Item label="Income" value="Income" />
                <Picker.Item label="Expense" value="Expense" />
              </Picker>
            </View>

            <View style={styles.pickerContainer}>
              <Text
                style={[styles.pickerLabel, { color: colors.text }]}
                accessibilityRole="header"
              >
                Category
              </Text>
              <Picker
                selectedValue={transactionType}
                onValueChange={(value) => setTransactionType(value)}
                style={[styles.picker, { color: colors.text }]}
                accessibilityLabel="Transaction subcategory"
                accessibilityHint="Choose the specific type of transaction"
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

            <TextInput
              style={[
                styles.input,
                { borderColor: colors.textLight, color: colors.text },
              ]}
              placeholder="Note (optional)"
              placeholderTextColor={colors.textLight}
              value={note}
              onChangeText={setNote}
              accessibilityLabel="Transaction note"
              accessibilityHint="Add an optional note to describe this transaction"
            />

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
                accessibilityLabel="Cancel transaction creation"
                accessibilityHint="Close this dialog without saving"
              />
              <CustomButton
                title="Add Transaction"
                onPress={addTransaction}
                style={[
                  styles.modalButton,
                  { backgroundColor: colors.primary },
                ]}
                textColor={colors.white}
                accessibilityLabel="Save transaction"
                accessibilityHint="Create this transaction and add it to your list"
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Bill Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={billModalVisible}
        onRequestClose={() => {
          setBillModalVisible(false);
          resetBillModal();
        }}
        accessibilityViewIsModal={true}
      >
        <View style={styles.modalContainer}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: colors.cardBackground },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text
                style={[styles.modalTitle, { color: colors.text }]}
                accessibilityRole="header"
              >
                Add New Bill
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setBillModalVisible(false);
                  resetBillModal();
                }}
                accessibilityLabel="Close dialog"
                accessibilityRole="button"
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
              accessibilityLabel="Bill name"
              accessibilityHint="Enter the name of the bill or company"
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
              accessibilityLabel="Bill amount"
              accessibilityHint="Enter the amount due for this bill"
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
              accessibilityLabel="Days until due"
              accessibilityHint="Enter how many days until this bill is due"
            />

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
                accessibilityLabel="Cancel bill creation"
                accessibilityHint="Close this dialog without saving"
              />
              <CustomButton
                title="Add Bill"
                onPress={addBill}
                style={[
                  styles.modalButton,
                  { backgroundColor: colors.primary },
                ]}
                textColor={colors.white}
                accessibilityLabel="Save bill"
                accessibilityHint="Create this bill reminder and add it to your list"
              />
            </View>
          </View>
        </View>
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
  headerCard: {
    paddingTop: 50,
    paddingBottom: SIZES.padding * 1.5,
    paddingHorizontal: SIZES.padding,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    marginBottom: SIZES.margin,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  headerContent: {
    zIndex: 2,
    alignItems: "center",
  },
  flowziTitle: {
    fontSize: 24,
    fontWeight: "bold",
    letterSpacing: 1,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    opacity: 0.9,
  },
  headerActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: SIZES.margin,
    zIndex: 3,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  decorativeElements: {
    position: "absolute",
    width: "100%",
    height: "100%",
  },
  decorativeCircle: {
    position: "absolute",
    borderRadius: 100,
  },
  circle1: {
    width: 100,
    height: 100,
    top: -30,
    right: -20,
  },
  circle2: {
    width: 70,
    height: 70,
    bottom: -15,
    left: -15,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    margin: SIZES.padding,
    padding: SIZES.padding,
    borderRadius: 15,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  searchInput: {
    flex: 1,
    marginLeft: SIZES.margin / 2,
    fontSize: 16,
  },
  selectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: SIZES.padding,
    paddingVertical: SIZES.padding / 2,
    marginHorizontal: SIZES.padding,
    borderRadius: 10,
    marginBottom: SIZES.margin / 2,
  },
  selectionText: {
    fontSize: 16,
    fontWeight: "600",
  },
  selectionActions: {
    flexDirection: "row",
  },
  selectionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    marginLeft: 8,
  },
  selectionButtonText: {
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 4,
  },
  summaryContainer: {
    flexDirection: "row",
    paddingHorizontal: SIZES.padding,
    marginBottom: SIZES.margin,
  },
  summaryCard: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    padding: SIZES.padding,
    borderRadius: 15,
    marginHorizontal: 4,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  summaryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: SIZES.margin / 2,
  },
  summaryInfo: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  summaryAmount: {
    fontSize: 16,
    fontWeight: "600",
  },
  balanceCard: {
    margin: SIZES.padding,
    padding: SIZES.padding * 1.5,
    borderRadius: 20,
    alignItems: "center",
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  balanceLabel: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 28,
    fontWeight: "bold",
  },
  tabsContainer: {
    paddingHorizontal: SIZES.padding,
    marginBottom: SIZES.margin,
  },
  tabsList: {
    paddingVertical: 4,
  },
  tab: {
    paddingHorizontal: SIZES.padding,
    paddingVertical: SIZES.padding / 2,
    borderRadius: 20,
    marginRight: 8,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  tabText: {
    fontSize: 14,
  },
  actionButtonsContainer: {
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
    borderRadius: 15,
    marginHorizontal: 4,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 6,
  },
  transactionsCard: {
    margin: SIZES.padding,
    borderRadius: 20,
    padding: SIZES.padding,
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    flex: 1,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SIZES.margin,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  transactionCount: {
    fontSize: 14,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: SIZES.padding * 2,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: SIZES.margin,
    marginBottom: SIZES.margin / 2,
  },
  emptyText: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  transactionsList: {
    flex: 1,
  },
  transactionItemWrapper: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  selectionCheckbox: {
    marginRight: SIZES.margin / 2,
  },
  transactionContent: {
    flex: 1,
  },
  deleteButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: SIZES.margin / 2,
  },
  billsCard: {
    margin: SIZES.padding,
    borderRadius: 20,
    padding: SIZES.padding,
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  emptyStateBills: {
    alignItems: "center",
    paddingVertical: SIZES.padding,
  },
  billItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: SIZES.padding / 2,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  billIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginRight: SIZES.margin,
  },
  billDetails: {
    flex: 1,
  },
  billName: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 2,
  },
  billDue: {
    fontSize: 12,
  },
  billActions: {
    alignItems: "flex-end",
  },
  billAmount: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
  },
  deleteBillButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: SIZES.padding,
  },
  modalContent: {
    borderRadius: 20,
    padding: SIZES.padding * 1.5,
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SIZES.margin * 1.5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "600",
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: SIZES.padding,
    marginBottom: SIZES.margin,
    fontSize: 16,
  },
  pickerContainer: {
    marginBottom: SIZES.margin,
  },
  pickerLabel: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 8,
  },
  picker: {
    borderWidth: 1,
    borderRadius: 12,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: SIZES.margin,
  },
  modalButton: {
    flex: 1,
    marginHorizontal: 8,
    borderRadius: 12,
  },
});

export default TransactionsScreen;
