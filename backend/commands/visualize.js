function normalizePodListResponse(res) {
    if (Array.isArray(res?.items)) return res.items;
    if (Array.isArray(res?.body?.items)) return res.body.items;
    return [];
}

function getContainerStatuses(pod) {
    const status = pod?.status || {};
    return [
        ...(status.initContainerStatuses || []),
        ...(status.containerStatuses || []),
    ];
}

function getPodHealthTag(pod) {
    const phase = pod?.status?.phase || 'Unknown';
    const statuses = getContainerStatuses(pod);
    const waiting = statuses.some((s) => s?.state?.waiting);
    const terminated = statuses.some((s) => s?.state?.terminated);

    if (phase === 'Running' && !waiting && !terminated) return 'OK';
    if (phase === 'Succeeded') return 'OK';
    if (phase === 'Failed' || phase === 'Unknown') return 'DOWN';
    return 'WARN';
}

function getLastTerminations(pod) {
    const statuses = getContainerStatuses(pod);
    const events = [];

    for (const container of statuses) {
        const lastTerminated = container?.lastState?.terminated;
        if (!lastTerminated) continue;

        events.push({
            podName: pod?.metadata?.name || 'unknown-pod',
            containerName: container?.name || 'unknown-container',
            reason: lastTerminated.reason || 'Unknown',
            exitCode: Number.isInteger(lastTerminated.exitCode) ? lastTerminated.exitCode : 'n/a',
            finishedAt: lastTerminated.finishedAt || 'n/a',
            restartCount: container?.restartCount || 0,
        });
    }

    return events;
}

function formatBackendSection() {
    const uptimeSeconds = Math.floor(process.uptime());
    const uptimeMinutes = Math.floor(uptimeSeconds / 60);
    const memoryMb = Math.round(process.memoryUsage().rss / (1024 * 1024));

    return [
        '+---------------- BACKEND ----------------+',
        '| state  : UP                              |',
        `| uptime : ${String(uptimeMinutes).padStart(4, ' ')} min                         |`,
        `| memory : ${String(memoryMb).padStart(4, ' ')} MB                          |`,
        '+-----------------------------------------+',
    ];
}

function formatPodHealthSection(pods) {
    const header = [
        '+---------------- POD HEALTH -------------+',
        '| tag   pod                               |',
        '+-----------------------------------------+',
    ];

    if (pods.length === 0) {
        return [
            ...header,
            '| WARN  no pods found in namespace default|',
            '+-----------------------------------------+',
        ];
    }

    const lines = pods.map((pod) => {
        const tag = getPodHealthTag(pod).padEnd(4, ' ');
        const name = (pod?.metadata?.name || 'unknown-pod').slice(0, 33).padEnd(33, ' ');
        return `| ${tag}  ${name} |`;
    });

    return [...header, ...lines, '+-----------------------------------------+'];
}

function formatDeadPodsSection(events) {
    const header = [
        '+------------- PREVIOUS FAILURES ---------+',
        '| pod/container              code reason  |',
        '+-----------------------------------------+',
    ];

    if (events.length === 0) {
        return [
            ...header,
            '| none detected                           |',
            '+-----------------------------------------+',
        ];
    }

    const lines = events.slice(0, 12).map((event) => {
        const id = `${event.podName}/${event.containerName}`.slice(0, 24).padEnd(24, ' ');
        const code = String(event.exitCode).slice(0, 4).padEnd(4, ' ');
        const reason = String(event.reason).slice(0, 8).padEnd(8, ' ');
        return `| ${id} ${code} ${reason} |`;
    });

    return [...header, ...lines, '+-----------------------------------------+'];
}

module.exports = {
    name: '/visualize',
    description: 'Renders an ASCII health map of backend and pod state, including prior pod deaths.',
    execute: async (data, context) => {
        const { socket, k8sApi } = context;

        try {
            const res = await k8sApi.listNamespacedPod({ namespace: 'default' });
            const pods = normalizePodListResponse(res);
            const previousFailures = pods.flatMap(getLastTerminations);

            const output = [
                'OPS HEALTH VISUALIZER',
                ...formatBackendSection(),
                ...formatPodHealthSection(pods),
                ...formatDeadPodsSection(previousFailures),
                '',
                `Summary: pods=${pods.length} prior-failures=${previousFailures.length}`,
            ].join('\n');

            socket.emit('receive_message', {
                sender: 'OpsBot',
                text: output,
                type: 'system',
            });
        } catch (err) {
            console.error('K8s API Error in /visualize:', err);
            const details = err?.response?.body?.message || err?.message || 'Unknown Kubernetes API error';
            socket.emit('receive_message', {
                sender: 'OpsBot',
                text: `API Error: Could not build visualization. ${details}`,
                type: 'system',
            });
        }
    },
};
