'use strict';

const clientErrorService = require('../services/client-error.service');
const { success } = require('../../common/utils/response');

exports.report = async (req, res, next) => {
  try {
    const { message, stack, url, component, userId, extra } = req.body;
    await clientErrorService.report({
      message,
      stack,
      url,
      component,
      userId: userId || (req.user && req.user.userId),
      extra,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
    res.json(success({ received: true }));
  } catch (err) {
    next(err);
  }
};
