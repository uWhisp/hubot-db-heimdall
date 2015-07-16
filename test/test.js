var expect = require("chai").expect;
var path   = require("path");

var Robot       = require("hubot/src/robot");
var TextMessage = require("hubot/src/message").TextMessage;

describe("Hubot-script Functionality", function() {
  var robot;
  var user;
  var adapter;

  process.env.PORT = 9910;

  beforeEach(function(done) {
    // create new robot, without http, using the mock adapter
    robot = new Robot(null, "mock-adapter", false, "TestBot");

    robot.adapter.on("connected", function() {
      // only load scripts we absolutely need, like auth.coffee
      process.env.HUBOT_AUTH_ADMIN = "1";
      robot.loadFile(
        path.resolve(
          path.join("node_modules/hubot-auth/src")
        ),
        "auth.coffee"
      );

      // load the module under test and configure it for the
      // robot.  This is in place of external-scripts
      require("../index")(robot);

      // create a user
      user = robot.brain.userForId("1", {
        name: "mocha",
        room: "#mocha"
      });

      // create a second user if we want to observer user to
      // user interaction
      user2 = robot.brain.userForId("2", {
        name: "chai",
        room: "#mocha"
      });

      adapter = robot.adapter;

      setTimeout(done, 250);
    });
    robot.run();
  });

  afterEach(function() {
    robot.shutdown();
  });

  describe("Managing vault tokens", function() {

    it("responds to set vault token foo", function(done) {
      adapter.on("reply", function(envelope, strings) {
        try {
          expect(strings[0]).to.equal("I've stored your vault token for future use");
          expect(user.Creds).to.exist;
          expect(user.Creds.vault_token).to.equal('foo');
          done();
        } catch(e) {
          done(e);
        }
      });

      // Send from first user
      adapter.receive(new TextMessage(user, robot.name+" set vault token foo"));
    });

    it("responds to reset vault token", function(done) {

      adapter.on("reply", function(envelope, strings) {
        try {
          expect(strings[0]).to.equal("I've nuked your vault token");
          expect(user.Creds).to.not.exist;
          done();
        } catch(e) {
          done(e);
        }
      });

      // Send from second user
      adapter.receive(new TextMessage(user2, robot.name+" reset vault token"));
    });
  });
});