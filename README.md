# Hubot DB Heimdall

A [Hubot](https://hubot.github.com/) script to grant temporary access to MySQL databases using [Hashicorp's Vault](https://vaultproject.io). If the MySQL database is hosted in [AWS RDS](http://aws.amazon.com/rds/), this script also provides with the option to grant temporary access to the database security group from the user's current IP.

As said, this script uses Vault API under the hood, providing an abstraction layer thanks to Hubot. So in order to make things work you'll need an operative Vault server, and properly configured. See [How to configure Vault](#user-content-how-to-configure-vault)

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

This Hubot script uses [node-config](https://github.com/lorenwest/node-config) module to manage the configuration of the different parameters. If your Hubot already uses `node-config`, you only need to add the corresponding configuration under the `hubot-db-heimdall` atribute in your config file. If thats not the case, then you only need to create the file `config/default.js` in the root of your project with the content described below.

The minimum configuration for this script to work is: 

```js
Urls: {
  vault_base_url: "https://vault.example.com:8200"
}
```

You'll also want to add at least one database definition. See [Configuring the databases](#user-content-configuring-the-databases).

At the end you'll end up with a configuration file with at least this content:

```js
module.exports = {
  'hubot-db-heimdall': {
    Urls: {
      vault_base_url: "https://vault.example.com:8200"
    },
    Databases: [{...}]
  }
};
```

### Configuring the databases

For each database that you want to manage through this script, you'll need to add an object like this to the `Databases` array in the configuration parameters.

```js
{
  name: 'production',
  rds_security_group: 'db-production',
  matcher: /prod(?:uction)?/i,
  vault_mount: 'db_production',
  vault_roles: [
    {
      name: 'readonly',
      matcher: /ro|readonly|read/i
    }, {
      name: 'readwrite',
      matcher: /rw|readwrite|write/i
    }, {
      name: 'admin',
      matcher: /admin/i
    }
  ]
}
```

Where:

`name` - only for reference in hubot responses.

`matcher` - A regular expression to match to the Hubot command with the desired database.

`vault_mount` - The vault mount that this database uses, that is the first segment of the Vault path to retrieve the credentials (e.g.: `db_production`/creds/readonly ).

`vault_roles` - All the roles that Vault accepts for this database (i.e.: Vault mount). A Vault role definition has two components: the `name` is the actual name of the Vault role used, that's the last part of the Vault path (e.g.: db_production/creds/`readonly` ); and the `matcher` is the regular expression that will be used to match the role in the Hubot command.

`rds_security_group` - (optional) AWS RDS security group for the database. See [Configure access to AWS RDS security groups](#user-content-configure-access-to-aws-rds-security-groups-optional).

### How to configure vault

This script uses Vault's MySQL secret backend to generate the proper credentials, follow [this guide](https://vaultproject.io/docs/secrets/mysql/index.html) to know how to setup a MySQL mount with at least one role.

### Configure access to AWS RDS security groups (optional)

TODO

- http://docs.aws.amazon.com/AWSJavaScriptSDK/guide/node-configuring.html


