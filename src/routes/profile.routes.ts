import { Router } from 'express';
import { getPaydayConfig, savePaydayConfig, deletePaydayConfig } from '../controllers/profile.controller';
import { protect } from '../middlewares/auth';

const router = Router();

router.use(protect);

router.route('/payday')
  .get(getPaydayConfig)
  .put(savePaydayConfig)
  .delete(deletePaydayConfig);

export default router;
