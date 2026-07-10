const AppError = require('../utils/AppError');

const isAppointmentDuplicateKey = (err) => {
  if (err.code !== 11000) return false;

  const collectionName =
    err.collection?.collectionName ||
    err.collection?.name ||
    (typeof err.message === 'string' && err.message.match(/collection:\s*(\S+)/)?.[1]);

  return collectionName === 'appointments';
};

const errorHandler = (err, req, res, next) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      ...(err.code && { code: err.code }),
    });
  }

  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors)
      .map((e) => e.message)
      .join(', ');
    return res.status(400).json({ success: false, message });
  }

  if (err.code === 11000) {
    if (isAppointmentDuplicateKey(err)) {
      return res.status(409).json({
        success: false,
        message: 'Slot already taken',
        code: 'SLOT_CONFLICT',
      });
    }
    return res.status(409).json({
      success: false,
      message: 'Duplicate key error',
    });
  }

  console.error(err);
  return res.status(500).json({
    success: false,
    message: 'Internal server error',
  });
};

module.exports = errorHandler;
