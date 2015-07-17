# Hubot DB Heimdall

A [Hubot](https://hubot.github.com/) script to grant temporary access to MySQL databases using [Hashicorp's Vault](https://vaultproject.io). If the MySQL database is hosted in [AWS RDS](http://aws.amazon.com/rds/), this script also provides with the option to grant temporary access to the database security group from the user's current IP.

As said, this script uses Vault API under the hood, providing an abstraction layer thanks to Hubot. So in order to make things work you'll need an operative Vault server, and properly configured. See [How to configure Vault](#how-to-configure-vault)

## Commands

### Grant temporary access to a database

`hubot give me <level> access to <database> database`

The `level` corresponds to the Vault role you want to use to access the specified `database`. A useful pattern would be to have `readonly` and `readwrite` levels, and different databases for different environments, so you could do something like this:

`hubot give me readonly access to production database`

### Store a user's Vault token

`hubot set vault token [for <user> ] <token>`

This command sets a Vault token for the sender user or for the specified user. Note that only admins can set tokens for other users. See [hubot-auth](https://github.com/hubot-scripts/hubot-auth).

### Remove a user's Vault token

`hubot reset vault token [for <user> ]`

This removes a stored Vault token for the sender user or from the specified user. As with the set command, only admins can reset tokens for other users.

## Installation

`npm install git+https://git.uwhisp.net/uwhisp/hubot-db-heimdall.git --save`

And then add `"hubot-db-heimdall"` to the `external-scripts.json` file.

## Configuration

### Configuring the databases

### How to configure vault

### Configure access to AWS RDS security groups (optional)

- http://docs.aws.amazon.com/AWSJavaScriptSDK/guide/node-configuring.html


