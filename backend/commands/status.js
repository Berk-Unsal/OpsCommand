module.exports = {
    name: '/status',
    description: 'Fetches the live Kubernetes cluster pod metrics.',
    execute: async (data, context) => {
        const { socket, k8sApi } = context; // Unpack the tools we need

        try {
            const res = await k8sApi.listNamespacedPod({ namespace: 'default' });

            // Support both legacy and modern client-node response shapes.
            const pods = Array.isArray(res?.items)
                ? res.items
                : Array.isArray(res?.body?.items)
                    ? res.body.items
                    : [];
            
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
            const details = err?.response?.body?.message || err?.message || 'Unknown Kubernetes API error';
            socket.emit('receive_message', {
                sender: 'OpsBot',
                text: `🔴 API Error: Could not fetch cluster status. ${details}`,
                type: 'system'
            });
        }
    }
};