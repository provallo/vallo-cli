'use strict'

const seq = (items) => {
    const data = {}
    const keys = Object.keys(items)
    let i = 0

    const next = (key) => {
        if (typeof key === 'string') {
            let newIndex = keys.indexOf(key)
            if (newIndex >= 0) {
                i = newIndex
            } else {
                console.log()
                console.error('Sorry, but "%s" is not available here.', key)
                process.exit(-1)
            }
        } else {
            ++i
        }

        if (i < keys.length) {
            callNext()
        }
    }
    const stop = (text) => {
        console.log()
        console.error(text)
        process.exit(-1)
    }

    const callNext = () => {
        const fn = items[keys[i]]

        fn({ next, stop }, data)
    }

    callNext()
}

module.exports = seq
