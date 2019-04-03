const path = require('path')
const fs = require('fs-extra')
const seq = require('../util/seq')
const chalk = require('chalk')
const inquirer = require('inquirer')
const semver = require('semver')
const shell = require('shelljs')
const { format } = require('util')

module.exports = () => {
    const baseDir = process.cwd()

    seq({

        checkFileExistence({ next, stop }, data) {
            data.filename = path.join(baseDir, 'plugin.json')

            if (!fs.existsSync(data.filename)) {
                stop(chalk.red('Sorry') + ' but I couldn\'t find a plugin.json in the current directory.')
            } else {
                next()
            }
        },

        checkSavas({ next, stop }, data) {
            const directory = path.join(baseDir, '.savas')

            if (!fs.existsSync(directory)) {
                stop(chalk.red('Sorry') + ' but it seems that savas is not initialized yet.')
            } else {
                next()
            }
        },

        readPluginJson({ next, stop }, data) {
            data.plugin = require(data.filename)
            next()
        },

        async selectNewVersion({ next, stop }, data) {
            console.log()
            console.log('Publish a new version of %s (%s)', chalk.keyword('purple')(data.plugin.name), chalk.blue(data.plugin.version))
            console.log()

            let patchVersion = semver.inc(data.plugin.version, 'patch')
            let minorVersion = semver.inc(data.plugin.version, 'minor')
            let majorVersion = semver.inc(data.plugin.version, 'major')

            let answer = await inquirer.prompt([
                {
                    type: 'list',
                    name: 'version',
                    message: 'Select semver increment or specify new version',
                    choices: [
                        'patch ' + chalk.rgb(150, 150, 150)(patchVersion),
                        'minor ' + chalk.rgb(150, 150, 150)(minorVersion),
                        'major ' + chalk.rgb(150, 150, 150)(majorVersion),
                        'other (specify)'
                    ],
                    pageSize: 4
                }
            ])

            if (answer.version.indexOf('other') === 0) {
                next('selectCustomVersion')
            } else {
                let incType = answer.version.split(' ')[0]
                let newVersion = semver.inc(data.plugin.version, incType)

                data.newVersion = newVersion
                next('updateVersion')
            }
        },

        async selectCustomVersion({ next, stop }, data) {
            let questions = [
                {
                    type: 'input',
                    name: 'version',
                    message: 'Specify new version',
                    validate(value) {
                        if (semver.valid(value)) {
                            return true
                        }

                        return 'The provided version is invalid'
                    }
                }
            ]

            let answer = await inquirer.prompt(questions)

            data.newVersion = answer.version
            next('updateVersion')
        },

        async updateVersion({ next, stop }, data) {
            data.plugin.version = data.newVersion

            let newJson = JSON.stringify(data.plugin, 0, 2)

            console.log(newJson)

            let questions = [
                {
                    type: 'confirm',
                    name: 'continue',
                    message: 'This would be the new content of plugin.json - Okay ?',
                    default: true
                }
            ]

            let answer = await inquirer.prompt(questions)

            if (answer.continue) {
                fs.writeFileSync(data.filename, newJson)
                next('createReleaseFile')
            }
        },

        async createReleaseFile({ next, stop }, data) {
            const json = shell.exec('vallo create-zip --json', { silent: true })
            const { filename } = JSON.parse(json)

            data.zipFilename = filename
            next()
        },

        async createRelease({ next, stop }, data) {
            const command = format('savas create-release %s --channel="%s" --enable', data.plugin.version, data.plugin.package.channel)
            const result = shell.exec(command, { silent: true })

            if (result.indexOf('the release were created successfully') > -1) {
                next()
            } else {
                stop(format('The release %s is already published', data.plugin.version))
            }
        },

        async uploadFile({ next, stop }, data) {
            const command = format('savas upload "%s" %s --channel="%s" --platform="%s"', data.zipFilename, data.plugin.version, data.plugin.package.channel, data.plugin.package.platform)
            const result = shell.exec(command, { silent: true })

            if (result.indexOf('File were uploaded successfully') > -1) {
                next()
            } else {
                stop(result.toString())
            }
        },

        async finish({ next, stop }, data) {
            console.log('Finished')
        }

    })
}
