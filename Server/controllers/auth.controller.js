const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

const ACCESS_EXPIRES_IN = '15m';
const REFRESH_EXPIRES_IN = '7d';

function sha256(input) {
  return crypto.createHash('sha256').update(input).digest('hex');
}

function signAccessToken(user) {
  return jwt.sign(
    { id: user._id.toString(), role: user.role, name: user.name },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: ACCESS_EXPIRES_IN }
  );
}

function signRefreshToken(user) {
  return jwt.sign({ id: user._id.toString() }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: REFRESH_EXPIRES_IN,
  });
}

function setRefreshCookie(res, token) {
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

function clearRefreshCookie(res) {
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
  });
}

exports.register = asyncHandler(async (req, res, next) => {
  const { name, email, password, phone } = req.body || {};

  if (!name || !email || !password) {
    return next(new AppError(400, 'name, email, password are required'));
  }

  const existing = await User.findOne({ email: String(email).toLowerCase() });
  if (existing) return next(new AppError(409, 'Email already in use'));

  const passwordHash = await bcrypt.hash(String(password), 10);
  const user = await User.create({
    name,
    email: String(email).toLowerCase(),
    passwordHash,
    role: 'patient',
    phone,
  });

  res.status(201).json({
    success: true,
    data: {
      user: { id: user._id.toString(), name: user.name, role: user.role },
    },
  });
});

exports.login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return next(new AppError(400, 'email and password are required'));
  }

  const user = await User.findOne({ email: String(email).toLowerCase() });
  if (!user) return next(new AppError(401, 'Invalid credentials'));
  if (user.isActive === false) return next(new AppError(403, 'Account disabled'));

  const ok = await bcrypt.compare(String(password), user.passwordHash);
  if (!ok) return next(new AppError(401, 'Invalid credentials'));

  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);

  user.refreshTokenHash = sha256(refreshToken);
  await user.save();

  setRefreshCookie(res, refreshToken);

  res.json({
    success: true,
    data: {
      user: { id: user._id.toString(), name: user.name, role: user.role },
      accessToken,
    },
  });
});

exports.refresh = asyncHandler(async (req, res, next) => {
  const token = req.cookies?.refreshToken;
  if (!token) return next(new AppError(401, 'Missing refresh token'));

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  } catch {
    return next(new AppError(401, 'Invalid refresh token'));
  }

  const user = await User.findById(decoded.id);
  if (!user) return next(new AppError(401, 'Invalid refresh token'));
  if (!user.refreshTokenHash) return next(new AppError(401, 'Logged out'));
  if (user.refreshTokenHash !== sha256(token)) {
    return next(new AppError(401, 'Invalid refresh token'));
  }

  const newAccessToken = signAccessToken(user);
  const newRefreshToken = signRefreshToken(user);

  user.refreshTokenHash = sha256(newRefreshToken);
  await user.save();

  setRefreshCookie(res, newRefreshToken);

  res.json({
    success: true,
    data: {
      user: { id: user._id.toString(), name: user.name, role: user.role },
      accessToken: newAccessToken,
    },
  });
});

exports.logout = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  if (user) {
    user.refreshTokenHash = null;
    await user.save();
  }
  clearRefreshCookie(res);
  res.json({ success: true, message: 'Logged out' });
});

