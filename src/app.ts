import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import dotenv from "dotenv";
import "express-async-errors"; // Handles async errors in Express 4
import { connectDB } from "./config/db";
import { runMigrations } from "./config/migrate";
import authRoutes from "./routes/auth.routes";
import accountRoutes from "./routes/account.routes";
import transactionRoutes from "./routes/transaction.routes";
import subscriptionRoutes from "./routes/subscription.routes";
import userRoutes from "./routes/user.routes";
import currencyRoutes from "./routes/currency.routes";
import profileRoutes from "./routes/profile.routes";
import periodRoutes from "./routes/period.routes";
import { checkAndSendPaydayEmails } from "./services/paydayScheduler";

dotenv.config();

// Connect to database
connectDB().then(() => {
  // Execute database migrations/seeds once DB is connected
  runMigrations().then(() => {
    // Start payday scheduler check on startup, then check every 6 hours
    checkAndSendPaydayEmails();
    setInterval(checkAndSendPaydayEmails, 6 * 60 * 60 * 1000);
  });
});

const app = express();

// Middleware
app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/accounts", accountRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/subscriptions", subscriptionRoutes);
app.use("/api/users", userRoutes);
app.use("/api/currency", currencyRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/periods", periodRoutes);

// Basic route
app.get("/api/health", (req: Request, res: Response) => {
  res.status(200).json({ status: "ok", message: "Backend is running" });
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error: err.message || "Server Error",
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(
    `Server running in ${process.env.NODE_ENV || "development"} mode on port ${PORT}`,
  );
});
