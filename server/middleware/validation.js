// Input sanitization middleware
function sanitizeInput(req, res, next) {
  if (req.body) {
    sanitizeObject(req.body);
  }
  if (req.query) {
    sanitizeObject(req.query);
  }
  if (req.params) {
    sanitizeObject(req.params);
  }
  next();
}

function sanitizeObject(obj) {
  for (const key in obj) {
    if (typeof obj[key] === 'string') {
      // Remove null bytes
      obj[key] = obj[key].replace(/\0/g, '');
      // Trim whitespace
      obj[key] = obj[key].trim();
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      sanitizeObject(obj[key]);
    }
  }
}

// Validate pagination params
function validatePagination(req, res, next) {
  if (req.query.page) {
    req.query.page = Math.max(1, parseInt(req.query.page) || 1);
  }
  if (req.query.limit) {
    req.query.limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
  }
  next();
}

module.exports = { sanitizeInput, validatePagination };
