const pkg = require('../package.json')
const path = require('path')
const axios = require('axios')
const fs = require('fs-extra')
const step = require('../util/step')
const targz = require('targz')
const shell = require('shelljs')
const ask = require('inquirer')
const { format } = require('util')
const os = require('os')

module.exports = (_path) => {
    _path = _path || ''
    
    let http = axios.create({
        baseURL: pkg.valloConfig.updateServer
    })
    
    let baseDir = path.join(process.cwd(), _path)
    let targetFilename = path.join(baseDir, 'release.tar.gz')

    step([
        
        {
            description: 'Checking requirements',
            handler (resolve, reject, data) {
                if (!shell.which('yarn')) {
                    console.log('Missing required program: yarn')
                    reject()
                } else if (!shell.which('composer')) {
                    console.log('Missing required program: composer')
                    reject()
                } else if (!shell.which('mysql')) {
                    console.log('Missing required program: mysql')
                    reject()
                } else if (!shell.which('tar')) {
                    console.log('Missing required program: tar')
                    reject()
                } else if (process.platform === 'darwin' && !shell.which('gtar')) {
                    console.log('Missing required program: btar (Install it via `brew install gnu-tar`')
                    reject()
                } else {
                    resolve()
                }
            }
        },
        
        {
            description: 'Configuration',
            handler (resolve, reject, data) {
                data.answers = {
                    mysql_host: '127.0.0.1',
                    mysql_username: 'root',
                    mysql_password: 'vagrant',
                    mysql_database: 'provallo_test',
                    
                    domain_host: 'provallo.de',
                    domain_ssl: true,
                    
                    admin_email: 'tyurderi@yahoo.de',
                    admin_firstname: 'Tommy'
                }
                resolve()
                return
                
                
                ask
                    .prompt([
                        /** MySQL configuration **/
                        {
                            type: 'input',
                            name: 'mysql_host',
                            message: 'mysql host',
                            default: '127.0.0.1'
                        },
                        {
                            type: 'input',
                            name: 'mysql_username',
                            message: 'mysql username',
                            default: 'root'
                        },
                        {
                            type: 'password',
                            name: 'mysql_password',
                            message: 'mysql password',
                            mask: '*'
                        },
                        {
                            type: 'input',
                            name: 'mysql_database',
                            message: 'mysql database'
                        },
                        /** Domain configuration **/
                        {
                            type: 'input',
                            name: 'domain_host',
                            message: 'domain'
                        },
                        {
                            type: 'confirm',
                            name: 'domain_ssl',
                            message: 'ssl enabled'
                        },
                        /** Admin user configuration **/
                        {
                            type: 'input',
                            name: 'admin_email',
                            message: 'backend user email'
                        },
                        {
                            type: 'input',
                            name: 'admin_firstname',
                            message: 'backend user firstname'
                        }
                    ])
                    .then(answers => {
                        data.answers = answers
                        resolve()
                    })
            }
        },
        
        {
            description: 'Getting latest release information',
            handler (resolve, reject, data) {
                http.get('api/store/checkApp', { params: { version: '0.0.0' } })
                    .then(response => response.data)
                    .then(response => {
                        if (response.isNewer === true) {
                            data.result = response
                            resolve()
                        } else {
                            console.log('No install binaries available.')
                            reject(response)
                        }
                    })
                    .catch((error) => {
                        console.log('Oops! Something went wrong...')
                        reject(error)
                    })
            }
        },
        
        {
            description: 'Downloading release.tar.gz',
            handler (resolve, reject, data) {
                axios({ url: data.result.uri, responseType: 'stream' })
                    .then(response => response.data)
                    .then(response => {
                        let stream = fs.createWriteStream(targetFilename)
            
                        response.pipe(stream)
                        response.on('end', () => {
                            resolve()
                        })
                    })
                    .catch(reject)
            }
        },
        
        {
            description: 'Extracting release.tar.gz',
            handler (resolve, reject, data) {
                let command = format('cd %s && tar xzf %s', baseDir, targetFilename)

                if (process.platform === 'darwin') {
                    command = command.replace('tar', 'gtar')
                }

                if (shell.exec(command).code !== 0) {
                    reject()
                } else {
                    resolve()
                }
            }
        },
        
        {
            description: 'Creating required directories',
            handler (resolve, reject, data) {
                let requiredPaths = [
                    'ext/system',
                    'ext/custom',
                    'cache/twig'
                ]
                
                requiredPaths.forEach(pathname => {
                    shell.mkdir('-p', path.join(baseDir, pathname))
                })
                
                resolve()
            }
        },
        
        {
            description: 'Getting node dependencies',
            handler (resolve, reject, data) {
                shell.exec('yarn install', { silent: true })
                resolve()
            }
        },
        
        {
            description: 'Getting php dependencies',
            handler (resolve, reject, data) {
                shell.exec('composer install', { silent: true })
                resolve()
            }
        },
        
        {
            description: 'Getting default plugins',
            handler (resolve, reject, data) {
                resolve()
            }
        },
        
        {
            description: 'Import mysql database',
            handler (resolve, reject, data) {
                // Get available databases
                let config = data.answers
                let mysql = format('mysql -h%s -u%s -p%s', config.mysql_host, config.mysql_username, config.mysql_password)
                let command = format('%s -e "SHOW DATABASES"', mysql)
                let databases = shell.exec(command, { silent: true }).stdout.split(os.EOL).slice(1)

                if (databases.indexOf(config.mysql_database) > -1) {
                    resolve()
                    return
                }
    
                shell.exec(
                    format('%s -e "CREATE DATABASE \\`%s\\`"', mysql, config.mysql_database),
                    {
                        silent: true
                    }
                )
    
                let filename = path.join(baseDir, 'docs', 'database.sql')
                
                if (shell.exec(format('%s %s < %s', mysql, config.mysql_database, filename)).code !== 0) {
                    reject()
                } else {
                    resolve()
                }
            }
        },
        
        {
            description: 'Configure ProVallo CMS',
            handler (resolve, reject, data) {
                let config = data.answers
                let mysql = format('mysql -h%s -u%s -p%s', config.mysql_host, config.mysql_username, config.mysql_password)
                
                // Set domain
                let sql = format('UPDATE \\`domain\\` SET \\`host\\` = \'%s\', secure = %s WHERE id = 1', config.domain_host, config.domain_ssl)
                
                shell.exec(format('%s -e "USE %s; %s"', mysql, config.mysql_database, sql))
                
                // Set user
                sql = format('UPDATE \\`user\\` SET \\`email\\` = \'%s\', firstname = \'%s\' WHERE id = 1', config.admin_email, config.admin_firstname)
    
                shell.exec(format('%s -e "USE %s; %s"', mysql, config.mysql_database, sql))

                // Setup mysql configuration
                let configFilename = path.join(baseDir, 'config.inc.php')
                let contents = fs.readFileSync(configFilename).toString()

                contents = contents.replace('%database.host%', config.mysql_host)
                contents = contents.replace('%database.shem%', config.mysql_database)
                contents = contents.replace('%database.user%', config.mysql_username)
                contents = contents.replace('%database.pass%', config.mysql_password)

                fs.writeFileSync(configFilename, contents)

                resolve()
            }
        },
        
        {
            description: 'Building backend files',
            handler (resolve, reject, data) {
                shell.exec('yarn build:backend')
                resolve()
            }
        },
        
        {
            description: 'Cleanup',
            handler (resolve, reject, data) {
                fs.unlinkSync(targetFilename)
                resolve()
            }
        },
    
    ])
}