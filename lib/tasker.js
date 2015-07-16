
/*
 * External dependencies
 */
var _ = require('underscore');
var uuid = require('node-uuid');
var util = require('util');


var Tasker = function(robot) {
  var self = this;
  this.robot = robot;

  // Load tasks from robot's brain
  var firstTime = true;
  self.robot.brain.on('loaded', function() {
    if (firstTime) {
      firstTime = false;

      var current_tasks = self.robot.brain.get('tasker_tasks');
      if (typeof(current_tasks) === 'object' && current_tasks !== null) {
        self.recap(current_tasks);
      }
    }
  });

  self.robot.respond(/show tasks/i, function(msg) {
    msg.reply('this.tasks', util.inspect(self.tasks));
    msg.reply('brain tasks', util.inspect(self.robot.brain.get('tasker_tasks')));
  });
};

Tasker.prototype.robot = null;
Tasker.prototype.taskHandlers = {};
Tasker.prototype.tasks = {};

Tasker.prototype.recap = function(tasks) {
  var self = this;
  _.keys(tasks).forEach(function(id) {
    var ttl = (tasks[id].registered + tasks[id].ttl) - new Date().getTime();

    if (ttl <= 0) { // Task past due
      tasks[id].ttl = 1;
    } else { // Task due in the future
      tasks[id].ttl = ttl;
    }

    self._scheduleTask(tasks[id]);
  });
};

Tasker.prototype.registerTaskHandler = function(name, handler) {
  this.taskHandlers[name] = handler;
};

Tasker.prototype._scheduleTask = function(task, cb) {
  var self = this;
  var id = task.id || uuid.v4();

  // Cap ttl to 0 millis minimum
  if (task.ttl < 0) task.ttl = 0;

  this.tasks[id] = setTimeout(function() {
    if (typeof(self.taskHandlers[task.handler]) === 'function') {
      self.taskHandlers[task.handler](task, cb);

      // Remove task from array
      delete self.tasks[id];
      self.removeTask(id);
    } else {
      if (typeof(cb) === 'function') {
        cb(new Error('No task handler defined for ' + task.handler));
      }
    }
  }, task.ttl);

  task.registered = new Date().getTime();
  task.id = id;

  return task;
};

Tasker.prototype.scheduleTask = function(task, cb) {
  var scheduledTask = this._scheduleTask(task, cb);
  this.pushTask(scheduledTask.id, scheduledTask);
};

Tasker.prototype.pushTask = function(id, task) {
  var tasks = this.robot.brain.get('tasker_tasks');
  if (typeof(tasks) !== 'object' || tasks === null) {
    tasks = {};
  }
  tasks[id] = task;
  this.robot.brain.set('tasker_tasks', tasks);
};

Tasker.prototype.removeTask = function(id) {
  var tasks = this.robot.brain.get('tasker_tasks');
  if (typeof(tasks) !== 'object' || tasks === null) {
    tasks = {};
  }
  delete tasks[id];
  this.robot.brain.set('tasker_tasks', tasks);
};

Tasker.prototype.removeScheduledTask = function(taskId) {
  if (this.tasks[taskId]) {
    clearTimeout(this.tasks[taskId]);
    delete this.tasks[taskId];
    this.removeTask(taskId);
  }
};

Tasker.prototype.findTasks = function(iterator) {
  var tasks = this.robot.brain.get('tasker_tasks');

  var result = [];
  _.keys(tasks).forEach(function(key) {
    if (iterator(tasks[key], key)) {
      result.push(tasks[key]);
    }
  });

  return result;
};

module.exports = function(robot) {
  if (!Boolean(robot.tasker)) {
    robot.tasker = new Tasker(robot);
  }
};
