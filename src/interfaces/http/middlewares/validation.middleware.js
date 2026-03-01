const Joi = require('joi');
const { ErrorResponse } = require('./error.middleware');

const validate = (schema) => (req, res, next) => {
    const { value, error } = schema.validate(req.body, { abortEarly: false });

    if (error) {
        const errorMessage = error.details.map((detail) => detail.message).join(', ');
        return next(new ErrorResponse(errorMessage, 400));
    }

    Object.assign(req, value);
    next();
};

module.exports = validate;
