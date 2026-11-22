import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import {
  getModelStatus,
  categorize,
  fraudCheck,
  getForecast,
  getSegmentation,
  recordCategoryCorrection,
  retrainModels
} from '../controllers/aiController';

const router = Router();

router.use(requireAuth);

router.get('/model-status', getModelStatus);
router.post('/categorize', categorize);
router.post('/fraud-check', fraudCheck);
router.get('/forecast', getForecast);
router.get('/segmentation', getSegmentation);
router.post('/category-correction', recordCategoryCorrection);
router.post('/retrain', retrainModels);

export default router;

