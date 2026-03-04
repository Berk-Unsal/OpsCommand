const k8s = require('@kubernetes/client-node');

module.exports = {
    name: '/restart',
    description: 'Triggers a rollout restart for a specific deployment. Usage: /restart <deployment-name>',
    execute: async (data, context) => {
        const { socket, k8sObjectApi } = context;
        
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
            const patch = {
                spec: {
                    template: {
                        metadata: {
                            annotations: {
                                'kubectl.kubernetes.io/restartedAt': restartedAt
                            }
                        }
                    }
                }
            };

            console.log(`[/restart] DEBUG: Calling patch with spec:`, JSON.stringify(patch));

            // Apply the patch using KubernetesObjectApi with strategic merge patch
            // This requires a full Kubernetes object spec
            const deploymentSpec = {
                apiVersion: 'apps/v1',
                kind: 'Deployment',
                metadata: {
                    name: deploymentName,
                    namespace: namespace
                },
                spec: patch.spec
            };

            await k8sObjectApi.patch(
                deploymentSpec,
                undefined,  // pretty
                undefined,  // dryRun
                undefined,  // fieldManager
                undefined,  // force
                k8s.PatchStrategy.StrategicMergePatch
            );

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