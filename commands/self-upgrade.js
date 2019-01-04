const pkg = require('../package.json')
const path = require('path')
const axios = require('axios')
const fs = require('fs-extra')
const step = require('../util/step')
const shell = require('shelljs')
const decompress = require('decompress')

module.exports = () => {
    let http = axios.create({
        baseURL: pkg.valloConfig.updateServer
    })
    
    let baseDir = process.cwd()
    let targetFilename = path.join(baseDir, 'pv_core.zip')
    let pluginFilename = path.join(baseDir, 'plugin.json')
    let currentVersion = '0.0.0'
    
    if (fs.existsSync(pluginFilename)) {
        let plugin = require(pluginFilename)
        
        currentVersion = plugin.version
    } else {
        console.log('ProVallo is not installed yet. Please use `vallo init` to install the latest version.')
        return
    }
    
    step([
        
        {
            description: 'Checking requirements',
            handler (resolve, reject, data) {
                if (!shell.which('composer')) {
                    console.log('Missing required program: composer')
                    reject()
                } else if (!shell.which('unzip')) {
                    console.log('Missing required program: unzip')
                    reject()
                } else {
                    resolve()
                }
            }
        },
        
        {
            description: 'Getting latest release information',
            handler (resolve, reject, data) {
                let params = {
                    id: 'pv_core',
                    channel: 'stable',
                    platform: 'provallo-core',
                    version: currentVersion
                }
                
                http.get('api/v1/updates', {params}).then(response => response.data).then(response => {
                    if (response.isNewer === true) {
                        data.result = response
                        console.log('Using version %s', data.result.version)
                        resolve()
                    } else {
                        console.log('Already is up-to-date.')
                    }
                }).catch((error) => {
                    console.log('Oops! Something went wrong...')
                    reject(error)
                })
            }
        },
        
        {
            description: 'Downloading pv_core.zip',
            handler (resolve, reject, data) {
                axios({
                    url: data.result.filename,
                    responseType: 'stream'
                }).then(response => response.data).then(response => {
                    let stream = fs.createWriteStream(targetFilename)
                    
                    response.pipe(stream)
                    response.on('end', () => {
                        resolve()
                    })
                }).catch(reject)
            }
        },
        
        {
            description: 'Securing files that should not be overwritten',
            handler (resolve, reject, data) {
                data.securedFiles = [
                    {
                        originalFilename: path.join(baseDir, 'config.php'),
                        tempFilename: path.join(baseDir, 'config.php.bak')
                    }
                ]
                
                data.securedFiles.forEach(item => {
                    fs.renameSync(item.originalFilename, item.tempFilename)
                })
                
                resolve()
            }
        },
        
        {
            description: 'Extracting pv_core.zip',
            handler (resolve, reject, data) {
                decompress(targetFilename, baseDir).then(() => {
                    resolve()
                }).catch(reject)
            }
        },
        
        {
            description: 'Restoring secured files',
            handler (resolve, reject, data) {
                data.securedFiles.forEach(item => {
                    fs.renameSync(item.tempFilename, item.originalFilename)
                })
    
                resolve()
            }
        },
        
        {
            description: 'Creating required directories',
            handler (resolve, reject, data) {
                let requiredPaths = [
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
            handler (resolve, reject, data) {
                shell.exec('composer update', {silent: false})
                resolve()
            }
        },
        
        {
            description: 'Cleanup',
            handler (resolve, reject, data) {
                fs.unlinkSync(targetFilename)
                resolve()
            }
        }
    
    ])
}