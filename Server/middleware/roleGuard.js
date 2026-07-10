const AppError = require('../utils/AppError');

const roleGuard =
  (...roles) =>
  (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new AppError(403, 'Forbidden'));
    }
    next();
  };

module.exports = roleGuard;
