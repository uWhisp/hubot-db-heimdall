# Hubot DB Heimdall

A [Hubot](https://hubot.github.com/) script to grant temporary access to MySQL databases using [Hashicorp's Vault](https://vaultproject.io). If the MySQL database is hosted in [AWS RDS](http://aws.amazon.com/rds/), this script also provides with the option to grant temporary access to the database security group from the user's current IP.

As said, this script uses Vault API under the hood, providing an abstraction layer thanks to Hubot. So in order to make things work you'll need an operative Vault server, and properly configured. See [How to configure Vault](#how-to-configure-vault)

## Commands

### Grant temporary access to a database

`hubot give me <level> access to <database> database`

### Store a user's Vault token

`hubot set vault token [for <user> ] <token>`

### Remove a user's Vault token

`hubot reset vault token [for <user> ]`

## Installation

`npm install git+https://git.uwhisp.net/uwhisp/hubot-db-heimdall.git --save`

And then add `"hubot-db-heimdall"` to the `external-scripts.json` file.

## Configuration

### Configuring the databases

### How to configure vault

### Configure access to AWS RDS security groups

- http://docs.aws.amazon.com/AWSJavaScriptSDK/guide/node-configuring.html


