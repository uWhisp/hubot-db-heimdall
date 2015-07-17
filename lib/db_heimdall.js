
/*
 * External dependencies
 */
var AWS = require('aws-sdk');
var util = require('util');
var _ = require('underscore');
var pkg = require('../package.json');
var CONFIG = require('config').get(pkg.name);

var Heimdall = function() {};

Heimdall.prototype.robot = null;

Heimdall.prototype.setup = function(robot) {
  if (this.robot !== null) return;

  this.robot = robot;

  // Register the access revokation task handler
  this.robot.tasker.registerTaskHandler('revokeDBAccess', function(task, cb) {
    new AWS.RDS({
      region: CONFIG.AWS.region,
      aws_access_key_id: CONFIG.AWS.aws_access_key_id,
      aws_secret_access_key: CONFIG.AWS.aws_secret_access_key
    }).revokeDBSecurityGroupIngress({
      DBSecurityGroupName: task.data.DBSecurityGroupName,
      CIDRIP: task.data.CIDRIP
    }, function(err, data) {
      if (err)  console.error('error', err);
      else      console.log('success', data);
      if (typeof(cb) === 'function') cb();
    });
  });
};

Heimdall.prototype.allowAccessToIp = function(opts, cb) {
  var self = this;

  var rds = new AWS.RDS({
    region: CONFIG.AWS.region,
    aws_access_key_id: CONFIG.AWS.aws_access_key_id,
    aws_secret_access_key: CONFIG.AWS.aws_secret_access_key
  });

  rds.describeDBSecurityGroups({
    DBSecurityGroupName: opts.DBSecurityGroupName
  }, function(err, data) {
    if (err) return cb(err);

    var task = {
      handler: 'revokeDBAccess',
      data: {
        DBSecurityGroupName: opts.DBSecurityGroupName,
        CIDRIP: opts.CIDRIP
      },
      ttl: opts.ttl
    };
    var scheduleTask = function() {
      // Revoke access in an hour
      self.robot.tasker.scheduleTask(task);
    };

    var present = _.find(data.DBSecurityGroups[0].IPRanges, function(ip) {
      return ip.CIDRIP === opts.CIDRIP;
    });

    if (present !== undefined) {
      cb();

      // extend current allowances for this IP
      var tasksToRemove = self.robot.tasker.findTasks(function(_task, _id) {
        return (task.handler === _task.handler &&
                task.data.DBSecurityGroupName === _task.data.DBSecurityGroupName &&
                task.data.CIDRIP === _task.data.CIDRIP);
      });

      if (tasksToRemove.length > 0) {
        tasksToRemove.forEach(function(taskToRemove) {
          self.robot.tasker.removeScheduledTask(taskToRemove.id);
        });

        scheduleTask();
      }
      // else
      // No other task to remove this IP
      // it means is was authorized outside of this bot,
      // so don't revoke it

      return;
    }

    // IP not currently authorized - go on

    rds.authorizeDBSecurityGroupIngress({
      DBSecurityGroupName: opts.DBSecurityGroupName,
      CIDRIP: opts.CIDRIP
    }, function(err) {
      if (err) return cb(err);

      cb();
      scheduleTask();
    });
  });
};


module.exports = new Heimdall();
