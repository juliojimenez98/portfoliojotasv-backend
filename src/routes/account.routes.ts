import { Router } from 'express';
import {
  getAccounts,
  getAccount,
  createAccount,
  updateAccount,
  deleteAccount,
  depositToAccount,
  transferBetweenAccounts,
} from '../controllers/account.controller';
import { protect, authorize } from '../middlewares/auth';

const router = Router();

// Protect all routes and require 'gastos' app access
router.use(protect);
router.use(authorize('gastos'));

// Transfer (must be before /:id routes)
router.post('/transfer', transferBetweenAccounts);

router.route('/')
  .get(getAccounts)
  .post(createAccount);

router.route('/:id')
  .get(getAccount)
  .put(updateAccount)
  .delete(deleteAccount);

// Deposit
router.post('/:id/deposit', depositToAccount);

export default router;
