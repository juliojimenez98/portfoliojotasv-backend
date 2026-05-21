import { Router } from 'express';
import {
  getAccounts,
  getAccount,
  createAccount,
  updateAccount,
  deleteAccount,
  depositToAccount,
  transferBetweenAccounts,
  recalculateBalances,
  previewRoundBalances,
} from '../controllers/account.controller';
import { protect, authorize } from '../middlewares/auth';

const router = Router();

// Protect all routes and require 'gastos' app access
router.use(protect);
router.use(authorize('gastos'));

// Transfer (must be before /:id routes)
router.post('/transfer', transferBetweenAccounts);

// Recalculate all balances from transactions (fix drift)
router.get('/recalculate-balances/preview', previewRoundBalances);
router.post('/recalculate-balances', recalculateBalances);

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
