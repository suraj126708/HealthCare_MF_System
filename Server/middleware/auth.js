const jwt = require('jsonwebtoken');
const AppError = require('../utils/AppError');

const auth = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return next(new AppError(401, 'Authentication required'));
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    req.user = decoded;
    next();
  } catch {
    next(new AppError(401, 'Invalid or expired token'));
  }
};

module.exports = auth;
