/**
 * Authentication middleware for Express routes
 * Check if user is authenticated via session
 */
const isAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next();
    }
    res.status(401).json({ error: 'Unauthorized' });
};

/**
 * Socket.io authentication check
 * Checks if the socket connection has an authenticated user
 * @param {Object} socket - Socket.io socket instance
 * @returns {Object|null} - User object if authenticated, null otherwise
 */
const getSocketUser = (socket) => {
    return socket.request.session?.passport?.user || null;
};

/**
 * Check if a command requires authentication
 */
const protectedCommands = ['/restart', '/execute'];

const isProtectedCommand = (commandName) => {
    return protectedCommands.includes(commandName);
};

module.exports = {
    isAuthenticated,
    getSocketUser,
    isProtectedCommand,
    protectedCommands
};
