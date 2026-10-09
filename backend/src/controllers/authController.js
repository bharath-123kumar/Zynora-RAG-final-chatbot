const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/dbClient');
const config = require('../config/env');
const logger = require('../utils/logger');

async function register(req, res) {
  const { email, password, fullName, role } = req.body;
  const userRole = role === 'admin' ? 'admin' : 'user';

  try {
    const existing = await db.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase().trim()]);
    if (existing.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'USER_EXISTS',
        message: 'An account with this email address already exists.'
      });
    }

    const saltRounds = config.BCRYPT_SALT_ROUNDS;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    const userId = uuidv4();
    const now = new Date().toISOString();

    await db.query(
      `INSERT INTO users (id, email, password_hash, full_name, role, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [userId, email.toLowerCase().trim(), passwordHash, fullName.trim(), userRole, now, now]
    );

    const token = jwt.sign(
      { id: userId, email: email.toLowerCase().trim(), role: userRole, fullName: fullName.trim() },
      config.JWT_SECRET,
      { expiresIn: config.JWT_EXPIRES_IN }
    );

    await logger.audit({
      db,
      userId,
      action: 'USER_REGISTRATION',
      module: 'AUTH',
      status: 'SUCCESS',
      ipAddress: req.ip,
      traceId: req.traceId,
      details: { email: email.toLowerCase().trim(), role: userRole }
    });

    return res.status(201).json({
      success: true,
      message: 'Account registered successfully.',
      token,
      user: {
        id: userId,
        email: email.toLowerCase().trim(),
        fullName: fullName.trim(),
        role: userRole
      }
    });
  } catch (err) {
    logger.error({
      action: 'USER_REGISTRATION_ERROR',
      module: 'AUTH',
      errorCode: 'REGISTRATION_FAILED',
      traceId: req.traceId,
      error: err
    });
    return res.status(500).json({
      success: false,
      error: 'REGISTRATION_FAILED',
      message: 'Failed to create user account.'
    });
  }
}

async function login(req, res) {
  const { email, password } = req.body;

  try {
    const userRes = await db.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase().trim()]);
    if (userRes.rows.length === 0) {
      await logger.audit({
        db,
        userId: null,
        action: 'LOGIN_FAILURE',
        module: 'AUTH',
        status: 'FAILED',
        ipAddress: req.ip,
        traceId: req.traceId,
        details: { reason: 'User not found' }
      });
      return res.status(401).json({
        success: false,
        error: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password.'
      });
    }

    const user = userRes.rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      await logger.audit({
        db,
        userId: user.id,
        action: 'LOGIN_FAILURE',
        module: 'AUTH',
        status: 'FAILED',
        ipAddress: req.ip,
        traceId: req.traceId,
        details: { reason: 'Incorrect password' }
      });
      return res.status(401).json({
        success: false,
        error: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password.'
      });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, fullName: user.full_name },
      config.JWT_SECRET,
      { expiresIn: config.JWT_EXPIRES_IN }
    );

    await logger.audit({
      db,
      userId: user.id,
      action: 'LOGIN_SUCCESS',
      module: 'AUTH',
      status: 'SUCCESS',
      ipAddress: req.ip,
      traceId: req.traceId,
      details: { role: user.role }
    });

    return res.status(200).json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role
      }
    });
  } catch (err) {
    logger.error({
      action: 'LOGIN_ERROR',
      module: 'AUTH',
      errorCode: 'LOGIN_FAILED',
      traceId: req.traceId,
      error: err
    });
    return res.status(500).json({
      success: false,
      error: 'LOGIN_FAILED',
      message: 'Failed to process login request.'
    });
  }
}

async function getMe(req, res) {
  try {
    const userRes = await db.query('SELECT id, email, full_name, role, created_at FROM users WHERE id = $1', [req.user.id]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'USER_NOT_FOUND',
        message: 'User account does not exist.'
      });
    }
    return res.status(200).json({
      success: true,
      user: userRes.rows[0]
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'Failed to fetch user profile.'
    });
  }
}

module.exports = {
  register,
  login,
  getMe
};
