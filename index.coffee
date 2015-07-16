fs = require 'fs'
path = require 'path'
require './config'

module.exports = (robot, scripts) ->
  scriptsPath = path.resolve(__dirname, 'src')
  fs.exists scriptsPath, (exists) ->
    if exists
      robot.load scriptsPath
