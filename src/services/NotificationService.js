import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform, Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

class NotificationService {
  constructor() {
    this.expoPushToken = null;
    this.notificationListener = null;
    this.responseListener = null;
  }

  async initialize() {
    try {
      await this.registerForPushNotificationsAsync();
      this.setupNotificationListeners();
      console.log("NotificationService initialized successfully");
    } catch (error) {
      console.error("Failed to initialize NotificationService:", error);
    }
  }

  async registerForPushNotificationsAsync() {
    let token;

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "FLOWZI Notifications",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#FF231F7C",
        description: "Financial alerts and reminders from FLOWZI",
      });
    }

    if (Device.isDevice) {
      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== "granted") {
        Alert.alert(
          "Notification Permission Required",
          "Please enable notifications to receive important financial alerts and milestone celebrations.",
          [{ text: "OK" }]
        );
        return;
      }

      token = (await Notifications.getExpoPushTokenAsync()).data;
      console.log("Expo push token:", token);
      this.expoPushToken = token;

      await AsyncStorage.setItem("expoPushToken", token);
    } else {
      console.log("Must use physical device for Push Notifications");
    }

    return token;
  }

  setupNotificationListeners() {
    this.notificationListener = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log("Notification received:", notification);
        this.handleNotificationReceived(notification);
      }
    );

    this.responseListener =
      Notifications.addNotificationResponseReceivedListener((response) => {
        console.log("Notification response:", response);
        this.handleNotificationResponse(response);
      });
  }

  handleNotificationReceived(notification) {
    const { title, body, data } = notification.request.content;

    switch (data?.type) {
      case "milestone":
        this.handleMilestoneNotification(data);
        break;
      case "bill_reminder":
        this.handleBillReminder(data);
        break;
      case "goal_update":
        this.handleGoalUpdate(data);
        break;
      default:
        console.log("Generic notification received");
    }
  }

  handleNotificationResponse(response) {
    const { data } = response.notification.request.content;

    switch (data?.type) {
      case "milestone":
      case "goal_update":
        console.log("Navigate to Goals screen");
        break;
      case "bill_reminder":
        console.log("Navigate to Transactions screen");
        break;
      default:
        console.log("Navigate to Dashboard");
    }
  }

  handleMilestoneNotification(data) {
    console.log("Milestone achieved!", data);
  }

  handleBillReminder(data) {
    console.log("Bill reminder:", data);
  }

  handleGoalUpdate(data) {
    console.log("Goal update:", data);
  }

  async scheduleNotification(title, body, data = {}, trigger = null) {
    try {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: "default",
        },
        trigger: trigger || { seconds: 1 },
      });

      console.log("Notification scheduled with ID:", id);
      return id;
    } catch (error) {
      console.error("Failed to schedule notification:", error);
      return null;
    }
  }

  async scheduleBillReminder(billName, amount, daysUntilDue, formatCurrency) {
    if (daysUntilDue <= 0) return;

    const triggers = [];

    if (daysUntilDue >= 7) {
      triggers.push({
        days: 7,
        title: "📅 Bill Reminder - 1 Week",
        body: `${billName} payment of ${formatCurrency(
          amount
        )} is due in 1 week`,
      });
    }

    if (daysUntilDue >= 3) {
      triggers.push({
        days: 3,
        title: "⚠️ Bill Reminder - 3 Days",
        body: `${billName} payment of ${formatCurrency(
          amount
        )} is due in 3 days`,
      });
    }

    if (daysUntilDue >= 1) {
      triggers.push({
        days: 1,
        title: "🚨 Bill Due Tomorrow",
        body: `Don't forget: ${billName} payment of ${formatCurrency(
          amount
        )} is due tomorrow!`,
      });
    }

    const notificationIds = [];
    for (const trigger of triggers) {
      if (daysUntilDue >= trigger.days) {
        const seconds = (daysUntilDue - trigger.days) * 24 * 60 * 60;
        const id = await this.scheduleNotification(
          trigger.title,
          trigger.body,
          {
            type: "bill_reminder",
            billName,
            amount,
            daysUntilDue: trigger.days,
          },
          { seconds: Math.max(seconds, 1) }
        );
        if (id) notificationIds.push(id);
      }
    }

    return notificationIds;
  }

  async checkGoalMilestones(goals, transactions, formatCurrency) {
    if (!goals || goals.length === 0) return;

    for (const goal of goals) {
      const progress = this.calculateGoalProgress(goal, transactions);
      const milestones = [25, 50, 75, 90, 100];

      for (const milestone of milestones) {
        const storageKey = `milestone_${goal.id}_${milestone}`;
        const alreadyNotified = await AsyncStorage.getItem(storageKey);

        if (progress >= milestone && !alreadyNotified) {
          await this.sendMilestoneNotification(
            goal,
            milestone,
            progress,
            formatCurrency
          );
          await AsyncStorage.setItem(storageKey, "true");
        }
      }
    }
  }

  calculateGoalProgress(goal, transactions) {
    const categoryTransactions = transactions.filter(
      (t) => t.category === goal.category && t.amount >= 0
    );
    const savedAmount = categoryTransactions.reduce(
      (sum, t) => sum + t.amount,
      0
    );
    return (savedAmount / goal.targetAmount) * 100;
  }

  async sendMilestoneNotification(
    goal,
    milestone,
    actualProgress,
    formatCurrency
  ) {
    let title, body, emoji;

    switch (milestone) {
      case 25:
        emoji = "🎯";
        title = "Quarter Way There!";
        body = `You've reached 25% of your ${goal.name} goal! Keep up the great work!`;
        break;
      case 50:
        emoji = "🎉";
        title = "Halfway Milestone!";
        body = `Amazing! You're 50% towards your ${
          goal.name
        } goal of ${formatCurrency(goal.targetAmount)}!`;
        break;
      case 75:
        emoji = "🚀";
        title = "Three-Quarters Done!";
        body = `You're 75% of the way to your ${goal.name} goal! The finish line is in sight!`;
        break;
      case 90:
        emoji = "🔥";
        title = "Almost There!";
        body = `90% complete! Your ${
          goal.name
        } goal is within reach - just ${formatCurrency(
          goal.targetAmount * 0.1
        )} to go!`;
        break;
      case 100:
        emoji = "🏆";
        title = "Goal Achieved!";
        body = `Congratulations! You've reached your ${
          goal.name
        } goal of ${formatCurrency(goal.targetAmount)}! 🎊`;
        break;
      default:
        emoji = "⭐";
        title = "Progress Update";
        body = `You've made great progress on your ${goal.name} goal!`;
    }

    await this.scheduleNotification(`${emoji} ${title}`, body, {
      type: "milestone",
      goalId: goal.id,
      goalName: goal.name,
      milestone,
      actualProgress: actualProgress.toFixed(1),
    });

    this.showMilestoneCelebration(goal, milestone);
  }

  showMilestoneCelebration(goal, milestone) {
    const celebrations = {
      25: "🎯 Quarter milestone reached!",
      50: "🎉 Halfway there!",
      75: "🚀 Three-quarters complete!",
      90: "🔥 Almost done!",
      100: "🏆 Goal achieved! Congratulations! 🎊",
    };

    Alert.alert(
      "Milestone Achieved!",
      `${celebrations[milestone]}\n\n${goal.name}: ${milestone}% complete`,
      [
        {
          text: "Keep Going!",
          style: "default",
        },
        {
          text: "View Goals",
          style: "default",
          onPress: () => {
            // Navigate to goals screen
            console.log("Navigate to goals screen");
          },
        },
      ]
    );
  }

  async sendSmartInsights(transactions, goals, monthlyIncome, formatCurrency) {
    const insights = this.generateSmartInsights(
      transactions,
      goals,
      monthlyIncome,
      formatCurrency
    );

    if (insights.length > 0) {
      const randomInsight =
        insights[Math.floor(Math.random() * insights.length)];

      await this.scheduleNotification(
        "💡 FLOWZI Insight",
        randomInsight,
        {
          type: "insight",
          timestamp: Date.now(),
        },
        { seconds: 60 }
      );
    }
  }

  generateSmartInsights(transactions, goals, monthlyIncome, formatCurrency) {
    const insights = [];

    // Analyze spending patterns
    const thisMonth = new Date().getMonth();
    const thisMonthTransactions = transactions.filter(
      (t) => new Date(t.date).getMonth() === thisMonth && t.amount < 0
    );

    const totalSpent = thisMonthTransactions.reduce(
      (sum, t) => sum + Math.abs(t.amount),
      0
    );
    const savingsRate = (
      ((monthlyIncome - totalSpent) / monthlyIncome) *
      100
    ).toFixed(1);

    if (savingsRate > 20) {
      insights.push(
        `Great job! You're saving ${savingsRate}% of your income this month. Consider putting extra towards your goals.`
      );
    }

    if (savingsRate < 10) {
      insights.push(
        `Your savings rate is ${savingsRate}% this month. Try to aim for at least 20% to build financial security.`
      );
    }

    if (goals.length > 0) {
      const goalProgress = goals.map((goal) => ({
        ...goal,
        progress: this.calculateGoalProgress(goal, transactions),
      }));

      const bestGoal = goalProgress.reduce((best, current) =>
        current.progress > best.progress ? current : best
      );

      if (bestGoal.progress > 80) {
        insights.push(
          `You're ${bestGoal.progress.toFixed(1)}% towards your ${
            bestGoal.name
          } goal! Just ${formatCurrency(
            ((100 - bestGoal.progress) / 100) * bestGoal.targetAmount
          )} more to go!`
        );
      }
    }

    const categories = {};
    thisMonthTransactions.forEach((t) => {
      categories[t.category] =
        (categories[t.category] || 0) + Math.abs(t.amount);
    });

    const topCategory = Object.entries(categories).reduce(
      (top, current) => (current[1] > (top[1] || 0) ? current : top),
      ["", 0]
    );

    if (topCategory[1] > monthlyIncome * 0.3) {
      insights.push(
        `You've spent ${formatCurrency(topCategory[1])} on ${
          topCategory[0]
        } this month. Consider if this aligns with your financial goals.`
      );
    }

    return insights;
  }

  async scheduleWeeklySummary() {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysUntilSunday = dayOfWeek === 0 ? 7 : 7 - dayOfWeek;

    await this.scheduleNotification(
      "📊 Weekly Financial Summary",
      "Your FLOWZI weekly report is ready! See how you did this week.",
      {
        type: "weekly_summary",
        week: Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000)),
      },
      {
        weekday: 1,
        hour: 18,
        minute: 0,
        repeats: true,
      }
    );
  }

  async cancelNotification(notificationId) {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
      console.log("Notification cancelled:", notificationId);
    } catch (error) {
      console.error("Failed to cancel notification:", error);
    }
  }

  async cancelAllNotifications() {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log("All notifications cancelled");
    } catch (error) {
      console.error("Failed to cancel all notifications:", error);
    }
  }

  async getPendingNotifications() {
    try {
      const notifications =
        await Notifications.getAllScheduledNotificationsAsync();
      console.log("Pending notifications:", notifications.length);
      return notifications;
    } catch (error) {
      console.error("Failed to get pending notifications:", error);
      return [];
    }
  }

  cleanup() {
    if (this.notificationListener) {
      Notifications.removeNotificationSubscription(this.notificationListener);
    }
    if (this.responseListener) {
      Notifications.removeNotificationSubscription(this.responseListener);
    }
  }
}

export default new NotificationService();
