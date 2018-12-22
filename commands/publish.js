const pkg = require('../package.json')
const path = require('path')
const step = require('../util/step')
const fs = require('fs-extra')
const shell = require('shelljs')
const format = require('format')

module.exports = () => {
    let baseDir = process.cwd()
    
    step([
        
        {
            description: 'Loading release information',
            handler (resolve, reject, data) {
                let filename = path.join(baseDir, 'plugin.json')
                
                if (fs.existsSync(filename)) {
                    data.plugin = require(filename)
                    resolve()
                } else {
                    reject('This is not a valid plugin directory')
                }
            },
        },
        
        {
            description: 'Checking for .savas directory',
            handler (resolve, reject, data) {
                let directory = path.join(baseDir, '.savas')
    
                if (fs.existsSync(directory)) {
                    resolve()
                } else {
                    reject('Unable to find .savas in ' + baseDir)
                }
            }
        },
        
        {
            description: 'Creating release file',
            handler (resolve, reject, data) {
                let json = shell.exec('vallo create-zip --json', { silent: true })
                let { filename } = JSON.parse(json)
                
                data.filename = filename
                
                resolve()
            }
        },
        
        {
            description: 'Creating release',
            handler (resolve, reject, data) {
                let command = format('savas create-release %s --channel="%s"', data.plugin.version, data.plugin.package.channel)
                let result = shell.exec(command, { silent: true })
                
                if (result.indexOf('the release were created successfully') > -1) {
                    resolve()
                } else {
                    reject(format('The release %s is already published', data.plugin.version))
                }
            }
        },
        
        {
            description: 'Uploading file',
            handler (resolve, reject, data) {
                let command = format('savas upload "%s" %s --channel="%s" --platform="%s"', data.filename, data.plugin.version, data.plugin.package.channel, data.plugin.package.platform)
                let result = shell.exec(command, { silent: true })
    
                if (result.indexOf('File were uploaded successfully') > -1) {
                    resolve()
                } else {
                    reject(result.toString())
                }
            }
        }
    
    ])
    
}