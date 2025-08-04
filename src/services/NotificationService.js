import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform, Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Configure notification handler
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
    this.initializationPromise = null; // Track initialization promise
  }

  async initialize() {
    try {
      // Prevent multiple initializations and return existing promise if already initializing
      if (this.isInitialized) {
        return;
      }

      if (this.initializationPromise) {
        return this.initializationPromise;
      }

      // Create initialization promise
      this.initializationPromise = this._performInitialization();
      await this.initializationPromise;
    } catch (error) {
      console.warn("NotificationService initialization failed:", error.message);
      this.initializationPromise = null; // Reset so we can try again
      // Don't throw the error - just log it and continue
    }
  }

  async _performInitialization() {
    await this.registerForPushNotificationsAsync();
    this.setupNotificationListeners();
    this.isInitialized = true;
    console.log("NotificationService initialized successfully");
  }

  async registerForPushNotificationsAsync() {
    try {
      let token;

      // Check if running on physical device first
      if (!Device.isDevice) {
        console.log(
          "Push notifications are only available on physical devices. Skipping notification setup for simulator."
        );
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
            channelError.message
          );
        }
      }

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
          return null;
        }

        const tokenData = await Notifications.getExpoPushTokenAsync({
          projectId: "your-expo-project-id", // Add your Expo project ID here
        });
        token = tokenData.data;
        this.expoPushToken = token;

        // Save token with error handling
        try {
          await AsyncStorage.setItem("expoPushToken", token);
        } catch (storageError) {
          console.warn("Could not save push token:", storageError.message);
        }
      } catch (permissionError) {
        console.warn(
          "Error getting notification permissions:",
          permissionError.message
        );
      }

      return token;
    } catch (error) {
      console.warn("Error registering for push notifications:", error.message);
      return null;
    }
  }

  setupNotificationListeners() {
    try {
      // Clean up existing listeners first
      this.cleanup();

      this.notificationListener = Notifications.addNotificationReceivedListener(
        (notification) => {
          try {
            console.log(
              "Notification received:",
              notification.request.identifier
            );
            this.handleNotificationReceived(notification);
          } catch (error) {
            console.warn("Error handling notification:", error.message);
          }
        }
      );

      this.responseListener =
        Notifications.addNotificationResponseReceivedListener((response) => {
          try {
            console.log(
              "Notification response:",
              response.notification.request.identifier
            );
            this.handleNotificationResponse(response);
          } catch (error) {
            console.warn(
              "Error handling notification response:",
              error.message
            );
          }
        });
    } catch (error) {
      console.warn("Error setting up notification listeners:", error.message);
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
      console.warn("Error processing notification:", error.message);
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
      console.warn("Error handling notification response:", error.message);
    }
  }

  handleMilestoneNotification(data) {
    try {
      console.log("Milestone achieved!", data);
    } catch (error) {
      console.warn("Error handling milestone notification:", error.message);
    }
  }

  handleBillReminder(data) {
    try {
      console.log("Bill reminder:", data);
    } catch (error) {
      console.warn("Error handling bill reminder:", error.message);
    }
  }

  handleGoalUpdate(data) {
    try {
      console.log("Goal update:", data);
    } catch (error) {
      console.warn("Error handling goal update:", error.message);
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

      // Only schedule notifications on physical devices
      if (!Device.isDevice) {
        console.log("Skipping notification scheduling on simulator");
        return null;
      }

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
      console.warn("Failed to schedule notification:", error.message);
      return null;
    }
  }

  async scheduleBillReminder(billName, amount, daysUntilDue, formatCurrency) {
    try {
      if (daysUntilDue <= 0 || !this.isInitialized || !Device.isDevice)
        return [];

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
      console.warn("Error scheduling bill reminders:", error.message);
      return [];
    }
  }

  async checkGoalMilestones(goals, transactions, formatCurrency) {
    try {
      if (
        !goals ||
        goals.length === 0 ||
        !this.isInitialized ||
        !Device.isDevice
      )
        return;

      for (const goal of goals) {
        try {
          const progress = this.calculateGoalProgress(goal, transactions);
          const milestones = [25, 50, 75, 90, 100];

          for (const milestone of milestones) {
            try {
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
            } catch (storageError) {
              console.warn(
                "Error checking milestone storage:",
                storageError.message
              );
            }
          }
        } catch (goalError) {
          console.warn("Error processing goal:", goalError.message);
        }
      }
    } catch (error) {
      console.warn("Error checking goal milestones:", error.message);
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
      console.warn("Error calculating goal progress:", error.message);
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
      console.warn("Error sending milestone notification:", error.message);
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
      console.warn("Error showing milestone celebration:", error.message);
    }
  }

  async sendSmartInsights(transactions, goals, monthlyIncome, formatCurrency) {
    try {
      if (!this.isInitialized || !Device.isDevice) return;

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
      console.warn("Error sending smart insights:", error.message);
    }
  }

  generateSmartInsights(transactions, goals, monthlyIncome, formatCurrency) {
    try {
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

      return insights;
    } catch (error) {
      console.warn("Error generating smart insights:", error.message);
      return [];
    }
  }

  async scheduleWeeklySummary() {
    try {
      if (!this.isInitialized || !Device.isDevice) return;

      await this.scheduleNotification(
        "📊 Weekly Financial Summary",
        "Your FLOWZI weekly report is ready! See how you did this week.",
        {
          type: "weekly_summary",
          week: Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000)),
        },
        { weekday: 1, hour: 18, minute: 0, repeats: true }
      );
    } catch (error) {
      console.warn("Error scheduling weekly summary:", error.message);
    }
  }

  async cancelNotification(notificationId) {
    try {
      if (!notificationId) return;
      await Notifications.cancelScheduledNotificationAsync(notificationId);
      console.log("Notification cancelled:", notificationId);
    } catch (error) {
      console.warn("Failed to cancel notification:", error.message);
    }
  }

  async cancelAllNotifications() {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log("All notifications cancelled");
    } catch (error) {
      console.warn("Failed to cancel all notifications:", error.message);
    }
  }

  async getPendingNotifications() {
    try {
      const notifications =
        await Notifications.getAllScheduledNotificationsAsync();
      console.log("Pending notifications:", notifications.length);
      return notifications;
    } catch (error) {
      console.warn("Failed to get pending notifications:", error.message);
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
      console.warn("Error during notification cleanup:", error.message);
    }
  }
}

export default new NotificationService();
