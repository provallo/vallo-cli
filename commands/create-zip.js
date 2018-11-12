const pkg = require('../package.json')
const path = require('path')
const axios = require('axios')
const fs = require('fs-extra')
const step = require('../util/step')
const shell = require('shelljs')
const ask = require('inquirer')
const { format } = require('util')
const os = require('os')
const ignore = require('ignore')
const archiver = require('archiver')
const walker = require('walker')
const md5 = require('md5')

module.exports = () => {
    let pluginDir = process.cwd()
    let infoFilename = path.join(pluginDir, 'plugin.json')
    let releaseDir = path.join(pluginDir, 'releases')

    step([

        {
            description: 'Check for valid plugin structure',
            handler (resolve, reject, data) {
                fs.exists(infoFilename)
                    .then(success => {
                        if (success) {
                            fs.readFile(infoFilename)
                                .then(buffer => {
                                    data.plugin = JSON.parse(buffer.toString())
                                    resolve()
                                })
                                .catch(reject)
                        } else {
                            reject()
                        }
                    })
                    .catch(reject)
            }
        },

        {
            description: 'Create releases directory',
            handler (resolve, reject, data) {
                fs.ensureDir(releaseDir)
                    .then(resolve)
                    .catch(reject)
            }
        },

        {
            description: 'Building ignore',
            handler (resolve, reject, data) {
                let ignoreFilename = path.join(pluginDir, '.gitignore')

                fs.exists(ignoreFilename)
                    .then(success => {
                        if (success) {
                            fs.readFile(ignoreFilename)
                                .then(buffer => {
                                    data.ignore = ignore()
                                    data.ignore.add(buffer.toString())

                                    resolve()
                                })
                                .catch(reject)
                        } else {
                            resolve()
                        }
                    })
                    .catch(reject)
            }
        },

        {
            description: 'Collecting files',
            handler (resolve, reject, data) {
                let files = []

                walker(pluginDir)
                    .on('file', (filename, stat) => {
                        let relativeFilename = filename.substr(pluginDir.length + 1)

                        if (!data.ignore.ignores(relativeFilename)) {
                            files.push({
                                filename,
                                relativeFilename
                            })
                        }
                    })
                    .on('error', (err, entry, stat) => {
                        reject(err)
                    })
                    .on('end', () => {
                        data.files = files

                        resolve()
                    })
            }
        },

        {
            description: 'Creating archive',

            handler (resolve, reject, data) {
                let hash = md5(JSON.stringify(data.files))
                let outputFilename = path.join(pluginDir, 'releases', data.plugin.packageID + '_' + data.plugin.version + '_' + hash + '.zip')
                let output = fs.createWriteStream(outputFilename)
                let archive = archiver('zip')

                output.on('close', () => {
                    resolve()
                })

                archive.on('error', (error) => {
                    reject(error)
                })

                archive.pipe(output)

                data.files.forEach(({ filename, relativeFilename }) => {
                    archive.file(filename, { name: relativeFilename })
                })

                archive.finalize()
            }
        }

    ])
}