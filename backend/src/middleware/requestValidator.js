function validateRegistration(req, res, next) {
  const { email, password, fullName } = req.body;

  if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return res.status(400).json({
      success: false,
      error: 'VALIDATION_ERROR',
      message: 'A valid email address is required.'
    });
  }

  if (!password || typeof password !== 'string' || password.length < 8) {
    return res.status(400).json({
      success: false,
      error: 'VALIDATION_ERROR',
      message: 'Password must be at least 8 characters long.'
    });
  }

  if (!fullName || typeof fullName !== 'string' || fullName.trim().length === 0) {
    return res.status(400).json({
      success: false,
      error: 'VALIDATION_ERROR',
      message: 'Full name is required.'
    });
  }

  next();
}

function validateLogin(req, res, next) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      error: 'VALIDATION_ERROR',
      message: 'Email and password are required.'
    });
  }

  next();
}

function validateChatMessage(req, res, next) {
  const { message } = req.body;

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return res.status(400).json({
      success: false,
      error: 'VALIDATION_ERROR',
      message: 'Message content cannot be empty.'
    });
  }

  if (message.length > 2000) {
    return res.status(400).json({
      success: false,
      error: 'PAYLOAD_TOO_LARGE',
      message: 'Message exceeds the maximum allowable length of 2000 characters.'
    });
  }

  next();
}

module.exports = {
  validateRegistration,
  validateLogin,
  validateChatMessage
};
