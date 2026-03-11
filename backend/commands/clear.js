module.exports = {
    name: '/clear',
    description: 'Clears the ops terminal history.',
    execute: async (data, context) => {
        const { socket, io } = context;

        // Emit clear event to all clients
        io.emit('clear-ops-terminal');

        // Send confirmation message
        socket.emit('receive_message', {
            sender: 'OpsBot',
            text: '✨ Terminal cleared.',
            type: 'system',
            channel: 'ops'
        });
    }
};
