import { Router } from 'express';
import { getSubscriptions, createSubscription, updateSubscription, deleteSubscription } from '../controllers/subscription.controller';
import { protect, authorize } from '../middlewares/auth';

const router = Router();

router.use(protect);
router.use(authorize('gastos'));

router.route('/')
  .get(getSubscriptions)
  .post(createSubscription);

router.route('/:id')
  .put(updateSubscription)
  .delete(deleteSubscription);

export default router;
