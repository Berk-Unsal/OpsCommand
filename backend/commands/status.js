module.exports = {
    name: '/status',
    description: 'Fetches the live Kubernetes cluster pod metrics.',
    execute: async (data, context) => {
        const { socket, k8sApi } = context; // Unpack the tools we need

        try {
            const res = await k8sApi.listNamespacedPod({ namespace: 'default' });
            const pods = res.items;
            
            const total = pods.length;
            const running = pods.filter(p => p.status.phase === 'Running').length;
            
            const botReply = `🟢 Cluster Status: ${total} Pods Deployed (${running} Running).`;
            
            socket.emit('receive_message', {
                sender: 'OpsBot',
                text: botReply,
                type: 'system'
            });
            
        } catch (err) {
            console.error("K8s API Error in /status:", err);
            socket.emit('receive_message', {
                sender: 'OpsBot',
                text: `🔴 API Error: Could not fetch cluster status. Check backend logs.`,
                type: 'system'
            });
        }
    }
};