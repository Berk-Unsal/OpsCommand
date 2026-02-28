module.exports = {
    name: '/logs',
    description: 'Fetches the last 20 lines of logs for a specific pod. Usage: /logs <pod-name>',
    execute: async (data, context) => {
        const { socket, k8sApi } = context;
        
        // Split the message by spaces. [0] is "/logs", [1] is the pod name
        const args = data.text.split(' ');
        const podName = args[1];

        // Validation: Did they actually provide a pod name?
        if (!podName) {
            socket.emit('receive_message', {
                sender: 'OpsBot',
                text: '⚠️ Please provide a pod name. Usage: /logs <pod-name>',
                type: 'system'
            });
            return;
        }

        try {
            // Ask the K8s API for the logs of that specific pod
            const res = await k8sApi.readNamespacedPodLog({
                name: podName,
                namespace: 'default',
                tailLines: 20 // Only grab the last 20 lines so we don't flood the chat
            });
            
            // In the new K8s SDK, 'res' is directly the raw log string
            const logData = res || "No logs found for this pod.";
            
            const botReply = `📄 **Logs for ${podName}:**\n${logData}`;

            socket.emit('receive_message', {
                sender: 'OpsBot',
                text: botReply,
                type: 'system'
            });

        } catch (err) {
            console.error(`K8s API Error in /logs for ${podName}:`, err);
            socket.emit('receive_message', {
                sender: 'OpsBot',
                text: `🔴 API Error: Could not fetch logs for ${podName}. Are you sure that pod exists?`,
                type: 'system'
            });
        }
    }
};