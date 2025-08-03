import React, { useState, useEffect, useContext } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { ThemeContext } from "../contexts/ThemeContext";
import { CurrencyContext } from "../contexts/CurrencyContext";
import { AuthContext } from "../contexts/AuthContext";
import { db } from "../services/firebaseConfig";
import { collection, doc, onSnapshot } from "firebase/firestore";
import { SIZES, FONTS } from "../constants/theme";
import { MaterialIcons } from "@expo/vector-icons";

const { width } = Dimensions.get("window");

const ReportsScreen = () => {
  const { colors } = useContext(ThemeContext);
  const { formatCurrency } = useContext(CurrencyContext);
  const { user, isLoading } = useContext(AuthContext);

  const [transactions, setTransactions] = useState([]);
  const [goals, setGoals] = useState([]);
  const [monthlyIncome, setMonthlyIncome] = useState(2000);
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [regularExpenses, setRegularExpenses] = useState(0);
  const [miscellaneousExpenses, setMiscellaneousExpenses] = useState(0);
  const [primaryIncome, setPrimaryIncome] = useState(0);
  const [sideIncome, setSideIncome] = useState(0);

  useEffect(() => {
    if (!user) {
      setTransactions([]);
      setGoals([]);
      setMonthlyIncome(2000);
      setSelectedGoal(null);
      setTotalIncome(0);
      setTotalExpenses(0);
      setRegularExpenses(0);
      setMiscellaneousExpenses(0);
      setPrimaryIncome(0);
      setSideIncome(0);
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
        let regularExp = 0;
        let miscExp = 0;
        let primaryInc = 0;
        let sideInc = 0;

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
          }
        });

        setTotalIncome(income);
        setTotalExpenses(expenses);
        setRegularExpenses(regularExp);
        setMiscellaneousExpenses(miscExp);
        setPrimaryIncome(primaryInc);
        setSideIncome(sideInc);
      }
    );

    const unsubscribeGoals = onSnapshot(collection(db, "goals"), (snapshot) => {
      const goalList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setGoals(goalList);
      if (goalList.length > 0 && !selectedGoal) {
        setSelectedGoal(goalList[0]);
      }
    });

    const unsubscribeSettings = onSnapshot(
      doc(db, "users", user.uid),
      (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          if (data.monthlyIncome) {
            setMonthlyIncome(data.monthlyIncome);
          }
        }
      }
    );

    return () => {
      unsubscribeTransactions();
      unsubscribeGoals();
      unsubscribeSettings();
    };
  }, [user, selectedGoal]);

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
          Loading your analytics...
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
          Please log in to view your reports
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

  const contributionConsistencyScore = 9.5;
  const momentumIndex = "Increasing";

  const calculateGoalVelocity = (goal) => {
    const progress = calculateGoalProgress(goal);
    const expectedProgress = (1 / goal.timeframe) * 100;
    const monthsElapsed = 1;
    const velocity = (progress / (expectedProgress * monthsElapsed)) * 100;
    return Math.min(velocity, 100).toFixed(0);
  };

  const getGoalStatusColor = (goal) => {
    const progress = calculateGoalProgress(goal);
    const expectedProgress = (1 / goal.timeframe) * 100;
    const monthsElapsed = 1;
    const velocity = progress / (expectedProgress * monthsElapsed);
    if (velocity >= 1) return colors.success;
    if (velocity >= 0.8) return "#FFC107";
    return colors.error;
  };

  // Get user's display name
  const userName = user?.firstName || user?.displayName || "User";

  const savingsSources = [
    { source: "Manual Transfers", percentage: 60, color: colors.primary },
    { source: "Round-Up Savings", percentage: 25, color: colors.secondary },
    { source: "Cashback Redirected", percentage: 15, color: colors.success },
  ];

  const performanceMetrics = [
    {
      title: "Contribution Consistency",
      value: contributionConsistencyScore,
      maxValue: 10,
      icon: "trending-up",
      description: "Weekly contributions without missing",
      color: colors.success,
    },
    {
      title: "Momentum Index",
      value: "📈 Increasing",
      icon: "speed",
      description: "Contributions increased this month",
      color: colors.primary,
    },
    {
      title: "Goal Velocity",
      value: selectedGoal ? `${calculateGoalVelocity(selectedGoal)}%` : "N/A",
      icon: "rocket-launch",
      description: "Of planned speed",
      color: selectedGoal ? getGoalStatusColor(selectedGoal) : colors.textLight,
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={[styles.headerCard, { backgroundColor: colors.primary }]}>
          <View style={styles.headerContent}>
            <Text style={[styles.flowziTitle, { color: colors.white }]}>
              FLOWZI ANALYTICS
            </Text>
            <Text style={[styles.headerSubtitle, { color: colors.white }]}>
              {userName}'s Financial Insights
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

        {/* User Overview Card */}
        <View
          style={[
            styles.overviewCard,
            { backgroundColor: colors.cardBackground },
          ]}
        >
          <View style={styles.overviewHeader}>
            <View
              style={[
                styles.avatarContainer,
                { backgroundColor: colors.primary + "20" },
              ]}
            >
              <MaterialIcons name="person" size={32} color={colors.primary} />
            </View>
            <View style={styles.userInfo}>
              <Text style={[styles.userName, { color: colors.text }]}>
                {userName}
              </Text>
              <Text style={[styles.userRole, { color: colors.textLight }]}>
                FLOWZI Premium User
              </Text>
            </View>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: colors.success + "20" },
              ]}
            >
              <MaterialIcons name="verified" size={16} color={colors.success} />
              <Text style={[styles.statusText, { color: colors.success }]}>
                Active
              </Text>
            </View>
          </View>

          <View style={styles.overviewStats}>
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: colors.textLight }]}>
                Monthly Income
              </Text>
              <Text style={[styles.statValue, { color: colors.primary }]}>
                {formatCurrency(monthlyIncome)}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: colors.textLight }]}>
                Savings Rate
              </Text>
              <Text style={[styles.statValue, { color: colors.success }]}>
                20%
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: colors.textLight }]}>
                Goal Budget
              </Text>
              <Text style={[styles.statValue, { color: colors.secondary }]}>
                {formatCurrency(monthlyIncome * 0.8 * 0.2)}
              </Text>
            </View>
          </View>
        </View>

        {/* Goal Selector */}
        {goals.length > 0 && (
          <View
            style={[
              styles.goalSelectorCard,
              { backgroundColor: colors.cardBackground },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Select Goal for Analysis
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.goalSelector}
            >
              {goals.map((goal) => (
                <TouchableOpacity
                  key={goal.id}
                  style={[
                    styles.goalChip,
                    {
                      backgroundColor:
                        selectedGoal?.id === goal.id
                          ? colors.primary
                          : colors.background,
                      borderColor:
                        selectedGoal?.id === goal.id
                          ? colors.primary
                          : colors.textLight,
                    },
                  ]}
                  onPress={() => setSelectedGoal(goal)}
                >
                  <Text
                    style={[
                      styles.goalChipText,
                      {
                        color:
                          selectedGoal?.id === goal.id
                            ? colors.white
                            : colors.text,
                      },
                    ]}
                  >
                    {goal.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {selectedGoal && (
          <>
            {/* Performance Metrics */}
            <View
              style={[
                styles.metricsCard,
                { backgroundColor: colors.cardBackground },
              ]}
            >
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Performance Metrics
                </Text>
                <MaterialIcons
                  name="insights"
                  size={20}
                  color={colors.primary}
                />
              </View>

              {performanceMetrics.map((metric, index) => (
                <View key={index} style={styles.metricItem}>
                  <View
                    style={[
                      styles.metricIcon,
                      { backgroundColor: metric.color + "20" },
                    ]}
                  >
                    <MaterialIcons
                      name={metric.icon}
                      size={24}
                      color={metric.color}
                    />
                  </View>
                  <View style={styles.metricInfo}>
                    <View style={styles.metricHeader}>
                      <Text
                        style={[styles.metricTitle, { color: colors.text }]}
                      >
                        {metric.title}
                      </Text>
                      <Text
                        style={[styles.metricValue, { color: metric.color }]}
                      >
                        {typeof metric.value === "number"
                          ? `${metric.value}/${metric.maxValue}`
                          : metric.value}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.metricDescription,
                        { color: colors.textLight },
                      ]}
                    >
                      {metric.description}
                    </Text>
                    {typeof metric.value === "number" && (
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
                              width: `${
                                (metric.value / metric.maxValue) * 100
                              }%`,
                              backgroundColor: metric.color,
                            },
                          ]}
                        />
                      </View>
                    )}
                  </View>
                </View>
              ))}
            </View>

            {/* Financial Breakdown */}
            <View
              style={[
                styles.breakdownCard,
                { backgroundColor: colors.cardBackground },
              ]}
            >
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Financial Breakdown
                </Text>
                <MaterialIcons
                  name="pie-chart"
                  size={20}
                  color={colors.primary}
                />
              </View>

              <View style={styles.breakdownGrid}>
                <View style={styles.breakdownItem}>
                  <View
                    style={[
                      styles.breakdownIcon,
                      { backgroundColor: colors.success + "20" },
                    ]}
                  >
                    <MaterialIcons
                      name="work"
                      size={20}
                      color={colors.success}
                    />
                  </View>
                  <Text
                    style={[styles.breakdownLabel, { color: colors.textLight }]}
                  >
                    Primary Income
                  </Text>
                  <Text
                    style={[styles.breakdownValue, { color: colors.success }]}
                  >
                    {formatCurrency(primaryIncome)}
                  </Text>
                </View>

                <View style={styles.breakdownItem}>
                  <View
                    style={[
                      styles.breakdownIcon,
                      { backgroundColor: colors.secondary + "20" },
                    ]}
                  >
                    <MaterialIcons
                      name="trending-up"
                      size={20}
                      color={colors.secondary}
                    />
                  </View>
                  <Text
                    style={[styles.breakdownLabel, { color: colors.textLight }]}
                  >
                    Side Income
                  </Text>
                  <Text
                    style={[styles.breakdownValue, { color: colors.secondary }]}
                  >
                    {formatCurrency(sideIncome)}
                  </Text>
                </View>

                <View style={styles.breakdownItem}>
                  <View
                    style={[
                      styles.breakdownIcon,
                      { backgroundColor: colors.error + "20" },
                    ]}
                  >
                    <MaterialIcons
                      name="receipt"
                      size={20}
                      color={colors.error}
                    />
                  </View>
                  <Text
                    style={[styles.breakdownLabel, { color: colors.textLight }]}
                  >
                    Regular Expenses
                  </Text>
                  <Text
                    style={[styles.breakdownValue, { color: colors.error }]}
                  >
                    {formatCurrency(regularExpenses)}
                  </Text>
                </View>

                <View style={styles.breakdownItem}>
                  <View
                    style={[
                      styles.breakdownIcon,
                      { backgroundColor: colors.primary + "20" },
                    ]}
                  >
                    <MaterialIcons
                      name="shopping-cart"
                      size={20}
                      color={colors.primary}
                    />
                  </View>
                  <Text
                    style={[styles.breakdownLabel, { color: colors.textLight }]}
                  >
                    Miscellaneous
                  </Text>
                  <Text
                    style={[styles.breakdownValue, { color: colors.primary }]}
                  >
                    {formatCurrency(miscellaneousExpenses)}
                  </Text>
                </View>
              </View>
            </View>

            {/* Savings Sources */}
            <View
              style={[
                styles.savingsCard,
                { backgroundColor: colors.cardBackground },
              ]}
            >
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Savings Source Breakdown
                </Text>
                <MaterialIcons
                  name="savings"
                  size={20}
                  color={colors.primary}
                />
              </View>

              {savingsSources.map((source, index) => (
                <View key={index} style={styles.savingsItem}>
                  <View style={styles.savingsInfo}>
                    <Text
                      style={[styles.savingsSource, { color: colors.text }]}
                    >
                      {source.source}
                    </Text>
                    <Text
                      style={[
                        styles.savingsPercentage,
                        { color: source.color },
                      ]}
                    >
                      {source.percentage}%
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
                          width: `${source.percentage}%`,
                          backgroundColor: source.color,
                        },
                      ]}
                    />
                  </View>
                </View>
              ))}
            </View>

            {/* Goal Projections */}
            <View
              style={[
                styles.projectionsCard,
                { backgroundColor: colors.cardBackground },
              ]}
            >
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Goal Projections & Scenarios
                </Text>
                <MaterialIcons
                  name="psychology"
                  size={20}
                  color={colors.primary}
                />
              </View>

              <View style={styles.projectionItem}>
                <View
                  style={[
                    styles.projectionIcon,
                    { backgroundColor: colors.primary + "20" },
                  ]}
                >
                  <MaterialIcons
                    name="schedule"
                    size={20}
                    color={colors.primary}
                  />
                </View>
                <View style={styles.projectionInfo}>
                  <Text
                    style={[styles.projectionTitle, { color: colors.text }]}
                  >
                    Goal Completion Forecast
                  </Text>
                  <Text
                    style={[
                      styles.projectionDescription,
                      { color: colors.textLight },
                    ]}
                  >
                    {selectedGoal.name} completion in {selectedGoal.timeframe}{" "}
                    months at current pace
                  </Text>
                </View>
              </View>

              <View style={styles.projectionItem}>
                <View
                  style={[
                    styles.projectionIcon,
                    { backgroundColor: colors.success + "20" },
                  ]}
                >
                  <MaterialIcons
                    name="fast-forward"
                    size={20}
                    color={colors.success}
                  />
                </View>
                <View style={styles.projectionInfo}>
                  <Text
                    style={[styles.projectionTitle, { color: colors.text }]}
                  >
                    Acceleration Scenario
                  </Text>
                  <Text
                    style={[
                      styles.projectionDescription,
                      { color: colors.textLight },
                    ]}
                  >
                    Adding $10/week could complete goal 2-3 weeks earlier
                  </Text>
                </View>
              </View>

              <View style={styles.projectionItem}>
                <View
                  style={[
                    styles.projectionIcon,
                    { backgroundColor: colors.secondary + "20" },
                  ]}
                >
                  <MaterialIcons
                    name="lightbulb"
                    size={20}
                    color={colors.secondary}
                  />
                </View>
                <View style={styles.projectionInfo}>
                  <Text
                    style={[styles.projectionTitle, { color: colors.text }]}
                  >
                    Optimization Tip
                  </Text>
                  <Text
                    style={[
                      styles.projectionDescription,
                      { color: colors.textLight },
                    ]}
                  >
                    Reduce dining out by $24/month to reach goal faster
                  </Text>
                </View>
              </View>
            </View>

            {/* Achievement & Insights */}
            <View
              style={[
                styles.achievementCard,
                { backgroundColor: colors.success + "10" },
              ]}
            >
              <View style={styles.achievementHeader}>
                <MaterialIcons
                  name="emoji-events"
                  size={32}
                  color={colors.success}
                />
                <Text style={[styles.achievementTitle, { color: colors.text }]}>
                  Personal Best Achievement
                </Text>
              </View>
              <Text style={[styles.achievementText, { color: colors.text }]}>
                🔥 New record! $175 saved last month—highest single-month goal
                contribution
              </Text>
              <View style={styles.achievementStats}>
                <Text
                  style={[styles.achievementStat, { color: colors.success }]}
                >
                  Top 25% of savers with similar income
                </Text>
              </View>
            </View>

            {/* Recommendations */}
            <View
              style={[
                styles.recommendationsCard,
                { backgroundColor: colors.cardBackground },
              ]}
            >
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Smart Recommendations
                </Text>
                <MaterialIcons
                  name="auto-awesome"
                  size={20}
                  color={colors.primary}
                />
              </View>

              <View style={styles.recommendationsList}>
                <View style={styles.recommendationItem}>
                  <MaterialIcons
                    name="notification-important"
                    size={20}
                    color={colors.primary}
                  />
                  <Text
                    style={[styles.recommendationText, { color: colors.text }]}
                  >
                    You didn't order out this week — transfer $18 to your{" "}
                    {selectedGoal.name} goal!
                  </Text>
                </View>

                <View style={styles.recommendationItem}>
                  <MaterialIcons
                    name="schedule"
                    size={20}
                    color={colors.secondary}
                  />
                  <Text
                    style={[styles.recommendationText, { color: colors.text }]}
                  >
                    Set up auto-transfer right after payday for consistent
                    savings
                  </Text>
                </View>

                <View style={styles.recommendationItem}>
                  <MaterialIcons name="flag" size={20} color={colors.success} />
                  <Text
                    style={[styles.recommendationText, { color: colors.text }]}
                  >
                    {selectedGoal.name}:{" "}
                    {calculateGoalProgress(selectedGoal).toFixed(1)}% funded —
                    only{" "}
                    {formatCurrency(
                      selectedGoal.targetAmount -
                        (calculateGoalProgress(selectedGoal) / 100) *
                          selectedGoal.targetAmount
                    )}{" "}
                    left!
                  </Text>
                </View>
              </View>
            </View>
          </>
        )}

        {goals.length === 0 && (
          <View
            style={[
              styles.emptyStateCard,
              { backgroundColor: colors.cardBackground },
            ]}
          >
            <MaterialIcons
              name="analytics"
              size={64}
              color={colors.textLight}
            />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              No Analytics Available
            </Text>
            <Text style={[styles.emptyText, { color: colors.textLight }]}>
              Add some goals to see detailed financial analytics and insights
            </Text>
          </View>
        )}
      </ScrollView>
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
  scrollContent: {
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
  overviewCard: {
    margin: SIZES.padding,
    borderRadius: 20,
    padding: SIZES.padding * 1.5,
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  overviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SIZES.margin * 1.5,
  },
  avatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    marginRight: SIZES.margin,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 2,
  },
  userRole: {
    fontSize: 14,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 4,
  },
  overviewStats: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "bold",
  },
  goalSelectorCard: {
    margin: SIZES.padding,
    borderRadius: 20,
    padding: SIZES.padding,
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  goalSelector: {
    marginTop: SIZES.margin,
  },
  goalChip: {
    paddingHorizontal: SIZES.padding,
    paddingVertical: SIZES.padding / 2,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  goalChipText: {
    fontSize: 14,
    fontWeight: "500",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SIZES.margin,
  },
  metricsCard: {
    margin: SIZES.padding,
    borderRadius: 20,
    padding: SIZES.padding * 1.5,
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  metricItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SIZES.margin * 1.5,
  },
  metricIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: SIZES.margin,
  },
  metricInfo: {
    flex: 1,
  },
  metricHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  metricTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  metricValue: {
    fontSize: 16,
    fontWeight: "bold",
  },
  metricDescription: {
    fontSize: 14,
    marginBottom: 8,
  },
  progressBarContainer: {
    height: 6,
    borderRadius: 3,
  },
  progressBar: {
    height: "100%",
    borderRadius: 3,
  },
  breakdownCard: {
    margin: SIZES.padding,
    borderRadius: 20,
    padding: SIZES.padding * 1.5,
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  breakdownGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  breakdownItem: {
    width: "48%",
    alignItems: "center",
    marginBottom: SIZES.margin,
  },
  breakdownIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  breakdownLabel: {
    fontSize: 12,
    textAlign: "center",
    marginBottom: 4,
  },
  breakdownValue: {
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  savingsCard: {
    margin: SIZES.padding,
    borderRadius: 20,
    padding: SIZES.padding * 1.5,
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  savingsItem: {
    marginBottom: SIZES.margin,
  },
  savingsInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  savingsSource: {
    fontSize: 14,
    fontWeight: "500",
  },
  savingsPercentage: {
    fontSize: 14,
    fontWeight: "bold",
  },
  projectionsCard: {
    margin: SIZES.padding,
    borderRadius: 20,
    padding: SIZES.padding * 1.5,
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  projectionItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SIZES.margin,
  },
  projectionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: SIZES.margin,
  },
  projectionInfo: {
    flex: 1,
  },
  projectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 2,
  },
  projectionDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  achievementCard: {
    margin: SIZES.padding,
    borderRadius: 20,
    padding: SIZES.padding * 1.5,
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  achievementHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SIZES.margin,
  },
  achievementTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginLeft: SIZES.margin,
  },
  achievementText: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: SIZES.margin,
  },
  achievementStats: {
    alignItems: "center",
  },
  achievementStat: {
    fontSize: 14,
    fontWeight: "600",
  },
  recommendationsCard: {
    margin: SIZES.padding,
    borderRadius: 20,
    padding: SIZES.padding * 1.5,
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  recommendationsList: {
    marginTop: SIZES.margin,
  },
  recommendationItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: SIZES.margin,
  },
  recommendationText: {
    fontSize: 14,
    lineHeight: 20,
    marginLeft: SIZES.margin,
    flex: 1,
  },
  emptyStateCard: {
    margin: SIZES.padding,
    borderRadius: 20,
    padding: SIZES.padding * 2,
    alignItems: "center",
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginTop: SIZES.margin,
    marginBottom: SIZES.margin / 2,
  },
  emptyText: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
});

export default ReportsScreen;
