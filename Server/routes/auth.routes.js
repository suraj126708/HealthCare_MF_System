const express = require('express');
const { authLimiter } = require('../middleware/rateLimiter');
const auth = require('../middleware/auth');
const authController = require('../controllers/auth.controller');

const router = express.Router();

router.post('/register', authLimiter, authController.register);
router.post('/login', authLimiter, authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', auth, authController.logout);

module.exports = router;

