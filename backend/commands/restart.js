module.exports = {
    name: '/restart',
    description: 'Triggers a rollout restart for a specific deployment. Usage: /restart <deployment-name>',
    execute: async (data, context) => {
        const { socket, k8sAppsApi } = context;
        
        // Split the message by spaces. [0] is "/restart", [1] is the deployment name
        const args = data.text.split(' ');
        const deploymentName = args[1];

        // Validation: Did they actually provide a deployment name?
        if (!deploymentName) {
            socket.emit('receive_message', {
                sender: 'OpsBot',
                text: '⚠️ Please provide a deployment name. Usage: /restart <deployment-name>',
                type: 'system'
            });
            return;
        }

        const namespace = 'default';

        // DEBUG: Log exact values before API call
        console.log(`[/restart] DEBUG: Attempting to restart deployment`);
        console.log(`[/restart] DEBUG: name = "${deploymentName}"`);
        console.log(`[/restart] DEBUG: namespace = "${namespace}"`);

        try {
            // Prepare the patch with the current ISO timestamp
            const restartedAt = new Date().toISOString();
            // Read current deployment and update pod template annotation.
            const current = await k8sAppsApi.readNamespacedDeployment({
                name: deploymentName,
                namespace
            });

            const deployment = current?.body || current;
            deployment.spec = deployment.spec || {};
            deployment.spec.template = deployment.spec.template || {};
            deployment.spec.template.metadata = deployment.spec.template.metadata || {};
            deployment.spec.template.metadata.annotations = deployment.spec.template.metadata.annotations || {};
            deployment.spec.template.metadata.annotations['kubectl.kubernetes.io/restartedAt'] = restartedAt;

            console.log(`[/restart] DEBUG: Replacing deployment with restartedAt=${restartedAt}`);

            await k8sAppsApi.replaceNamespacedDeployment({
                name: deploymentName,
                namespace,
                body: deployment
            });

            const botReply = `🔄 **Deployment restarted:** ${deploymentName}\nRollout restart triggered at ${restartedAt}`;

            socket.emit('receive_message', {
                sender: 'OpsBot',
                text: botReply,
                type: 'system'
            });

        } catch (err) {
            console.error(`[/restart] K8s API Error for deployment "${deploymentName}" in namespace "${namespace}":`);
            console.error(`[/restart] Error statusCode:`, err.statusCode);
            console.error(`[/restart] Error body:`, err.response?.body || err.body || err.message);
            if (err.response?.body?.message) {
                console.error(`[/restart] K8s error message:`, err.response.body.message);
            }
            
            // Check if it's a 404 (deployment not found)
            if (err.statusCode === 404) {
                const k8sMessage = err.response?.body?.message || 'Unknown reason';
                socket.emit('receive_message', {
                    sender: 'OpsBot',
                    text: `🔴 Deployment not found: ${deploymentName}.\nK8s says: ${k8sMessage}`,
                    type: 'system'
                });
            } else {
                const k8sMessage = err.response?.body?.message || err.message || 'Unknown error';
                socket.emit('receive_message', {
                    sender: 'OpsBot',
                    text: `🔴 API Error: Could not restart deployment ${deploymentName}.\nK8s says: ${k8sMessage}`,
                    type: 'system'
                });
            }
        }
    }
};