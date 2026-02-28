module.exports = {
    name: '/help',
    description: 'Lists all available OpsBot commands.',
    execute: async (data, context) => {
        const { socket, commands } = context; // Unpack the tools, including the commands Map

        // Build a beautifully formatted string dynamically
        let helpText = '🛠️ **Available OpsBot Commands:**\n';
        
        // Loop through every loaded plugin and grab its name and description
        for (const cmd of commands.values()) {
            helpText += `• ${cmd.name} : ${cmd.description}\n`;
        }

        // Send it back to the UI
        socket.emit('receive_message', {
            sender: 'OpsBot',
            text: helpText,
            type: 'system'
        });
    }
};