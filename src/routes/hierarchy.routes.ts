// src/routes/hierarchy.routes.ts
import { Router } from 'express';
import { getMyHierarchy } from '../controllers/hierarchy.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

/**
 * @route   GET /api/hierarchy/my-hierarchy
 * @desc    Get current employee's organizational hierarchy
 * @access  Private (Any authenticated employee)
 */
router.get('/my-hierarchy', authenticate, getMyHierarchy);

export default router;
