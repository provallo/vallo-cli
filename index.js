process.on('unhandledRejection', error => {
    throw error
})

const program = require('commander')
const _ = require('lodash')
const pkg = require('./package')
const updateNotifier = require('update-notifier');

updateNotifier({pkg}).notify();

program
    .version(pkg.version)

program
    .command('init [path]')
    .description('Installs the latest version of ProVallo')
    .action(require('./commands/init'))

program
    .command('self-upgrade')
    .description('Updates ProVallo Core to the latest version')
    .action(require('./commands/self-upgrade'))

program
    .command('publish')
    .description('Publishes the current state to savas')
    .action(require('./commands/publish'))

program
    .command('create-zip [path]')
    .description('Creates a zip archive for a ready-to-use plugin')
    .option('--json', 'Enable json output')
    .action(require('./commands/create-zip'))

if(_.isEmpty(program.parse(process.argv).args) && process.argv.length === 2) {
    program.help()
}
