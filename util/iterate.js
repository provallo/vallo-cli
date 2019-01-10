'use strict'

const step = items => {
    const data = {}
    let current = 0

    const next = (resolve, reject) => {
        const item = items[current]

        item(
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

    return new Promise((resolve, reject) => {
        next(resolve, reject)
    })
}

module.exports = step
