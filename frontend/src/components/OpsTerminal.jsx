import { useState, useEffect, useRef, useCallback } from 'react';
import './OpsTerminal.css';

/**
 * Detect whether a string looks like JSON or structured log output.
 */
function looksLikeCodeBlock(text) {
  if (!text) return false;
  const trimmed = text.trim();
  if (
    (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
    (trimmed.startsWith('[') && trimmed.endsWith(']'))
  ) {
    return true;
  }
  const lines = trimmed.split('\n');
  if (lines.length >= 3) return true;
  if (/\w+[=:]\s?\S/.test(trimmed) && trimmed.includes('\n')) return true;
  return false;
}

/**
 * Classify message severity from text content.
 */
function classifyMessage(text) {
  if (!text) return 'info';
  const lower = text.toLowerCase();
  if (/\berror\b|failed|exception|fatal|✗|✘|❌/.test(lower)) return 'error';
  if (/\bsuccess\b|completed|✓|✔|✅|running|ready|healthy/.test(lower)) return 'success';
  if (/\bwarn(ing)?\b|⚠|caution/.test(lower)) return 'warning';
  return 'info';
}

/**
 * Try to pretty-print JSON.
 */
function tryPrettyJson(text) {
  try {
    const parsed = JSON.parse(text.trim());
    return JSON.stringify(parsed, null, 2);
  } catch {
    return null;
  }
}

/**
 * Right panel — Ops Terminal (monospace, log-line style).
 * Listens for 'ops-log' events and emits 'ops-command'.
 */
export default function OpsTerminal({ socket, isConnected, myId }) {
  const [logs, setLogs] = useState([]);
  const [input, setInput] = useState('');
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const outputRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [logs, scrollToBottom]);

  useEffect(() => {
    const onOpsHistory = (history) => setLogs(history);
    const onOpsLog = (msg) => setLogs((prev) => [...prev, msg]);
    const onClearTerminal = () => setLogs([]);

    socket.on('load_ops_history', onOpsHistory);
    socket.on('ops-log', onOpsLog);
    socket.on('clear-ops-terminal', onClearTerminal);

    return () => {
      socket.off('load_ops_history', onOpsHistory);
      socket.off('ops-log', onOpsLog);
      socket.off('clear-ops-terminal', onClearTerminal);
    };
  }, [socket]);

  // Keep input focused when clicking the output area
  const handleOutputClick = () => inputRef.current?.focus();

  const handleSend = (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;

    // Ensure it's treated as a command (prefix / if missing)
    const commandText = text.startsWith('/') ? text : `/${text}`;

    socket.emit('ops-command', {
      text: commandText,
      sender: 'Engineer-' + (myId?.substr(0, 4) || '????'),
    });

    setInput('');
  };

  const renderLog = (msg, index) => {
    const isBot = msg.sender === 'OpsBot';
    const severity = isBot ? classifyMessage(msg.text) : 'info';
    const hasCodeBlock = isBot && looksLikeCodeBlock(msg.text);

    if (!isBot) {
      return (
        <div key={msg._id || index} className="ops-line user-input">
          <span className="ops-prompt">&#10148; ~</span>
          <span className="ops-text">{msg.text}</span>
        </div>
      );
    }

    const prettyJson = tryPrettyJson(msg.text);

    return (
      <div key={msg._id || index} className={`ops-line bot-output msg-${severity}`}>
        {hasCodeBlock || prettyJson ? (
          <pre className="ops-pre">{prettyJson || msg.text}</pre>
        ) : (
          <span className="ops-text">{msg.text}</span>
        )}
      </div>
    );
  };

  return (
    <div className="ops-terminal">
      {/* Header */}
      <div className="ops-header">
        <div className="ops-header-left">
          <span className="ops-dot red" />
          <span className="ops-dot yellow" />
          <span className="ops-dot green" />
          <span className="ops-header-title">The Terminal</span>
        </div>
        <div className="ops-header-status">
          <span className={`ops-status-dot ${isConnected ? 'online' : 'offline'}`} />
          {isConnected ? 'connected' : 'disconnected'}
        </div>
      </div>

      {/* Output */}
      <div className="ops-output" ref={outputRef} onClick={handleOutputClick}>
        <div className="ops-welcome">OpsCommand v1.0.0 — Kubernetes Operations Terminal</div>
        <div className="ops-welcome dim">
          Type a command to get started. Try <span style={{ color: '#dcdcaa' }}>/help</span> for
          available commands.
        </div>
        <br />

        {logs.map((msg, i) => renderLog(msg, i))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form className="ops-input-area" onSubmit={handleSend}>
        <span className="ops-input-prompt">&#10148; ~</span>
        <input
          ref={inputRef}
          type="text"
          className="ops-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={isConnected ? '' : 'disconnected...'}
          disabled={!isConnected}
          autoComplete="off"
          spellCheck={false}
        />
        <span className="ops-cursor" />
      </form>
    </div>
  );
}
