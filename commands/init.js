const path = require('path')
const axios = require('axios')
const fs = require('fs-extra')
const shell = require('shelljs')
const decompress = require('decompress')
const pkg = require('../package.json')
const step = require('../util/step')

module.exports = () => {
    const http = axios.create({
        baseURL: pkg.valloConfig.updateServer
    })

    const baseDir = process.cwd()
    const targetFilename = path.join(baseDir, 'pv_core.zip')
    const pluginFilename = path.join(baseDir, 'plugin.json')

    if (fs.existsSync(pluginFilename)) {
        console.log('Please use `vallo self-upgrade` to update an existing installation of ProVallo.')
        return
    }

    step([

        {
            description: 'Checking requirements',
            handler(resolve, reject) {
                if (!shell.which('composer')) {
                    console.log('Missing required program: composer')
                    reject()
                    return
                }

                if (!shell.which('unzip')) {
                    console.log('Missing required program: unzip')
                    reject()
                    return
                }

                resolve()
            }
        },

        {
            description: 'Getting latest release information',
            handler(resolve, reject, data) {
                const params = {
                    id: 'pv_core',
                    channel: 'stable',
                    platform: 'provallo-core',
                    version: '0.0.0'
                }

                http.get('api/v1/updates', {params}).then(response => response.data).then(response => {
                    if (response.isNewer === true) {
                        data.result = response
                        console.log('Using version %s', data.result.version)
                        resolve()
                    } else {
                        console.log('ProVallo is up-to-date')
                        reject(response)
                    }
                }).catch(error => {
                    console.log('Oops! Something went wrong...')
                    reject(error)
                })
            }
        },

        {
            description: 'Downloading pv_core.zip',
            handler(resolve, reject, data) {
                axios({
                    url: data.result.filename,
                    responseType: 'stream'
                }).then(response => response.data).then(response => {
                    const stream = fs.createWriteStream(targetFilename)

                    response.pipe(stream)
                    response.on('end', () => {
                        resolve()
                    })
                }).catch(reject)
            }
        },

        {
            description: 'Extracting pv_core.zip',
            handler(resolve, reject) {
                decompress(targetFilename, baseDir).then(() => {
                    resolve()
                }).catch(reject)
            }
        },

        {
            description: 'Creating required directories',
            handler(resolve) {
                const requiredPaths = [
                    'cache/twig',
                    'ext'
                ]

                requiredPaths.forEach(pathname => {
                    shell.mkdir('-p', path.join(baseDir, pathname))
                })

                resolve()
            }
        },

        {
            description: 'Getting php dependencies',
            handler(resolve) {
                shell.exec('composer install', {silent: false})
                resolve()
            }
        },

        {
            description: 'Cleanup',
            handler(resolve) {
                fs.unlinkSync(targetFilename)
                resolve()
            }
        }

    ])
}
