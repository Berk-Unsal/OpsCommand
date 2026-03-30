const User = require('../models/User');

function normalizePermissions(user) {
    if (Array.isArray(user.permissions) && user.permissions.length > 0) {
        return user.permissions;
    }

    const role = (user.role || 'engineer').toLowerCase();
    if (role === 'admin') return ['*'];
    if (role === 'viewer') return ['/status', '/logs', '/visualize'];
    return ['/status', '/logs', '/restart', '/visualize', '/userlist'];
}

function clip(value, width) {
    const text = String(value ?? '');
    if (text.length <= width) return text.padEnd(width, ' ');
    if (width <= 1) return text.slice(0, width);
    return `${text.slice(0, width - 1)}~`;
}

function renderAsciiTable(users) {
    const columns = [
        { key: 'username', label: 'USERNAME', width: 14 },
        { key: 'role', label: 'ROLE', width: 10 },
        { key: 'permissions', label: 'PERMISSIONS', width: 34 },
    ];

    const horizontal = `+${columns.map((c) => '-'.repeat(c.width + 2)).join('+')}+`;
    const header = `| ${columns.map((c) => clip(c.label, c.width)).join(' | ')} |`;

    const rows = users.map((user) => {
        const rowData = {
            username: user.username,
            role: user.role || 'engineer',
            permissions: normalizePermissions(user).join(', '),
        };

        return `| ${columns.map((c) => clip(rowData[c.key], c.width)).join(' | ')} |`;
    });

    if (rows.length === 0) {
        rows.push(`| ${clip('No users found in database.', columns[0].width + columns[1].width + columns[2].width + 6)} |`);
        return ['USER DIRECTORY', horizontal, rows[0], horizontal].join('\n');
    }

    return [
        'USER DIRECTORY',
        horizontal,
        header,
        horizontal,
        ...rows,
        horizontal,
    ].join('\n');
}

module.exports = {
    name: '/userlist',
    description: 'Lists created users and their permissions in an ASCII table.',
    execute: async (data, context) => {
        const { socket } = context;

        try {
            const users = await User.find({}, 'username role permissions').sort({ createdAt: 1 }).lean();
            const output = renderAsciiTable(users);

            socket.emit('receive_message', {
                sender: 'OpsBot',
                text: output,
                type: 'system',
            });
        } catch (err) {
            console.error('DB Error in /userlist:', err);
            socket.emit('receive_message', {
                sender: 'OpsBot',
                text: 'API Error: Could not fetch users for visualization.',
                type: 'system',
            });
        }
    },
};
