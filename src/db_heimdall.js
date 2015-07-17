// Description:
//   Grants temporary acces to MySQL databases
//
// Commands:
//   hubot give me [ `read` | `write` | `admin` ] access to `environment` database - Gives you temporary credentials to access the `environment` database
//

/*
 * External dependencies
 */
var util = require('util');
var pkg = require('../package.json');
var CONFIG = require('config').get(pkg.name);
var uuid = require('node-uuid');
var crypto = require('crypto');
var swig = require('swig');


/*
 * Internal dependencies
 */
var heimdall = require('../lib/db_heimdall');


var SecGroupForVaultPath = {
  db_production: 'db-uwhisp-production',
  db_test: 'db-uwhisp-test'
};


module.exports = function(robot) {

  var searchDb = function(db_name) {
    for (var i in CONFIG.Databases) {
      if (CONFIG.Databases[i].matcher.test(db_name)) {
        return CONFIG.Databases[i];
      }
    }
    return null;
  };

  var checkVaultRole = function(db, role) {
    for (var i in db.vault_roles) {
      if (db.vault_roles[i].matcher.test(role)) {
        return db.vault_roles[i].name;
      }
    }
    return null;
  };

  // Setup robot http render engine
  if (robot.router.engine) {
    // In test environment, we don't have an http server so this methods won't work
    robot.router.engine('html', swig.renderFile);
    robot.router.set('view engine', 'html');
    robot.router.set('views', __dirname + '/../views');
    robot.router.set('view cache', false);
  }

  // Register tasker to the robot instance
  require('../lib/tasker')(robot);

  // Setup db_heimdall module with the robot instance
  heimdall.setup(robot);

  robot.router.get('/heimdall/access/:nonce', function(req, res) {
    // Ignore robots
    if (req.headers['user-agent'].match(/Slackbot/i) !== null) {
      return res.send(200);
    }

    // Check if DB access request is genuine
    var brain_key = util.format('heimdall_access_%s', req.params.nonce);
    var access_request = robot.brain.get(brain_key);

    if (typeof(access_request) !== 'object' || access_request === null) {
      // Not found
      return res.render('not_found');
    }

    // Get client ip
    var ip = req.connection.remoteAddress; // fallback
    if (req.headers['x-real-ip'] !== undefined) { // 1st choice
      ip = req.headers['x-real-ip'].replace(/ /g, '');
    } else if (req.headers['x-forwarded-for'] !== undefined) { // 2nd choice
      ip = req.headers['x-forwarded-for'].split(',')[0].replace(/ /g, '');
    }

    // Append the CIDRIP notation
    ip += '/32';

    // Compute the ttl according the duration of the vault lease
    var ttl = (access_request.lease_duration * 1000) - (new Date().getTime() - access_request.requested);
    if (ttl < 0) {
      // Obsolete request
      res.render('not_found');
    } else {
      heimdall.allowAccessToIp({
        DBSecurityGroupName: access_request.rds_security_group,
        CIDRIP: ip,
        ttl: ttl
      }, function(err) {
        if (err) {
          res.render('error', { error: util.inspect(err) });
        } else {
          res.render('ip_success', { ip: ip, ttl: util.format('%d minutes', Math.floor(ttl / 60000)) });
        }
      });
    }

    // Remove access request from brain
    robot.brain.remove(brain_key);
  });

  robot.respond(/give me (\w+) access to (\w+) (?:database|db)/i, function(msg) {
    // Check if the user has a vault token
    if (msg.envelope.user.Creds === undefined || msg.envelope.user.Creds.vault_token === undefined) {
      return msg.send(util.format(
        CONFIG.Strings.sorry_dave +
        '\nI need your vault token in order to do this.\nYou should ask your beloved sysadmin ;)',
        msg.envelope.user.name
      ));
    }

    // First check the corresponding database
    var db = searchDb(msg.match[2]);
    if (db === null) {
      // TODO: print available databases
      return msg.send(util.format(
        CONFIG.Strings.sorry_dave + '\nUnknown database *%s*.',
        msg.envelope.user.name,
        msg.match[2]
      ));
    }

    // Now check the access level requested for this database
    var role = checkVaultRole(db, msg.match[1]);
    if (role === null) {
      // TODO: print available vault roles
      return msg.send(util.format(
        CONFIG.Strings.sorry_dave + '\nUnknown access level *%s*.',
        msg.envelope.user.name,
        msg.match[1]
      ));
    }

    // Request the credentials to vault
    // vault read mysql/creds/readonly
    var url = util.format(
      '%s/v1/%s/creds/%s',
      CONFIG.Urls.vault_base_url,
      db.vault_mount,
      role
    );

    robot.http(url)
    .header('X-Vault-Token', msg.envelope.user.Creds.vault_token)
    .get()(function(err, res, body) {
      // Unknown error handler
      var unknownError = function() {
        msg.reply('An error occurred talking to vault, please try again in a few moments');

        if (res && res.statusCode) msg.reply('Status code: ' + res.statusCode);
        if (err) msg.reply('Error: ' + err);
        if (body) msg.reply('Body: ' + body);
      };

      if (err) {
        return unknownError();
      }

      if (res.statusCode === 401 || res.statusCode === 400 || res.statusCode === 404) {
        return msg.send(util.format(
          CONFIG.Strings.sorry_dave + '\nYou\'re not authorized to request *%s* access to *%s* database',
          msg.envelope.user.name,
          role,
          db.name
        ));
      } else if (res.statusCode === 503) {
        return msg.send(util.format(
          CONFIG.Strings.sorry_dave + '\nVault is sealed and I cannot retreave any data from it',
          msg.envelope.user.name
        ));
      } else if (res.statusCode > 299) {
        return unknownError();
      }// else if (res.statusCode >= 200 && res.statusCode <= 299)

      // Build the response based on the fields returned by vault
      var response = [ 'Here ya go:' ];

      var parsedBody;
      try {
        parsedBody = JSON.parse(body);
      } catch (e) {
        return msg.reply('An error occurred parsing the vault response', body);
      }

      var parse = function(data) {
        for (var k in data) {
          if (data.hasOwnProperty(k)) {
            if (typeof(data[k]) === 'object') {
              // Parse recursively
              parse(data[k]);
            } else {
              if (k === 'username' || k === 'password') {
                response.push('*' + k + '*: ' + data[k]);
              } else {
                response.push(k + ': ' + data[k]);
              }
            }
          }
        }
      };

      // For now this will be sync as only small data will be parsed
      parse(parsedBody);

      robot.send({ room: msg.envelope.user.name }, response.join('\n'));

      // Send a link to enable IP access to DB
      var nonce = crypto.createHash('sha256').update(uuid.v4(), 'utf8').digest('hex');
      robot.brain.set(util.format('heimdall_access_%s', nonce), {
        rds_security_group: db.rds_security_group,
        requested: new Date().getTime(),
        lease_duration: parsedBody.lease_duration
      });

      robot.send(
        { room: msg.envelope.user.name },
        'Direct your browser here to enable access to DB from your current IP address\n' +
        CONFIG.Urls.base_url + 'heimdall/access/' + nonce
      );

      if (msg.envelope.room !== robot.brain.userForId(msg.envelope.user.id).room) {
        msg.reply('I\'ve sent the access credentials in a private chat');
      }
    });
  });

};
