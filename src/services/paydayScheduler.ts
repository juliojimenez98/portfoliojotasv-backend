import User, { PaydayConfig } from "../models/User";
import SpendPeriod from "../models/SpendPeriod";
import { sendPaydayReminderEmail } from "./email.service";

/**
 * Calculates if "today" is the payday for a given payday config.
 */
export function isPaydayToday(config: PaydayConfig, date: Date = new Date()): boolean {
  const day = date.getDate();
  const month = date.getMonth();
  const year = date.getFullYear();

  // Helper to get number of days in month
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Helper to check if a date is a weekend
  const isWeekend = (d: Date) => {
    const dayOfWeek = d.getDay();
    return dayOfWeek === 0 || dayOfWeek === 6; // 0 is Sunday, 6 is Saturday
  };

  // Helper to count business days in the month
  const getBusinessDays = () => {
    const list: Date[] = [];
    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(year, month, i);
      if (!isWeekend(d)) {
        list.push(d);
      }
    }
    return list;
  };

  switch (config.type) {
    case "first_day":
      return day === 1;

    case "first_business_day": {
      const bDays = getBusinessDays();
      return bDays.length > 0 && bDays[0].getDate() === day;
    }

    case "fixed_day": {
      // If config.fixedDay is e.g. 31, but the month has only 30 days, trigger on the last day of the month
      const targetDay = Math.min(config.fixedDay || 5, daysInMonth);
      return day === targetDay;
    }

    case "last_day":
      return day === daysInMonth;

    case "last_business_day": {
      const bDays = getBusinessDays();
      return bDays.length > 0 && bDays[bDays.length - 1].getDate() === day;
    }

    case "business_days_before_end": {
      const bDays = getBusinessDays();
      const countBefore = config.businessDaysBefore || 3;
      if (bDays.length >= countBefore) {
        const targetDate = bDays[bDays.length - countBefore];
        return targetDate.getDate() === day;
      }
      return false;
    }

    case "custom_text":
    default:
      // Can't reliably automate custom text descriptions, so return false
      return false;
  }
}

/**
 * Iterates through all users to check if it's their payday and sends an email notification
 * if they haven't started a SpendPeriod today/yesterday.
 */
export async function checkAndSendPaydayEmails() {
  try {
    const today = new Date();
    
    // Find all users who have configured a payday config
    const users = await User.find({ "paydayConfig.type": { $exists: true } });

    for (const user of users) {
      if (!user.paydayConfig) continue;

      // 1. Check if today is payday for this user
      if (!isPaydayToday(user.paydayConfig, today)) continue;

      // 2. Check if we already sent an email today to prevent duplicate spamming
      if (user.lastPaydayEmailSent) {
        const lastSent = new Date(user.lastPaydayEmailSent);
        if (lastSent.toDateString() === today.toDateString()) {
          continue; // Already sent today
        }
      }

      // 3. Check if they already started a new period today or yesterday
      const startOfYesterday = new Date(today);
      startOfYesterday.setDate(today.getDate() - 1);
      startOfYesterday.setHours(0, 0, 0, 0);

      const recentPeriod = await SpendPeriod.findOne({
        userId: user._id,
        startDate: { $gte: startOfYesterday },
      });

      if (recentPeriod) {
        // They already started a new period recently!
        continue;
      }

      // 4. Send the payday email notification
      console.log(`[PaydayScheduler] Enviando recordatorio de día de pago a ${user.email}`);
      await sendPaydayReminderEmail(user.email, user.username, user.paydayConfig)
        .catch((err) => {
          console.error(`[PaydayScheduler] Failed to send email to ${user.email}:`, err);
        });

      // 5. Update lastPaydayEmailSent timestamp and save
      user.lastPaydayEmailSent = new Date();
      await user.save();
    }
  } catch (error) {
    console.error("[PaydayScheduler] Error in checkAndSendPaydayEmails:", error);
  }
}
