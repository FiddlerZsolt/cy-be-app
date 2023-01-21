const { MoleculerError } = require("moleculer").Errors;

class UserWarningError extends MoleculerError {
  constructor(msg, code, data) {
    super(msg || `User warning error.`, code || 500, "USER_WARNING_ERROR", data);
  }
}

module.exports = UserWarningError;
