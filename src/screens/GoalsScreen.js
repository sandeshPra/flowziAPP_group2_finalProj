import React, { useState, useEffect, useContext } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Alert,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { MaterialIcons } from "@expo/vector-icons";
import { ThemeContext } from "../contexts/ThemeContext";
import { CurrencyContext } from "../contexts/CurrencyContext";
import { AuthContext } from "../contexts/AuthContext";
import CustomButton from "../components/CustomButton";
import { db } from "../services/firebaseConfig";
import {
  collection,
  addDoc,
  onSnapshot,
  deleteDoc,
  doc,
  updateDoc,
} from "firebase/firestore";
import { SIZES, FONTS } from "../constants/theme";
import NotificationService from "../services/NotificationService";

const { width } = Dimensions.get("window");

const GoalsScreen = () => {
  const { colors } = useContext(ThemeContext);
  const { formatCurrency } = useContext(CurrencyContext);
  const { user, isLoading } = useContext(AuthContext);

  const [transactions, setTransactions] = useState([]);
  const [goals, setGoals] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [incomeModalVisible, setIncomeModalVisible] = useState(false);
  const [monthlyIncome, setMonthlyIncome] = useState(0);
  const [goalName, setGoalName] = useState("");
  const [goalCost, setGoalCost] = useState("");
  const [goalTimeframe, setGoalTimeframe] = useState("1");
  const [editingGoal, setEditingGoal] = useState(null);
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [regularExpenses, setRegularExpenses] = useState(0);
  const [miscellaneousExpenses, setMiscellaneousExpenses] = useState(0);
  const [primaryIncome, setPrimaryIncome] = useState(0);
  const [sideIncome, setSideIncome] = useState(0);
  const [transactionIncome, setTransactionIncome] = useState(0);
  const [celebrationVisible, setCelebrationVisible] = useState(false);
  const [celebrationGoal, setCelebrationGoal] = useState(null);
  const [celebrationMilestone, setCelebrationMilestone] = useState(null);

  // Monitor for milestone achievements
  useEffect(() => {
    if (goals.length > 0 && transactions.length > 0) {
      checkMilestones();
    }
  }, [goals, transactions]);

  const checkMilestones = async () => {
    try {
      await NotificationService.checkGoalMilestones(
        goals,
        transactions,
        formatCurrency
      );
    } catch (error) {
      console.error("Error checking milestones:", error);
    }
  };

  useEffect(() => {
    if (!user) {
      setTransactions([]);
      setGoals([]);
      setMonthlyIncome(0);
      setTotalIncome(0);
      setTotalExpenses(0);
      setRegularExpenses(0);
      setMiscellaneousExpenses(0);
      setPrimaryIncome(0);
      setSideIncome(0);
      setTransactionIncome(0);
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

        setTransactionIncome(income);
        setTotalExpenses(expenses);
        setRegularExpenses(regularExp);
        setMiscellaneousExpenses(miscExp);
        setPrimaryIncome(primaryInc);
        setSideIncome(sideInc);

        // Send smart insights when transactions update
        if (income > 0 || expenses > 0) {
          NotificationService.sendSmartInsights(
            transactionList,
            goals,
            monthlyIncome,
            formatCurrency
          );
        }
      }
    );

    const unsubscribeGoals = onSnapshot(collection(db, "goals"), (snapshot) => {
      const goalList = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));
      setGoals(goalList);
    });

    const unsubscribeSettings = onSnapshot(
      doc(db, "users", user.uid),
      (userDoc) => {
        if (userDoc.exists()) {
          const data = userDoc.data();
          if (data.monthlyIncome) {
            setMonthlyIncome(data.monthlyIncome);
            setTotalIncome(transactionIncome + data.monthlyIncome);
          }
        }
      }
    );

    return () => {
      unsubscribeTransactions();
      unsubscribeGoals();
      unsubscribeSettings();
    };
  }, [user, transactionIncome]);

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
          Loading your goals...
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
          Please log in to view your goals
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

  const addGoal = async () => {
    if (goalName && goalCost && goalTimeframe) {
      try {
        const newGoal = {
          name: goalName,
          category: goalName,
          targetAmount: parseFloat(goalCost),
          timeframe: parseInt(goalTimeframe),
          createdAt: new Date().toISOString(),
        };
        await addDoc(collection(db, "goals"), newGoal);
        setModalVisible(false);
        resetModal();

        // Send goal creation notification
        await NotificationService.scheduleNotification(
          "🎯 New Goal Created!",
          `Your ${goalName} goal of ${formatCurrency(
            parseFloat(goalCost)
          )} has been set. Time to start saving!`,
          {
            type: "goal_created",
            goalName,
            targetAmount: parseFloat(goalCost),
          }
        );

        // Show success alert
        Alert.alert(
          "Goal Created! 🎯",
          `Your ${goalName} goal has been created successfully. You'll receive milestone notifications as you progress!`,
          [{ text: "Great!" }]
        );
      } catch (error) {
        console.error("Goals: Error adding goal:", error);
        alert("Failed to add goal. Please try again.");
      }
    }
  };

  const editGoal = async () => {
    if (editingGoal && goalName && goalCost && goalTimeframe) {
      try {
        const updatedGoal = {
          name: goalName,
          category: goalName,
          targetAmount: parseFloat(goalCost),
          timeframe: parseInt(goalTimeframe),
        };
        await updateDoc(doc(db, "goals", editingGoal.id), updatedGoal);
        setEditModalVisible(false);
        resetModal();

        // Send goal update notification
        await NotificationService.scheduleNotification(
          "✏️ Goal Updated!",
          `Your ${goalName} goal has been updated successfully.`,
          {
            type: "goal_updated",
            goalName,
            targetAmount: parseFloat(goalCost),
          }
        );
      } catch (error) {
        console.error("Goals: Error updating goal:", error);
        alert("Failed to update goal. Please try again.");
      }
    }
  };

  const deleteGoal = async (goalId, goalName) => {
    Alert.alert(
      "Delete Goal",
      `Are you sure you want to delete your ${goalName} goal?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteDoc(doc(db, "goals", goalId));

              // Send goal deletion notification
              await NotificationService.scheduleNotification(
                "🗑️ Goal Deleted",
                `Your ${goalName} goal has been removed from your list.`,
                { type: "goal_deleted", goalName }
              );
            } catch (error) {
              console.error("Goals: Error deleting goal:", error);
              alert("Failed to delete goal. Please try again.");
            }
          },
        },
      ]
    );
  };

  const resetModal = () => {
    setGoalName("");
    setGoalCost("");
    setGoalTimeframe("1");
    setEditingGoal(null);
  };

  const openEditModal = (goal) => {
    setEditingGoal(goal);
    setGoalName(goal.name);
    setGoalCost(goal.targetAmount.toString());
    setGoalTimeframe(goal.timeframe.toString());
    setEditModalVisible(true);
  };

  const showCelebration = (goal, milestone) => {
    setCelebrationGoal(goal);
    setCelebrationMilestone(milestone);
    setCelebrationVisible(true);
  };

  const mandatorySavings = monthlyIncome * 0.2;
  const availableIncome = monthlyIncome * 0.8;
  const budgetBreakdown = {
    rentBills: availableIncome * 0.4,
    foodGroceries: availableIncome * 0.2,
    transport: availableIncome * 0.1,
    wantsFun: availableIncome * 0.1,
    savingForGoals: availableIncome * 0.2,
  };
  const remainingAfterGoals =
    budgetBreakdown.savingForGoals -
    goals.reduce((sum, goal) => {
      const monthlyTarget = goal.targetAmount / goal.timeframe;
      return sum + (isNaN(monthlyTarget) ? 0 : monthlyTarget);
    }, 0);

  // Get user's display name
  const userName = user?.firstName || user?.displayName || "User";

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
              FLOWZI GOALS
            </Text>
            <Text style={[styles.headerSubtitle, { color: colors.white }]}>
              {userName}'s Financial Goals
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

        {/* Notification Settings Card */}
        <View
          style={[
            styles.notificationCard,
            { backgroundColor: colors.success + "10" },
          ]}
        >
          <View style={styles.notificationHeader}>
            <MaterialIcons
              name="notifications-active"
              size={24}
              color={colors.success}
            />
            <Text style={[styles.notificationTitle, { color: colors.text }]}>
              Smart Notifications Enabled
            </Text>
          </View>
          <Text style={[styles.notificationText, { color: colors.textLight }]}>
            You'll receive milestone alerts, bill reminders, and smart financial
            insights to keep you on track!
          </Text>
        </View>

        {/* Income Card */}
        <View
          style={[
            styles.incomeCard,
            { backgroundColor: colors.cardBackground },
          ]}
        >
          <View style={styles.incomeHeader}>
            <View>
              <Text style={[styles.incomeTitle, { color: colors.text }]}>
                Monthly Income
              </Text>
              <Text style={[styles.incomeAmount, { color: colors.primary }]}>
                {monthlyIncome ? formatCurrency(monthlyIncome) : "Not Set"}
              </Text>
            </View>
            <TouchableOpacity
              style={[
                styles.setIncomeButton,
                { backgroundColor: colors.primary },
              ]}
              onPress={() => setIncomeModalVisible(true)}
            >
              <MaterialIcons name="edit" size={20} color={colors.white} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Budget Breakdown */}
        {monthlyIncome > 0 && (
          <View
            style={[
              styles.budgetCard,
              { backgroundColor: colors.cardBackground },
            ]}
          >
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Budget Breakdown
              </Text>
              <MaterialIcons
                name="pie-chart"
                size={20}
                color={colors.primary}
              />
            </View>

            <View style={styles.savingsHighlight}>
              <View
                style={[
                  styles.savingsIcon,
                  { backgroundColor: colors.success + "20" },
                ]}
              >
                <MaterialIcons
                  name="savings"
                  size={24}
                  color={colors.success}
                />
              </View>
              <View style={styles.savingsInfo}>
                <Text style={[styles.savingsLabel, { color: colors.text }]}>
                  Mandatory Savings (20%)
                </Text>
                <Text style={[styles.savingsAmount, { color: colors.success }]}>
                  {formatCurrency(mandatorySavings)}
                </Text>
              </View>
            </View>

            <View style={styles.budgetBreakdownList}>
              {Object.entries(budgetBreakdown).map(([key, value], index) => {
                const labels = {
                  rentBills: "Rent & Bills (40%)",
                  foodGroceries: "Food & Groceries (20%)",
                  transport: "Transport (10%)",
                  wantsFun: "Wants/Fun (10%)",
                  savingForGoals: "Saving for Goals (20%)",
                };
                return (
                  <View key={key} style={styles.budgetItem}>
                    <Text style={[styles.budgetLabel, { color: colors.text }]}>
                      {labels[key]}
                    </Text>
                    <Text
                      style={[styles.budgetAmount, { color: colors.primary }]}
                    >
                      {formatCurrency(value)}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Goals Section */}
        <View
          style={[
            styles.goalsSection,
            { backgroundColor: colors.cardBackground },
          ]}
        >
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Your Goals
            </Text>
            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: colors.primary }]}
              onPress={() => setModalVisible(true)}
            >
              <MaterialIcons name="add" size={20} color={colors.white} />
              <Text style={[styles.addButtonText, { color: colors.white }]}>
                Add Goal
              </Text>
            </TouchableOpacity>
          </View>

          {goals.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialIcons name="flag" size={64} color={colors.textLight} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                No Goals Yet
              </Text>
              <Text style={[styles.emptyText, { color: colors.textLight }]}>
                Start your financial journey by setting your first goal! You'll
                receive milestone notifications as you progress.
              </Text>
            </View>
          ) : (
            goals.map((goal) => {
              const progress = calculateGoalProgress(goal);
              const monthlyTarget = goal.targetAmount / goal.timeframe;
              const weeklyTarget = monthlyTarget / 4;
              const iconMap = {
                "Hawaii Vacation": "airplanemode-active",
                Smartwatch: "watch",
                Phone: "smartphone",
                Trip: "luggage",
                Car: "directions-car",
                House: "home",
                Savings: "savings",
                "Emergency Fund": "emergency",
              };
              const icon = iconMap[goal.name] || "flag";

              // Determine milestone status
              let milestoneIcon = null;
              let milestoneColor = colors.textLight;
              if (progress >= 100) {
                milestoneIcon = "emoji-events";
                milestoneColor = "#FFD700";
              } else if (progress >= 90) {
                milestoneIcon = "whatshot";
                milestoneColor = colors.error;
              } else if (progress >= 75) {
                milestoneIcon = "rocket-launch";
                milestoneColor = colors.secondary;
              } else if (progress >= 50) {
                milestoneIcon = "celebration";
                milestoneColor = colors.primary;
              } else if (progress >= 25) {
                milestoneIcon = "track-changes";
                milestoneColor = colors.success;
              }

              return (
                <View
                  key={goal.id}
                  style={[
                    styles.goalCard,
                    { backgroundColor: colors.background },
                  ]}
                >
                  <View style={styles.goalHeader}>
                    <View
                      style={[
                        styles.goalIcon,
                        { backgroundColor: colors.primary + "20" },
                      ]}
                    >
                      <MaterialIcons
                        name={icon}
                        size={28}
                        color={colors.primary}
                      />
                    </View>
                    <View style={styles.goalInfo}>
                      <View style={styles.goalNameRow}>
                        <Text style={[styles.goalName, { color: colors.text }]}>
                          {goal.name}
                        </Text>
                        {milestoneIcon && (
                          <MaterialIcons
                            name={milestoneIcon}
                            size={20}
                            color={milestoneColor}
                          />
                        )}
                      </View>
                      <Text
                        style={[styles.goalTarget, { color: colors.textLight }]}
                      >
                        Target: {formatCurrency(goal.targetAmount)}
                      </Text>
                    </View>
                    <View style={styles.goalActions}>
                      <TouchableOpacity
                        style={[
                          styles.actionButton,
                          { backgroundColor: colors.secondary + "20" },
                        ]}
                        onPress={() => openEditModal(goal)}
                      >
                        <MaterialIcons
                          name="edit"
                          size={16}
                          color={colors.secondary}
                        />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.actionButton,
                          { backgroundColor: colors.error + "20" },
                        ]}
                        onPress={() => deleteGoal(goal.id, goal.name)}
                      >
                        <MaterialIcons
                          name="delete"
                          size={16}
                          color={colors.error}
                        />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.goalProgress}>
                    <View style={styles.progressInfo}>
                      <Text
                        style={[
                          styles.progressLabel,
                          { color: colors.textLight },
                        ]}
                      >
                        Progress: {progress.toFixed(1)}%
                      </Text>
                      <Text
                        style={[styles.timeframe, { color: colors.textLight }]}
                      >
                        {goal.timeframe} month(s)
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
                            width: `${Math.min(progress, 100)}%`,
                            backgroundColor:
                              progress >= 100 ? "#FFD700" : colors.secondary,
                          },
                        ]}
                      />
                    </View>
                  </View>

                  <View style={styles.goalTargets}>
                    <View style={styles.targetItem}>
                      <Text
                        style={[
                          styles.targetLabel,
                          { color: colors.textLight },
                        ]}
                      >
                        Monthly Target
                      </Text>
                      <Text
                        style={[styles.targetAmount, { color: colors.primary }]}
                      >
                        {formatCurrency(monthlyTarget)}
                      </Text>
                    </View>
                    <View style={styles.targetItem}>
                      <Text
                        style={[
                          styles.targetLabel,
                          { color: colors.textLight },
                        ]}
                      >
                        Weekly Target
                      </Text>
                      <Text
                        style={[styles.targetAmount, { color: colors.primary }]}
                      >
                        {formatCurrency(weeklyTarget)}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* Recap & Tips */}
        {monthlyIncome > 0 && (
          <View
            style={[
              styles.recapCard,
              { backgroundColor: colors.success + "10" },
            ]}
          >
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Financial Recap & Tips
              </Text>
              <MaterialIcons
                name="lightbulb"
                size={20}
                color={colors.success}
              />
            </View>

            <View style={styles.recapStats}>
              <View style={styles.statItem}>
                <Text style={[styles.statLabel, { color: colors.textLight }]}>
                  Remaining for Goals
                </Text>
                <Text style={[styles.statValue, { color: colors.success }]}>
                  {formatCurrency(remainingAfterGoals)}
                </Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statLabel, { color: colors.textLight }]}>
                  Total Income
                </Text>
                <Text style={[styles.statValue, { color: colors.primary }]}>
                  {formatCurrency(totalIncome)}
                </Text>
              </View>
            </View>

            <View style={styles.tipsList}>
              <View style={styles.tipItem}>
                <MaterialIcons name="star" size={16} color={colors.success} />
                <Text style={[styles.tipText, { color: colors.text }]}>
                  FLOWZI will notify you when you reach milestones!
                </Text>
              </View>
              <View style={styles.tipItem}>
                <MaterialIcons name="star" size={16} color={colors.success} />
                <Text style={[styles.tipText, { color: colors.text }]}>
                  Set up auto-transfers to stay consistent with your savings
                </Text>
              </View>
              <View style={styles.tipItem}>
                <MaterialIcons name="star" size={16} color={colors.success} />
                <Text style={[styles.tipText, { color: colors.text }]}>
                  You'll receive smart insights to optimize your spending
                </Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Celebration Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={celebrationVisible}
        onRequestClose={() => setCelebrationVisible(false)}
      >
        <View style={styles.celebrationOverlay}>
          <View
            style={[
              styles.celebrationModal,
              { backgroundColor: colors.cardBackground },
            ]}
          >
            <MaterialIcons name="emoji-events" size={64} color="#FFD700" />
            <Text style={[styles.celebrationTitle, { color: colors.text }]}>
              Milestone Achieved! 🎉
            </Text>
            {celebrationGoal && celebrationMilestone && (
              <>
                <Text
                  style={[styles.celebrationText, { color: colors.textLight }]}
                >
                  You've reached {celebrationMilestone}% of your{" "}
                  {celebrationGoal.name} goal!
                </Text>
                <Text
                  style={[
                    styles.celebrationProgress,
                    { color: colors.primary },
                  ]}
                >
                  Keep going! You're doing amazing! 🚀
                </Text>
              </>
            )}
            <TouchableOpacity
              style={[
                styles.celebrationButton,
                { backgroundColor: colors.primary },
              ]}
              onPress={() => setCelebrationVisible(false)}
            >
              <Text
                style={[styles.celebrationButtonText, { color: colors.white }]}
              >
                Continue Journey! 💪
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: colors.cardBackground },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Add New Goal
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setModalVisible(false);
                  resetModal();
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
              placeholder="Goal Name (e.g., Hawaii Vacation)"
              placeholderTextColor={colors.textLight}
              value={goalName}
              onChangeText={setGoalName}
            />
            <TextInput
              style={[
                styles.input,
                { borderColor: colors.textLight, color: colors.text },
              ]}
              placeholder="Target Amount ($)"
              placeholderTextColor={colors.textLight}
              value={goalCost}
              onChangeText={setGoalCost}
              keyboardType="numeric"
            />
            <TextInput
              style={[
                styles.input,
                { borderColor: colors.textLight, color: colors.text },
              ]}
              placeholder="Timeframe (months)"
              placeholderTextColor={colors.textLight}
              value={goalTimeframe}
              onChangeText={setGoalTimeframe}
              keyboardType="numeric"
            />

            <View style={styles.modalButtons}>
              <CustomButton
                title="Cancel"
                onPress={() => {
                  setModalVisible(false);
                  resetModal();
                }}
                style={[
                  styles.modalButton,
                  { backgroundColor: colors.textLight },
                ]}
                textColor={colors.text}
              />
              <CustomButton
                title="Add Goal"
                onPress={addGoal}
                style={[
                  styles.modalButton,
                  { backgroundColor: colors.primary },
                ]}
                textColor={colors.white}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Goal Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={editModalVisible}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: colors.cardBackground },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Edit Goal
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setEditModalVisible(false);
                  resetModal();
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
              placeholder="Goal Name"
              placeholderTextColor={colors.textLight}
              value={goalName}
              onChangeText={setGoalName}
            />
            <TextInput
              style={[
                styles.input,
                { borderColor: colors.textLight, color: colors.text },
              ]}
              placeholder="Target Amount ($)"
              placeholderTextColor={colors.textLight}
              value={goalCost}
              onChangeText={setGoalCost}
              keyboardType="numeric"
            />
            <TextInput
              style={[
                styles.input,
                { borderColor: colors.textLight, color: colors.text },
              ]}
              placeholder="Timeframe (months)"
              placeholderTextColor={colors.textLight}
              value={goalTimeframe}
              onChangeText={setGoalTimeframe}
              keyboardType="numeric"
            />

            <View style={styles.modalButtons}>
              <CustomButton
                title="Cancel"
                onPress={() => {
                  setEditModalVisible(false);
                  resetModal();
                }}
                style={[
                  styles.modalButton,
                  { backgroundColor: colors.textLight },
                ]}
                textColor={colors.text}
              />
              <CustomButton
                title="Save Changes"
                onPress={editGoal}
                style={[
                  styles.modalButton,
                  { backgroundColor: colors.primary },
                ]}
                textColor={colors.white}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Income Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={incomeModalVisible}
        onRequestClose={() => setIncomeModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: colors.cardBackground },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Set Monthly Income
              </Text>
              <TouchableOpacity onPress={() => setIncomeModalVisible(false)}>
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
              placeholder="Monthly Income Amount"
              placeholderTextColor={colors.textLight}
              value={monthlyIncome.toString()}
              onChangeText={(value) => setMonthlyIncome(parseFloat(value) || 0)}
              keyboardType="numeric"
            />

            <View style={styles.modalButtons}>
              <CustomButton
                title="Cancel"
                onPress={() => setIncomeModalVisible(false)}
                style={[
                  styles.modalButton,
                  { backgroundColor: colors.textLight },
                ]}
                textColor={colors.text}
              />
              <CustomButton
                title="Save"
                onPress={() => setIncomeModalVisible(false)}
                style={[
                  styles.modalButton,
                  { backgroundColor: colors.primary },
                ]}
                textColor={colors.white}
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
  notificationCard: {
    margin: SIZES.padding,
    borderRadius: 15,
    padding: SIZES.padding,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  notificationHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  notificationText: {
    fontSize: 14,
    lineHeight: 20,
  },
  incomeCard: {
    margin: SIZES.padding,
    borderRadius: 20,
    padding: SIZES.padding * 1.5,
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  incomeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  incomeTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  incomeAmount: {
    fontSize: 24,
    fontWeight: "bold",
  },
  setIncomeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  budgetCard: {
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
  savingsHighlight: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SIZES.margin * 1.5,
    padding: SIZES.padding,
    borderRadius: 15,
    backgroundColor: "rgba(76, 175, 80, 0.1)",
  },
  savingsIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: SIZES.margin,
  },
  savingsInfo: {
    flex: 1,
  },
  savingsLabel: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 2,
  },
  savingsAmount: {
    fontSize: 20,
    fontWeight: "bold",
  },
  budgetBreakdownList: {
    marginTop: SIZES.margin,
  },
  budgetItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: SIZES.padding / 2,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  budgetLabel: {
    fontSize: 14,
    flex: 1,
  },
  budgetAmount: {
    fontSize: 14,
    fontWeight: "600",
  },
  goalsSection: {
    margin: SIZES.padding,
    borderRadius: 20,
    padding: SIZES.padding * 1.5,
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SIZES.padding,
    paddingVertical: SIZES.padding / 2,
    borderRadius: 20,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 4,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: SIZES.padding * 2,
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
  goalCard: {
    borderRadius: 15,
    padding: SIZES.padding,
    marginBottom: SIZES.margin,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  goalHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SIZES.margin,
  },
  goalIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    marginRight: SIZES.margin,
  },
  goalInfo: {
    flex: 1,
  },
  goalNameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  goalName: {
    fontSize: 18,
    fontWeight: "600",
    flex: 1,
  },
  goalTarget: {
    fontSize: 14,
  },
  goalActions: {
    flexDirection: "row",
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  goalProgress: {
    marginBottom: SIZES.margin,
  },
  progressInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: "500",
  },
  timeframe: {
    fontSize: 14,
  },
  progressBarContainer: {
    height: 8,
    borderRadius: 4,
  },
  progressBar: {
    height: "100%",
    borderRadius: 4,
  },
  goalTargets: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  targetItem: {
    flex: 1,
    alignItems: "center",
  },
  targetLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  targetAmount: {
    fontSize: 16,
    fontWeight: "600",
  },
  recapCard: {
    margin: SIZES.padding,
    borderRadius: 20,
    padding: SIZES.padding * 1.5,
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  recapStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: SIZES.margin * 1.5,
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
  tipsList: {
    marginTop: SIZES.margin,
  },
  tipItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: SIZES.margin / 2,
  },
  tipText: {
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
    lineHeight: 20,
  },
  celebrationOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
  celebrationModal: {
    borderRadius: 20,
    padding: SIZES.padding * 2,
    alignItems: "center",
    elevation: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    margin: SIZES.padding,
  },
  celebrationTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginVertical: SIZES.margin,
  },
  celebrationText: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: SIZES.margin / 2,
  },
  celebrationProgress: {
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: SIZES.margin * 1.5,
  },
  celebrationButton: {
    paddingHorizontal: SIZES.padding * 2,
    paddingVertical: SIZES.padding,
    borderRadius: 25,
  },
  celebrationButtonText: {
    fontSize: 16,
    fontWeight: "600",
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

export default GoalsScreen;
