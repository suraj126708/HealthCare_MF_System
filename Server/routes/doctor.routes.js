const express = require('express');
const auth = require('../middleware/auth');
const roleGuard = require('../middleware/roleGuard');
const doctorController = require('../controllers/doctor.controller');

const router = express.Router();

router.use(auth, roleGuard('doctor'));

router.get('/appointments', doctorController.listAppointments);
router.get('/appointments/:id', doctorController.getAppointment);
router.post('/appointments/:id/complete', doctorController.completeAppointment);
router.post('/leave', doctorController.addLeaveDay);
router.get('/profile', doctorController.getProfile);

module.exports = router;

