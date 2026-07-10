const express = require('express');
const auth = require('../middleware/auth');
const roleGuard = require('../middleware/roleGuard');
const adminController = require('../controllers/admin.controller');

const router = express.Router();

router.use(auth, roleGuard('admin'));

router.get('/dashboard', adminController.getDashboardStats);
router.post('/doctors', adminController.createDoctor);
router.get('/doctors', adminController.listDoctors);
router.get('/doctors/:doctorId', adminController.getDoctor);
router.patch('/doctors/:doctorId', adminController.updateDoctor);
router.post('/doctors/:doctorId/leave', adminController.addLeaveDay);
router.delete('/doctors/:doctorId/leave/:leaveId', adminController.removeLeaveDay);

module.exports = router;

