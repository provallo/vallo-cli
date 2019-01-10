'use strict'

const step = (items, config) => {
    const data = {}
    let current = 0
    const startTime = Date.now()

    config = config || {
        silent: false
    }

    const next = (resolve, reject) => {
        const item = items[current]

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
            err => {
                reject(err)
            },
            data
        )
    }

    return new Promise((resolve, reject) => next(resolve, reject)).then(data => {
        if (!config.silent) {
            const endTime = Date.now()
            const time = (endTime - startTime) / 1000

            console.log('Finished in %ds', time)
        }

        return data
    }).catch(error => console.log(error))
}

module.exports = step
