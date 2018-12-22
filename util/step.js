console.reset = function () {
    return process.stdout.write('\033c')
}

const step = (items, config) => {
    let data = {}
    let current = 0
    let startTime = Date.now()
    
    config = config || {
        silent: false
    }
    
    let next = (resolve, reject) => {
        let item = items[ current ]
        
        if (!config.silent) {
            console.log('[%d/%d] %s ...', current + 1, items.length, item.description)
        }
        
        item.handler(
            () => {
                ++current
                
                if (current < items.length) {
                    next(resolve, reject)
                } else {
                    resolve(data)
                }
            },
            (err) => {
                reject(err)
            },
            data
        )
    }
    
    return new Promise((resolve, reject) => next(resolve, reject)).then((data) => {
        if (!config.silent) {
            let endTime = Date.now()
            let time = (endTime - startTime) / 1000
            
            console.log('Finished in %ds', time)
        }
        
        return data
    }).catch(error => console.log(error))
}

module.exports = step