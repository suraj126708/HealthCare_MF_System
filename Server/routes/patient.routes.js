const express = require('express');
const auth = require('../middleware/auth');
const roleGuard = require('../middleware/roleGuard');
const { slotHoldLimiter } = require('../middleware/rateLimiter');
const patientController = require('../controllers/patient.controller');

const router = express.Router();

router.use(auth, roleGuard('patient'));

router.get('/doctors', patientController.listDoctors);
router.get('/doctors/:doctorId/availability', patientController.getAvailability);

router.post('/appointments/hold', slotHoldLimiter, patientController.hold);
router.post('/appointments/:id/symptoms', patientController.symptoms);
router.post('/appointments/:id/confirm', patientController.confirm);
router.delete('/appointments/:id', patientController.cancel);

router.get('/appointments', patientController.listAppointments);
router.get('/appointments/:id', patientController.getAppointment);

router.get('/medications', patientController.listMedications);

module.exports = router;

