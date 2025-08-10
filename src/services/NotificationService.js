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
    this.isInitialized = false;
    this.initializationPromise = null;
    this.isSimulator = !Device.isDevice;
  }

  async initialize() {
    try {
      // Prevent multiple initializations and return existing promise if already initializing
      if (this.isInitialized) {
        return Promise.resolve();
      }

      if (this.initializationPromise) {
        return this.initializationPromise;
      }

      // Create initialization promise with timeout
      this.initializationPromise = Promise.race([
        this._performInitialization(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Initialization timeout")), 10000)
        ),
      ]);

      await this.initializationPromise;
      return Promise.resolve();
    } catch (error) {
      console.warn(
        "NotificationService initialization failed:",
        error?.message || error
      );
      this.initializationPromise = null;
      this.isInitialized = false;
      return Promise.resolve(); // Don't throw - just continue without notifications
    }
  }

  async _performInitialization() {
    try {
      if (this.isSimulator) {
        console.log(
          "Running in simulator - local notifications enabled, push notifications disabled"
        );
        // Still set up listeners and permissions for local notifications
        await this.requestNotificationPermissions();
        this.setupNotificationListeners();
        this.isInitialized = true;
        return;
      }

      await this.registerForPushNotificationsAsync();
      this.setupNotificationListeners();
      this.isInitialized = true;
      console.log("NotificationService initialized successfully");
    } catch (error) {
      console.warn("Error in _performInitialization:", error?.message || error);
      throw error;
    }
  }

  async requestNotificationPermissions() {
    try {
      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== "granted") {
        console.warn("Notification permissions not granted");
        return false;
      }

      console.log("Notification permissions granted");
      return true;
    } catch (error) {
      console.warn("Error requesting permissions:", error?.message || error);
      return false;
    }
  }

  async registerForPushNotificationsAsync() {
    try {
      let token;

      // Always request permissions first
      const hasPermissions = await this.requestNotificationPermissions();
      if (!hasPermissions) {
        return null;
      }

      // Skip push token registration for simulator (but keep local notifications)
      if (this.isSimulator) {
        console.log("Simulator: Skipping push notification token registration");
        return null;
      }

      if (Platform.OS === "android") {
        try {
          await Notifications.setNotificationChannelAsync("default", {
            name: "FLOWZI Notifications",
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: "#FF231F7C",
            description: "Financial alerts and reminders from FLOWZI",
          });
        } catch (channelError) {
          console.warn(
            "Could not create notification channel:",
            channelError?.message || channelError
          );
        }
      }

      // Skip token generation for simulator
      try {
        const tokenData = await Notifications.getExpoPushTokenAsync({
          projectId: "your-expo-project-id", // Replace with your actual project ID
        });
        token = tokenData.data;
        this.expoPushToken = token;

        // Save token with robust error handling
        this.safeAsyncStorageSet("expoPushToken", token);
        console.log("Push token registered:", token);
      } catch (tokenError) {
        console.warn(
          "Could not get push token:",
          tokenError?.message || tokenError
        );
        // Continue without token - local notifications will still work
      }

      return token;
    } catch (error) {
      console.warn(
        "Error registering for push notifications:",
        error?.message || error
      );
      return null;
    }
  }

  // Safe AsyncStorage wrapper to handle file system errors
  async safeAsyncStorageSet(key, value) {
    try {
      await AsyncStorage.setItem(key, value);
    } catch (error) {
      console.warn(
        `AsyncStorage set failed for ${key}:`,
        error?.message || error
      );
    }
  }

  async safeAsyncStorageGet(key) {
    try {
      return await AsyncStorage.getItem(key);
    } catch (error) {
      console.warn(
        `AsyncStorage get failed for ${key}:`,
        error?.message || error
      );
      return null;
    }
  }

  setupNotificationListeners() {
    try {
      // Clean up existing listeners first
      this.cleanup();

      // Set up listeners for both simulator and device
      this.notificationListener = Notifications.addNotificationReceivedListener(
        (notification) => {
          try {
            console.log(
              `🔔 Notification received: ${notification.request.content.title}`
            );
            this.handleNotificationReceived(notification);
          } catch (error) {
            console.warn(
              "Error handling notification:",
              error?.message || error
            );
          }
        }
      );

      this.responseListener =
        Notifications.addNotificationResponseReceivedListener((response) => {
          try {
            console.log(
              `👆 Notification tapped: ${response.notification.request.content.title}`
            );
            this.handleNotificationResponse(response);
          } catch (error) {
            console.warn(
              "Error handling notification response:",
              error?.message || error
            );
          }
        });

      console.log("Notification listeners set up successfully");
    } catch (error) {
      console.warn(
        "Error setting up notification listeners:",
        error?.message || error
      );
    }
  }

  handleNotificationReceived(notification) {
    try {
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
    } catch (error) {
      console.warn("Error processing notification:", error?.message || error);
    }
  }

  handleNotificationResponse(response) {
    try {
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
    } catch (error) {
      console.warn(
        "Error handling notification response:",
        error?.message || error
      );
    }
  }

  handleMilestoneNotification(data) {
    try {
      console.log("Milestone achieved!", data);
    } catch (error) {
      console.warn(
        "Error handling milestone notification:",
        error?.message || error
      );
    }
  }

  handleBillReminder(data) {
    try {
      console.log("Bill reminder:", data);
    } catch (error) {
      console.warn("Error handling bill reminder:", error?.message || error);
    }
  }

  handleGoalUpdate(data) {
    try {
      console.log("Goal update:", data);
    } catch (error) {
      console.warn("Error handling goal update:", error?.message || error);
    }
  }

  async scheduleNotification(title, body, data = {}, trigger = null) {
    try {
      if (!this.isInitialized) {
        console.warn(
          "NotificationService not initialized, skipping notification"
        );
        return null;
      }

      // 🎉 ENABLE ACTUAL NOTIFICATIONS IN SIMULATOR
      const notificationContent = {
        title,
        body,
        data,
        sound: true, // Enable sound
      };

      const id = await Notifications.scheduleNotificationAsync({
        content: notificationContent,
        trigger: trigger || { seconds: 1 },
      });

      if (this.isSimulator) {
        console.log(`🔔 [SIMULATOR] Scheduled notification: ${title}`);
      } else {
        console.log("Notification scheduled with ID:", id);
      }

      return id;
    } catch (error) {
      console.warn("Failed to schedule notification:", error?.message || error);
      return null;
    }
  }

  async scheduleBillReminder(billName, amount, daysUntilDue, formatCurrency) {
    try {
      if (daysUntilDue <= 0 || !this.isInitialized) return [];

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
    } catch (error) {
      console.warn("Error scheduling bill reminders:", error?.message || error);
      return [];
    }
  }

  async checkGoalMilestones(goals, transactions, formatCurrency) {
    try {
      if (!goals || goals.length === 0 || !this.isInitialized) return;

      for (const goal of goals) {
        try {
          const progress = this.calculateGoalProgress(goal, transactions);
          const milestones = [25, 50, 75, 90, 100];

          for (const milestone of milestones) {
            try {
              const storageKey = `milestone_${goal.id}_${milestone}`;
              const alreadyNotified = await this.safeAsyncStorageGet(
                storageKey
              );

              if (progress >= milestone && !alreadyNotified) {
                await this.sendMilestoneNotification(
                  goal,
                  milestone,
                  progress,
                  formatCurrency
                );
                await this.safeAsyncStorageSet(storageKey, "true");
              }
            } catch (storageError) {
              console.warn(
                "Error checking milestone storage:",
                storageError?.message || storageError
              );
            }
          }
        } catch (goalError) {
          console.warn(
            "Error processing goal:",
            goalError?.message || goalError
          );
        }
      }
    } catch (error) {
      console.warn("Error checking goal milestones:", error?.message || error);
    }
  }

  calculateGoalProgress(goal, transactions) {
    try {
      const categoryTransactions = transactions.filter(
        (t) => t.category === goal.category && t.amount >= 0
      );
      const savedAmount = categoryTransactions.reduce(
        (sum, t) => sum + t.amount,
        0
      );
      return (savedAmount / goal.targetAmount) * 100;
    } catch (error) {
      console.warn("Error calculating goal progress:", error?.message || error);
      return 0;
    }
  }

  async sendMilestoneNotification(
    goal,
    milestone,
    actualProgress,
    formatCurrency
  ) {
    try {
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
    } catch (error) {
      console.warn(
        "Error sending milestone notification:",
        error?.message || error
      );
    }
  }

  showMilestoneCelebration(goal, milestone) {
    try {
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
          { text: "Keep Going!", style: "default" },
          {
            text: "View Goals",
            style: "default",
            onPress: () => console.log("Navigate to goals screen"),
          },
        ]
      );
    } catch (error) {
      console.warn(
        "Error showing milestone celebration:",
        error?.message || error
      );
    }
  }

  async sendSmartInsights(transactions, goals, monthlyIncome, formatCurrency) {
    try {
      if (!this.isInitialized) return;

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
          { type: "insight", timestamp: Date.now() },
          { seconds: 60 }
        );
      }
    } catch (error) {
      console.warn("Error sending smart insights:", error?.message || error);
    }
  }

  generateSmartInsights(transactions, goals, monthlyIncome, formatCurrency) {
    try {
      const insights = [];

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

      return insights;
    } catch (error) {
      console.warn("Error generating smart insights:", error?.message || error);
      return [];
    }
  }

  async scheduleWeeklySummary() {
    try {
      if (!this.isInitialized) return;

      await this.scheduleNotification(
        "📊 Weekly Financial Summary",
        "Your FLOWZI weekly report is ready! See how you did this week.",
        {
          type: "weekly_summary",
          week: Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000)),
        },
        { weekday: 1, hour: 18, minute: 0, repeats: true }
      );

      if (this.isSimulator) {
        console.log("📊 [SIMULATOR] Weekly summary scheduled");
      }
    } catch (error) {
      console.warn("Error scheduling weekly summary:", error?.message || error);
    }
  }

  async cancelNotification(notificationId) {
    try {
      if (!notificationId) return;

      await Notifications.cancelScheduledNotificationAsync(notificationId);

      if (this.isSimulator) {
        console.log(`🚫 [SIMULATOR] Cancelled notification: ${notificationId}`);
      } else {
        console.log("Notification cancelled:", notificationId);
      }
    } catch (error) {
      console.warn("Failed to cancel notification:", error?.message || error);
    }
  }

  async cancelAllNotifications() {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();

      if (this.isSimulator) {
        console.log("🚫 [SIMULATOR] All notifications cancelled");
      } else {
        console.log("All notifications cancelled");
      }
    } catch (error) {
      console.warn(
        "Failed to cancel all notifications:",
        error?.message || error
      );
    }
  }

  async getPendingNotifications() {
    try {
      const notifications =
        await Notifications.getAllScheduledNotificationsAsync();

      if (this.isSimulator) {
        console.log(
          `📋 [SIMULATOR] Pending notifications: ${notifications.length}`
        );
      } else {
        console.log("Pending notifications:", notifications.length);
      }

      return notifications;
    } catch (error) {
      console.warn(
        "Failed to get pending notifications:",
        error?.message || error
      );
      return [];
    }
  }

  cleanup() {
    try {
      if (this.notificationListener) {
        Notifications.removeNotificationSubscription(this.notificationListener);
        this.notificationListener = null;
      }
      if (this.responseListener) {
        Notifications.removeNotificationSubscription(this.responseListener);
        this.responseListener = null;
      }
      this.isInitialized = false;
      this.initializationPromise = null;
      console.log("NotificationService cleaned up");
    } catch (error) {
      console.warn(
        "Error during notification cleanup:",
        error?.message || error
      );
    }
  }

  // 🧪 TESTING METHODS - Add these for easy testing
  async testNotification() {
    try {
      await this.scheduleNotification(
        "🧪 Test Notification",
        "This is a test notification to verify everything works!",
        { type: "test" },
        { seconds: 2 }
      );
      console.log("Test notification scheduled");
    } catch (error) {
      console.warn("Test notification failed:", error?.message || error);
    }
  }

  async testBillReminder() {
    try {
      await this.scheduleNotification(
        "💰 Test Bill Reminder",
        "Your Netflix subscription of $15.99 is due in 3 days",
        { type: "bill_reminder", billName: "Netflix" },
        { seconds: 3 }
      );
      console.log("Test bill reminder scheduled");
    } catch (error) {
      console.warn("Test bill reminder failed:", error?.message || error);
    }
  }

  async testMilestone() {
    try {
      await this.scheduleNotification(
        "🎉 Goal Milestone!",
        "Amazing! You've reached 50% of your Vacation Fund goal!",
        { type: "milestone", milestone: 50 },
        { seconds: 5 }
      );
      console.log("Test milestone notification scheduled");
    } catch (error) {
      console.warn("Test milestone failed:", error?.message || error);
    }
  }
}

export default new NotificationService();
