const path = require('path')
const fs = require('fs-extra')
const ignore = require('ignore')
const archiver = require('archiver')
const walker = require('walker')
const step = require('../util/step')

module.exports = (dir, {json}) => {
    let pluginDir = process.cwd()

    if (dir) {
        pluginDir = path.resolve(dir)
    }

    const infoFilename = path.join(pluginDir, 'plugin.json')
    const releaseDir = path.join(pluginDir, 'releases')

    step([

        {
            description: 'Check for valid plugin structure',
            handler(resolve, reject, data) {
                fs.exists(infoFilename).then(success => {
                    if (success) {
                        fs.readFile(infoFilename).then(buffer => {
                            data.plugin = JSON.parse(buffer.toString())
                            resolve()
                        }).catch(reject)
                    } else {
                        reject()
                    }
                }).catch(reject)
            }
        },

        {
            description: 'Create releases directory',
            handler(resolve, reject) {
                fs.ensureDir(releaseDir).then(resolve).catch(reject)
            }
        },

        {
            description: 'Building ignore',
            handler(resolve, reject, data) {
                const ignoreFilename = path.join(pluginDir, '.gitignore')

                fs.exists(ignoreFilename).then(success => {
                    if (success) {
                        fs.readFile(ignoreFilename).then(buffer => {
                            data.ignore = ignore()
                            data.ignore.add(buffer.toString())

                            resolve()
                        }).catch(reject)
                    } else {
                        resolve()
                    }
                }).catch(reject)
            }
        },

        {
            description: 'Collecting files',
            handler(resolve, reject, data) {
                const files = []

                walker(pluginDir).on('file', filename => {
                    const relativeFilename = filename.substr(pluginDir.length + 1)

                    if (!data.ignore.ignores(relativeFilename)) {
                        files.push({
                            filename,
                            relativeFilename
                        })

                        if (!json) {
                            console.log('Adding %s', relativeFilename)
                        }
                    }
                }).on('error', err => {
                    reject(err)
                }).on('end', () => {
                    data.files = files

                    resolve()
                })
            }
        },

        {
            description: 'Creating archive',

            handler(resolve, reject, data) {
                const outputFilename = path.join(pluginDir, 'releases', data.plugin.packageID + '_' + data.plugin.version + '.zip')
                const output = fs.createWriteStream(outputFilename)
                const archive = archiver('zip')

                output.on('close', () => {
                    if (json) {
                        console.log(JSON.stringify({filename: outputFilename}))
                    } else {
                        console.log('Filename: %s', outputFilename)
                    }
                    resolve()
                })

                archive.on('error', error => {
                    reject(error)
                })

                archive.pipe(output)

                data.files.forEach(({filename, relativeFilename}) => {
                    archive.file(filename, {name: relativeFilename})
                })

                archive.finalize()
            }
        }

    ], {silent: json})
}
