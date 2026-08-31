import { Router } from "express";
import {
  getTransactions,
  createTransaction,
  createBulkTransactions,
  updateTransaction,
  deleteTransaction,
  getTransactionCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from "../controllers/transaction.controller";
import { protect, authorize } from "../middlewares/auth";

const router = Router();

router.use(protect);
router.use(authorize("gastos"));

router.route("/categories").get(getTransactionCategories).post(createCategory);

router.route("/categories/:id").put(updateCategory).delete(deleteCategory);

router.post("/bulk", createBulkTransactions);

router.route("/").get(getTransactions).post(createTransaction);

router.route("/:id").put(updateTransaction).delete(deleteTransaction);

export default router;
