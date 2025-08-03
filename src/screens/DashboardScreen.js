import React, { useState, useEffect, useContext } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { ThemeContext } from "../contexts/ThemeContext";
import { CurrencyContext } from "../contexts/CurrencyContext";
import { AuthContext } from "../contexts/AuthContext";
import TransactionItem from "../components/TransactionItem";
import { db } from "../services/firebaseConfig";
import { collection, onSnapshot, doc, setDoc } from "firebase/firestore";
import { SIZES, FONTS } from "../constants/theme";

const { width } = Dimensions.get("window");

const DashboardScreen = () => {
  const { colors } = useContext(ThemeContext);
  const { formatCurrency } = useContext(CurrencyContext);
  const { user, isLoading } = useContext(AuthContext);

  const [transactions, setTransactions] = useState([]);
  const [goals, setGoals] = useState([]);
  const [bills, setBills] = useState([]);
  const [monthlyIncome, setMonthlyIncome] = useState(0);
  const [totalBalance, setTotalBalance] = useState(0);
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [regularExpenses, setRegularExpenses] = useState(0);
  const [miscellaneousExpenses, setMiscellaneousExpenses] = useState(0);
  const [primaryIncome, setPrimaryIncome] = useState(0);
  const [sideIncome, setSideIncome] = useState(0);
  const [transactionIncome, setTransactionIncome] = useState(0);
  const [actualExpensesByCategory, setActualExpensesByCategory] = useState({});

  useEffect(() => {
    if (!user) {
      setTransactions([]);
      setGoals([]);
      setBills([]);
      setMonthlyIncome(0);
      setTotalBalance(0);
      setTotalIncome(0);
      setTotalExpenses(0);
      setRegularExpenses(0);
      setMiscellaneousExpenses(0);
      setPrimaryIncome(0);
      setSideIncome(0);
      setTransactionIncome(0);
      setActualExpensesByCategory({});
      return;
    }

    const unsubscribeTransactions = onSnapshot(
      collection(db, "transactions"),
      (snapshot) => {
        const transactionList = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));
        setTransactions(transactionList);

        let income = 0;
        let expenses = 0;
        let regularExp = 0;
        let miscExp = 0;
        let primaryInc = 0;
        let sideInc = 0;
        const expensesByCategory = {};

        transactionList.forEach((transaction) => {
          if (transaction.amount >= 0) {
            income += transaction.amount;
            if (transaction.transactionType === "Side Income") {
              sideInc += transaction.amount;
            } else {
              primaryInc += transaction.amount;
            }
          } else {
            expenses += Math.abs(transaction.amount);
            if (transaction.transactionType === "Regular Expense") {
              regularExp += Math.abs(transaction.amount);
            } else {
              miscExp += Math.abs(transaction.amount);
            }
            if (!expensesByCategory[transaction.category]) {
              expensesByCategory[transaction.category] = 0;
            }
            expensesByCategory[transaction.category] += Math.abs(
              transaction.amount
            );
          }
        });

        setTransactionIncome(income);
        setTotalExpenses(expenses);
        setTotalBalance(income + monthlyIncome - expenses);
        setRegularExpenses(regularExp);
        setMiscellaneousExpenses(miscExp);
        setPrimaryIncome(primaryInc);
        setSideIncome(sideInc);
        setActualExpensesByCategory(expensesByCategory);
      }
    );

    const unsubscribeGoals = onSnapshot(collection(db, "goals"), (snapshot) => {
      const goalList = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));
      setGoals(goalList);
    });

    const unsubscribeBills = onSnapshot(collection(db, "bills"), (snapshot) => {
      const billList = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));
      setBills(billList);
    });

    const unsubscribeSettings = onSnapshot(
      doc(db, "users", user.uid),
      (userDoc) => {
        if (userDoc.exists()) {
          const data = userDoc.data();
          if (data.monthlyIncome !== undefined) {
            setMonthlyIncome(data.monthlyIncome);
            setTotalIncome(transactionIncome + data.monthlyIncome);
            setTotalBalance(
              transactionIncome + data.monthlyIncome - totalExpenses
            );
          } else {
            setMonthlyIncome(0);
            setTotalIncome(transactionIncome);
            setTotalBalance(transactionIncome - totalExpenses);
          }
        } else {
          setDoc(
            doc(db, "users", user.uid),
            { monthlyIncome: 0 },
            { merge: true }
          ).catch((error) => {
            console.error("Dashboard: Error creating user document:", error);
          });
        }
      }
    );

    return () => {
      unsubscribeTransactions();
      unsubscribeGoals();
      unsubscribeBills();
      unsubscribeSettings();
    };
  }, [user, transactionIncome, totalExpenses, monthlyIncome]);

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
          Loading your financial data...
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
          Please log in to view your dashboard
        </Text>
      </View>
    );
  }

  const calculateGoalProgress = (goal) => {
    const categoryTransactions = transactions.filter(
      (t) => t.category === goal.category && t.amount >= 0
    );
    const savedAmount = categoryTransactions.reduce(
      (sum, t) => sum + t.amount,
      0
    );
    return (savedAmount / goal.targetAmount) * 100;
  };

  const totalBudget = monthlyIncome * 0.8;
  const budgetCategories = [
    { category: "Rent", budgetedPercentage: 0.4 },
    { category: "Food", budgetedPercentage: 0.2 },
    { category: "Dining Out", budgetedPercentage: 0.15 },
    { category: "Transport", budgetedPercentage: 0.15 },
  ];

  const budgetData = budgetCategories.map((cat) => ({
    ...cat,
    budgeted: totalBudget * cat.budgetedPercentage,
    spent: actualExpensesByCategory[cat.category] || 0,
  }));

  const totalSpent = budgetData.reduce((sum, item) => sum + item.spent, 0);
  const totalRemaining = totalBudget - totalSpent;

  let savingsOpportunity = "No savings opportunities available.";
  for (const budgetItem of budgetData) {
    const budgetedAmount = budgetItem.budgeted;
    const actualAmount = budgetItem.spent;
    if (actualAmount < budgetedAmount) {
      const savings = budgetedAmount - actualAmount;
      if (savings > 0 && goals.length > 0) {
        const goalToFund = goals[0];
        savingsOpportunity = `You've only spent ${formatCurrency(
          actualAmount
        )} on ${budgetItem.category} vs. ${formatCurrency(
          budgetedAmount
        )} budgeted — transfer ${formatCurrency(savings)} to your ${
          goalToFund.name
        } goal?`;
        break;
      }
    }
  }

  const achievementBadge =
    goals.find((goal) => goal.name === "Smartwatch") &&
    calculateGoalProgress(goals.find((goal) => goal.name === "Smartwatch")) >=
      85
      ? "🔥 Smartwatch 85% Funded! Keep going, you're almost there."
      : null;

  // Get user's display name
  const userName = user?.firstName || user?.displayName || "User";

  const dashboardSections = [
    { type: "header", data: null },
    { type: "balance", data: null },
    { type: "quickStats", data: null },
    { type: "goals", data: goals },
    { type: "budget", data: budgetData },
    { type: "transactions", data: transactions.slice(0, 5) },
    { type: "bills", data: bills },
    { type: "savings", data: savingsOpportunity },
    ...(achievementBadge
      ? [{ type: "achievement", data: achievementBadge }]
      : []),
  ];

  const renderSection = ({ item }) => {
    switch (item.type) {
      case "header":
        return (
          <View
            style={[styles.headerCard, { backgroundColor: colors.primary }]}
          >
            <View style={styles.headerContent}>
              <View style={styles.headerTop}>
                <View>
                  <Text style={[styles.flowziTitle, { color: colors.white }]}>
                    FLOWZI
                  </Text>
                  <Text style={[styles.welcomeText, { color: colors.white }]}>
                    Hello, {userName}! Welcome Back
                  </Text>
                </View>
                <View
                  style={[
                    styles.notificationIcon,
                    { backgroundColor: "rgba(255,255,255,0.2)" },
                  ]}
                >
                  <MaterialIcons
                    name="notifications"
                    size={24}
                    color={colors.white}
                  />
                </View>
              </View>
              <Text style={[styles.statusText, { color: colors.white }]}>
                You're on track with your finances! Keep it up.
              </Text>
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
        );

      case "balance":
        return (
          <View
            style={[
              styles.balanceCard,
              { backgroundColor: colors.cardBackground },
            ]}
          >
            <View style={styles.balanceHeader}>
              <Text style={[styles.balanceTitle, { color: colors.text }]}>
                Total Balance
              </Text>
              <MaterialIcons
                name="account-balance-wallet"
                size={24}
                color={colors.primary}
              />
            </View>
            <Text
              style={[
                styles.balanceAmount,
                {
                  color: totalBalance >= 0 ? colors.success : colors.error,
                },
              ]}
            >
              {formatCurrency(totalBalance)}
            </Text>
            <View style={styles.balanceRow}>
              <View style={styles.balanceItem}>
                <MaterialIcons
                  name="trending-up"
                  size={20}
                  color={colors.success}
                />
                <View style={styles.balanceItemText}>
                  <Text
                    style={[styles.balanceLabel, { color: colors.textLight }]}
                  >
                    Income
                  </Text>
                  <Text
                    style={[styles.balanceValue, { color: colors.success }]}
                  >
                    {formatCurrency(totalIncome)}
                  </Text>
                </View>
              </View>
              <View style={styles.balanceItem}>
                <MaterialIcons
                  name="trending-down"
                  size={20}
                  color={colors.error}
                />
                <View style={styles.balanceItemText}>
                  <Text
                    style={[styles.balanceLabel, { color: colors.textLight }]}
                  >
                    Expenses
                  </Text>
                  <Text style={[styles.balanceValue, { color: colors.error }]}>
                    {formatCurrency(totalExpenses)}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        );

      case "quickStats":
        return (
          <View style={styles.quickStatsContainer}>
            <TouchableOpacity
              style={[
                styles.statCard,
                { backgroundColor: colors.primary + "20" },
              ]}
            >
              <MaterialIcons name="savings" size={28} color={colors.primary} />
              <Text style={[styles.statLabel, { color: colors.text }]}>
                Primary
              </Text>
              <Text style={[styles.statValue, { color: colors.primary }]}>
                {formatCurrency(primaryIncome)}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.statCard,
                { backgroundColor: colors.secondary + "20" },
              ]}
            >
              <MaterialIcons name="work" size={28} color={colors.secondary} />
              <Text style={[styles.statLabel, { color: colors.text }]}>
                Side Income
              </Text>
              <Text style={[styles.statValue, { color: colors.secondary }]}>
                {formatCurrency(sideIncome)}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.statCard,
                { backgroundColor: colors.error + "20" },
              ]}
            >
              <MaterialIcons name="receipt" size={28} color={colors.error} />
              <Text style={[styles.statLabel, { color: colors.text }]}>
                Regular
              </Text>
              <Text style={[styles.statValue, { color: colors.error }]}>
                {formatCurrency(regularExpenses)}
              </Text>
            </TouchableOpacity>
          </View>
        );

      case "goals":
        return (
          <View
            style={[
              styles.sectionCard,
              { backgroundColor: colors.cardBackground },
            ]}
          >
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Goal Progress
              </Text>
              <MaterialIcons name="flag" size={20} color={colors.primary} />
            </View>
            {item.data.length === 0 ? (
              <View style={styles.emptyState}>
                <MaterialIcons
                  name="track-changes"
                  size={48}
                  color={colors.textLight}
                />
                <Text style={[styles.emptyText, { color: colors.textLight }]}>
                  No goals set yet. Add a goal to start tracking!
                </Text>
              </View>
            ) : (
              item.data.slice(0, 3).map((goal) => {
                const progress = calculateGoalProgress(goal);
                const iconMap = {
                  Phone: "smartphone",
                  Smartwatch: "watch",
                  Trip: "airplanemode-active",
                };
                const icon = iconMap[goal.name] || "flag";
                return (
                  <TouchableOpacity key={goal.id} style={styles.goalItem}>
                    <View
                      style={[
                        styles.goalIcon,
                        { backgroundColor: colors.primary + "20" },
                      ]}
                    >
                      <MaterialIcons
                        name={icon}
                        size={20}
                        color={colors.primary}
                      />
                    </View>
                    <View style={styles.goalDetails}>
                      <Text style={[styles.goalName, { color: colors.text }]}>
                        {goal.name}
                      </Text>
                      <Text
                        style={[styles.goalTarget, { color: colors.textLight }]}
                      >
                        Target: {formatCurrency(goal.targetAmount)}
                      </Text>
                      <View
                        style={[
                          styles.progressBarContainer,
                          { backgroundColor: colors.textLight + "30" },
                        ]}
                      >
                        <View
                          style={[
                            styles.progressBar,
                            {
                              width: `${Math.min(progress, 100)}%`,
                              backgroundColor: colors.secondary,
                            },
                          ]}
                        />
                      </View>
                      <Text
                        style={[styles.progressText, { color: colors.text }]}
                      >
                        {progress.toFixed(1)}% complete
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        );

      case "budget":
        return (
          <View
            style={[
              styles.sectionCard,
              { backgroundColor: colors.cardBackground },
            ]}
          >
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                This Month's Budget
              </Text>
              <MaterialIcons
                name="pie-chart"
                size={20}
                color={colors.primary}
              />
            </View>
            <View style={styles.budgetSummary}>
              <Text style={[styles.budgetText, { color: colors.text }]}>
                Total Budget: {formatCurrency(totalBudget)}
              </Text>
              <Text style={[styles.budgetText, { color: colors.textLight }]}>
                Remaining: {formatCurrency(totalRemaining)}
              </Text>
            </View>
            {item.data.slice(0, 3).map((budgetItem, index) => {
              const spentPercentage =
                (budgetItem.spent / budgetItem.budgeted) * 100;
              const statusColor =
                spentPercentage > 100
                  ? colors.error
                  : spentPercentage > 80
                  ? "#FFC107"
                  : colors.success;
              return (
                <View key={index} style={styles.budgetItem}>
                  <View style={styles.budgetItemHeader}>
                    <Text
                      style={[styles.budgetCategory, { color: colors.text }]}
                    >
                      {budgetItem.category}
                    </Text>
                    <Text
                      style={[styles.budgetPercentage, { color: statusColor }]}
                    >
                      {spentPercentage.toFixed(0)}%
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.progressBarContainer,
                      { backgroundColor: colors.textLight + "30" },
                    ]}
                  >
                    <View
                      style={[
                        styles.progressBar,
                        {
                          width: `${Math.min(spentPercentage, 100)}%`,
                          backgroundColor: statusColor,
                        },
                      ]}
                    />
                  </View>
                  <Text
                    style={[styles.budgetAmount, { color: colors.textLight }]}
                  >
                    {formatCurrency(budgetItem.spent)} /{" "}
                    {formatCurrency(budgetItem.budgeted)}
                  </Text>
                </View>
              );
            })}
          </View>
        );

      case "transactions":
        return (
          <View
            style={[
              styles.sectionCard,
              { backgroundColor: colors.cardBackground },
            ]}
          >
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Recent Transactions
              </Text>
              <TouchableOpacity>
                <Text style={[styles.seeAllText, { color: colors.primary }]}>
                  See All
                </Text>
              </TouchableOpacity>
            </View>
            {item.data.length === 0 ? (
              <View style={styles.emptyState}>
                <MaterialIcons
                  name="receipt-long"
                  size={48}
                  color={colors.textLight}
                />
                <Text style={[styles.emptyText, { color: colors.textLight }]}>
                  No recent transactions. Add one to get started!
                </Text>
              </View>
            ) : (
              item.data.map((transaction) => (
                <TransactionItem
                  key={transaction.id}
                  category={transaction.category}
                  amount={transaction.amount}
                  date={transaction.date}
                  note={transaction.note}
                  textColor={colors.text}
                  amountColor={
                    transaction.amount >= 0 ? colors.success : colors.error
                  }
                />
              ))
            )}
          </View>
        );

      case "bills":
        return (
          <View
            style={[
              styles.sectionCard,
              { backgroundColor: colors.cardBackground },
            ]}
          >
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Upcoming Bills
              </Text>
              <MaterialIcons name="schedule" size={20} color={colors.primary} />
            </View>
            {item.data.length === 0 ? (
              <View style={styles.emptyState}>
                <MaterialIcons
                  name="event-note"
                  size={48}
                  color={colors.textLight}
                />
                <Text style={[styles.emptyText, { color: colors.textLight }]}>
                  No upcoming bills. Add one in the Wallet tab!
                </Text>
              </View>
            ) : (
              item.data.slice(0, 3).map((bill) => (
                <View key={bill.id} style={styles.billItem}>
                  <View
                    style={[
                      styles.billIcon,
                      { backgroundColor: colors.error + "20" },
                    ]}
                  >
                    <MaterialIcons
                      name="receipt"
                      size={20}
                      color={colors.error}
                    />
                  </View>
                  <View style={styles.billDetails}>
                    <Text style={[styles.billName, { color: colors.text }]}>
                      {bill.name}
                    </Text>
                    <Text style={[styles.billDue, { color: colors.textLight }]}>
                      Due in {bill.days} days
                    </Text>
                  </View>
                  <Text style={[styles.billAmount, { color: colors.error }]}>
                    {formatCurrency(bill.amount)}
                  </Text>
                </View>
              ))
            )}
          </View>
        );

      case "savings":
        return (
          <View
            style={[
              styles.sectionCard,
              { backgroundColor: colors.success + "10" },
            ]}
          >
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Savings Opportunity
              </Text>
              <MaterialIcons
                name="lightbulb"
                size={20}
                color={colors.success}
              />
            </View>
            <Text style={[styles.savingsText, { color: colors.text }]}>
              {item.data}
            </Text>
          </View>
        );

      case "achievement":
        return (
          <View
            style={[
              styles.achievementCard,
              { backgroundColor: colors.secondary + "20" },
            ]}
          >
            <MaterialIcons
              name="emoji-events"
              size={32}
              color={colors.secondary}
            />
            <Text style={[styles.achievementTitle, { color: colors.text }]}>
              Achievement Unlocked!
            </Text>
            <Text style={[styles.achievementText, { color: colors.secondary }]}>
              {item.data}
            </Text>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={dashboardSections}
        renderItem={renderSection}
        keyExtractor={(item, index) => `${item.type}-${index}`}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
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
  listContent: {
    paddingBottom: SIZES.padding * 2,
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
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: SIZES.margin,
  },
  flowziTitle: {
    fontSize: 24,
    fontWeight: "bold",
    letterSpacing: 1,
    marginBottom: 4,
  },
  welcomeText: {
    fontSize: 18,
    fontWeight: "600",
  },
  statusText: {
    fontSize: 14,
    opacity: 0.9,
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
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
    width: 120,
    height: 120,
    top: -40,
    right: -30,
  },
  circle2: {
    width: 80,
    height: 80,
    bottom: -20,
    left: -20,
  },
  balanceCard: {
    margin: SIZES.padding,
    borderRadius: 20,
    padding: SIZES.padding * 1.5,
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  balanceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SIZES.margin,
  },
  balanceTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: SIZES.margin * 1.5,
  },
  balanceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  balanceItem: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  balanceItemText: {
    marginLeft: 8,
  },
  balanceLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  balanceValue: {
    fontSize: 16,
    fontWeight: "600",
  },
  quickStatsContainer: {
    flexDirection: "row",
    paddingHorizontal: SIZES.padding,
    marginBottom: SIZES.margin,
  },
  statCard: {
    flex: 1,
    padding: SIZES.padding,
    borderRadius: 15,
    alignItems: "center",
    marginHorizontal: 4,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
    marginBottom: 2,
  },
  statValue: {
    fontSize: 14,
    fontWeight: "600",
  },
  sectionCard: {
    margin: SIZES.padding,
    borderRadius: 20,
    padding: SIZES.padding * 1.5,
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
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
  seeAllText: {
    fontSize: 14,
    fontWeight: "500",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: SIZES.padding,
  },
  emptyText: {
    fontSize: 14,
    marginTop: SIZES.margin / 2,
    textAlign: "center",
  },
  goalItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SIZES.margin,
  },
  goalIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: SIZES.margin,
  },
  goalDetails: {
    flex: 1,
  },
  goalName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },
  goalTarget: {
    fontSize: 12,
    marginBottom: 8,
  },
  progressBarContainer: {
    height: 6,
    borderRadius: 3,
    marginBottom: 4,
  },
  progressBar: {
    height: "100%",
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    fontWeight: "500",
  },
  budgetSummary: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: SIZES.margin,
    paddingBottom: SIZES.margin / 2,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  budgetText: {
    fontSize: 14,
  },
  budgetItem: {
    marginBottom: SIZES.margin,
  },
  budgetItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  budgetCategory: {
    fontSize: 14,
    fontWeight: "500",
  },
  budgetPercentage: {
    fontSize: 12,
    fontWeight: "600",
  },
  budgetAmount: {
    fontSize: 12,
    marginTop: 4,
  },
  billItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SIZES.margin,
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
  billAmount: {
    fontSize: 14,
    fontWeight: "600",
  },
  savingsText: {
    fontSize: 14,
    lineHeight: 20,
  },
  achievementCard: {
    margin: SIZES.padding,
    borderRadius: 20,
    padding: SIZES.padding * 1.5,
    alignItems: "center",
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  achievementTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginVertical: SIZES.margin / 2,
  },
  achievementText: {
    fontSize: 14,
    textAlign: "center",
    fontWeight: "500",
  },
});

export default DashboardScreen;
