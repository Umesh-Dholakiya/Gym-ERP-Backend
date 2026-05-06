const Joi = require('joi');

// Validation schemas
const schemas = {
  // User registration/login validation
  userLogin: Joi.object({
    email: Joi.string()
      .email()
      .required()
      .messages({
        'string.email': 'Please provide a valid email',
        'any.required': 'Email is required'
      }),
    password: Joi.string()
      .min(6)
      .required()
      .messages({
        'string.min': 'Password must be at least 6 characters',
        'any.required': 'Password is required'
      })
  }),

  // Inquiry validation
  inquiryCreate: Joi.object({
    name: Joi.string()
      .trim()
      .max(50)
      .required()
      .messages({
        'string.max': 'Name cannot exceed 50 characters',
        'any.required': 'Name is required'
      }),
    phone: Joi.string()
      .pattern(/^[\+]?[1-9][\d]{0,15}$/)
      .required()
      .messages({
        'string.pattern.base': 'Please enter a valid phone number',
        'any.required': 'Phone number is required'
      }),
    email: Joi.string()
      .email()
      .required()
      .messages({
        'string.email': 'Please provide a valid email',
        'any.required': 'Email is required'
      }),
    service: Joi.string()
      .required()
      .min(1)
      .max(50)
      .pattern(/^(?:[0-9a-fA-F]{24}|\d+)$/, 'valid ObjectId or numeric ID')
      .messages({
        'any.required': 'Service selection is required',
        'string.min': 'Service ID must be at least 1 character',
        'string.max': 'Service ID cannot exceed 50 characters',
        'string.pattern.name': 'Service ID must be a valid ObjectId (24 hex characters) or numeric ID'
      }),
    message: Joi.string()
      .max(1000)
      .required()
      .messages({
        'string.max': 'Message cannot exceed 1000 characters',
        'any.required': 'Message is required'
      }),
    preferredTime: Joi.string()
      .required()
      .messages({
        'any.required': 'Preferred time is required'
      })
  }),

  // Service validation
  serviceCreate: Joi.object({
    name: Joi.string()
      .trim()
      .max(100)
      .required()
      .messages({
        'string.max': 'Service name cannot exceed 100 characters',
        'any.required': 'Service name is required'
      }),
    description: Joi.string()
      .max(500)
      .required()
      .messages({
        'string.max': 'Description cannot exceed 500 characters',
        'any.required': 'Description is required'
      }),
    price: Joi.number()
      .min(0)
      .required()
      .messages({
        'number.min': 'Price cannot be negative',
        'any.required': 'Price is required'
      }),
    duration: Joi.string()
      .trim()
      .required()
      .messages({
        'any.required': 'Duration is required'
      }),
    features: Joi.array()
      .items(Joi.string().trim())
      .min(1)
      .required()
      .messages({
        'array.min': 'At least one feature is required',
        'any.required': 'Features are required'
      }),
    category: Joi.string()
      .valid('membership', 'personal-training', 'group-class', 'special-offer', 'facility-access')
      .default('membership'),
    isActive: Joi.boolean()
      .default(true),
    imageUrl: Joi.string()
      .uri()
      .optional()
      .allow('')
  }),

  // Inquiry update validation
  inquiryUpdate: Joi.object({
    status: Joi.string()
      .valid('new', 'contacted', 'follow-up', 'converted', 'closed')
      .optional(),
    notes: Joi.string()
      .max(1000)
      .optional(),
    followUpDate: Joi.date()
      .optional(),
    assignedTo: Joi.string()
      .optional()
      .length(24)
      .hex(),
    service: Joi.string()
      .optional()
      .length(24)
      .hex(),
  }).min(1),

  // Service update validation
  serviceUpdate: Joi.object({
    name: Joi.string()
      .trim()
      .max(100)
      .optional(),
    description: Joi.string()
      .max(500)
      .optional(),
    price: Joi.number()
      .min(0)
      .optional(),
    duration: Joi.string()
      .trim()
      .optional(),
    features: Joi.array()
      .items(Joi.string().trim())
      .min(1)
      .optional(),
    category: Joi.string()
      .valid('membership', 'personal-training', 'group-class', 'special-offer', 'facility-access')
      .optional(),
    isActive: Joi.boolean()
      .optional(),
    sortOrder: Joi.number()
      .optional(),
    imageUrl: Joi.string()
      .uri()
      .optional()
      .allow('')
  }).min(1)
};

// Validation middleware factory
const validate = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, {
      abortEarly: false, // Return all errors
      stripUnknown: true  // Remove unknown properties
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors
      });
    }

    next();
  };
};

module.exports = {
  schemas,
  validate
};