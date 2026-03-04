import { useState, useEffect, useRef, useCallback } from 'react';
import './TeamChat.css';

/**
 * Left panel — Team Chat (bubble-style, WhatsApp/Slack feel).
 * Listens for 'team-message' events and emits 'team-message'.
 */
export default function TeamChat({ socket, isConnected, myId }) {
  const [messages, setMessages] = useState([]);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    const onHistory = (history) => setMessages(history);
    const onMessage = (msg) => setMessages((prev) => [...prev, msg]);

    socket.on('load_chat_history', onHistory);
    socket.on('team-message', onMessage);

    return () => {
      socket.off('load_chat_history', onHistory);
      socket.off('team-message', onMessage);
    };
  }, [socket]);

  const handleSend = (e) => {
    e.preventDefault();
    const text = inputRef.current?.value?.trim();
    if (!text) return;

    socket.emit('team-message', {
      text,
      sender: 'Engineer-' + (myId?.substr(0, 4) || '????'),
    });
    inputRef.current.value = '';
  };

  /** Derive initials from the sender name */
  const initials = (name) => {
    if (!name) return '?';
    const parts = name.split('-');
    if (parts.length >= 2) return parts[1].substring(0, 2).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  /** Stable colour from sender name */
  const avatarColor = (name) => {
    const colors = ['#e06c75', '#61afef', '#c678dd', '#e5c07b', '#56b6c2', '#98c379'];
    let hash = 0;
    for (const ch of name || '') hash = ch.charCodeAt(0) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  };

  const formatTime = (ts) => {
    if (!ts) return '';
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="teamchat">
      {/* Header */}
      <div className="teamchat-header">
        <span className="teamchat-title">Team Chat</span>
        <span className={`teamchat-status ${isConnected ? 'online' : 'offline'}`}>
          {isConnected ? 'online' : 'offline'}
        </span>
      </div>

      {/* Messages */}
      <div className="teamchat-messages">
        {messages.length === 0 && (
          <div className="teamchat-empty">No messages yet. Say hi to your team!</div>
        )}
        {messages.map((msg, i) => {
          const isMe = msg.sender?.startsWith('Engineer-') && msg.sender?.endsWith(myId?.substr(0, 4));
          return (
            <div key={msg._id || i} className={`bubble-row ${isMe ? 'me' : 'them'}`}>
              {!isMe && (
                <div className="avatar" style={{ background: avatarColor(msg.sender) }}>
                  {initials(msg.sender)}
                </div>
              )}
              <div className="bubble-wrapper">
                {!isMe && <span className="bubble-sender">{msg.sender}</span>}
                <div className={`bubble ${isMe ? 'bubble-me' : 'bubble-them'}`}>
                  <span className="bubble-text">{msg.text}</span>
                  <span className="bubble-time">{formatTime(msg.timestamp)}</span>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form className="teamchat-input-area" onSubmit={handleSend}>
        <input
          ref={inputRef}
          type="text"
          className="teamchat-input"
          placeholder={isConnected ? 'Message your team…' : 'disconnected'}
          disabled={!isConnected}
          autoComplete="off"
          spellCheck={true}
        />
        <button type="submit" className="teamchat-send" disabled={!isConnected}>
          &#10148;
        </button>
      </form>
    </div>
  );
}
