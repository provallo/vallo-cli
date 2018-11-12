const program = require('commander')
const _ = require('lodash')

program
    .version('0.0.1')

program
    .command('init [path]')
    .description('Installs the latest version of the provallo cms')
    .action(require('./commands/init'))

program
    .command('create-zip')
    .description('Creates a zip archive for a ready-to-use plugin')
    .action(require('./commands/create-zip'))

if(_.isEmpty(program.parse(process.argv).args) && process.argv.length === 2) {
    program.help()
}
