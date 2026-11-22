import { Router } from 'express';
import {
  getGoals,
  createGoal,
  updateGoal,
  deleteGoal
} from '../controllers/goalController';
import { authenticate } from '../middleware/auth';
import { checkDbReady } from '../middleware/checkDbReady';
import { validateObjectId } from '../middleware/validateObjectId';

const router = Router();

router.use(checkDbReady);
router.use(authenticate);

router.get('/', getGoals);
router.post('/', createGoal);
router.patch('/:id', validateObjectId('id'), updateGoal);
router.delete('/:id', validateObjectId('id'), deleteGoal);

export default router;
