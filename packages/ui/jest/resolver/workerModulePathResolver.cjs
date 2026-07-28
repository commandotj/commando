// workerModulePathResolver.js (auto-generated)
module.exports = (request, options) => {
    // Remove ?modulePath query for worker imports
    if (request.endsWith("?modulePath")) {
        const noQuery = request.replace("?modulePath", "")
        return options.defaultResolver(noQuery, options)
    }
    // Remove ?nodeWorker query for worker imports
    if (request.endsWith("?nodeWorker")) {
        const noQuery = request.replace("?nodeWorker", "")
        return options.defaultResolver(noQuery, options)
    }
    return options.defaultResolver(request, options)
}
