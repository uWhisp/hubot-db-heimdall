// Description:
//   Sets and resets user's vault tokens
//
// Commands:
//   hubot set vault token [for `user` ] `token` - Stores a user's vault token into the brain
//   hubot reset vault token [for `user` ] - Deletes a user's vault token from brain
//


/*
 * External dependencies
 */
var util = require('util');


module.exports = function(robot) {

  robot.respond(/set vault token(?: for (\w+))?[\s]+([\w\-]+)/i, function(msg) {
    var user;
    if (msg.match[1]) {
      // Reset token for another user
      if (!robot.auth.isAdmin(msg.envelope.user)) {
        return msg.reply(util.format(
          CONFIG.Strings.sorry_dave + ' Only admins can set vault tokens for other users.',
          msg.envelope.user.name
        ));
      }

      user = robot.brain.userForId(msg.match[1]);
    } else {
      // Reset token for current user
      user = robot.brain.userForId(msg.envelope.user.id);
    }

    // Initialize Creds object if not already
    if (typeof(user.Creds) !== 'object') {
      user.Creds = {};
    }
    user.Creds.vault_token = msg.match[2];

    msg.reply(util.format('I\'ve stored %s vault token for future use', msg.match[1] || 'your'));
  });

  robot.respond(/reset vault token(?: for (\w+))?$/i, function(msg) {
    var user;
    if (msg.match[1]) {
      // Reset token for another user
      if (!robot.auth.isAdmin(msg.envelope.user)) {
        return msg.reply(util.format(
          CONFIG.Strings.sorry_dave + ' Only admins can reset vault tokens for other users.',
          msg.envelope.user.name
        ));
      }

      user = robot.brain.userForId(msg.match[1]);
    } else {
      // Reset token for current user
      user = robot.brain.userForId(msg.envelope.user.id);
    }

    if (typeof(user.Creds) === 'object') {
      delete(user.Creds.vault_token);
    }

    msg.reply(util.format('I\'ve nuked %s vault token', msg.match[1] || 'your'));
  });

};
