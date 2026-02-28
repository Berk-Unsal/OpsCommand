import { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';

// Use Vite's environment variable system, but fallback to localhost for Skaffold
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://opscommand.local';
const socket = io(BACKEND_URL, {
    transports: ['websocket'] // Skip the coin flip, go straight to the persistent socket
});

function App() {
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [isConnected, setIsConnected] = useState(socket.connected);
  
  // NEW: Reference to the bottom of the chat for auto-scrolling
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    socket.on('connect', () => setIsConnected(true));
    socket.on('disconnect', () => setIsConnected(false));
    
    socket.on('load_history', (history) => setMessages(history));
    
    socket.on('receive_message', (data) => {
      setMessages((prev) => [...prev, data]);
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('load_history');
      socket.off('receive_message');
    };
  }, []);

  const sendMessage = (e) => {
    e.preventDefault();
    if (messageInput.trim() !== '') {
      const newMessage = {
        text: messageInput,
        sender: 'Engineer-' + socket.id?.substr(0, 4)
      };
      socket.emit('send_message', newMessage);
      setMessageInput(''); 
    }
  };

  return (
    <div style={{ 
      backgroundColor: '#0d1117', // Deep GitHub Dark background
      color: '#c9d1d9', 
      minHeight: '100vh', 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center',
      fontFamily: "'Courier New', Courier, monospace", // Terminal font
      padding: '20px',
      margin: '-8px' // Reset default browser margin
    }}>
      
      <div style={{ width: '100%', maxWidth: '800px' }}>
        
        {/* Header */}
        <h1 style={{ color: '#58a6ff', borderBottom: '2px solid #30363d', paddingBottom: '10px', marginTop: '0' }}>
          Terminal // OpsCommand
        </h1>

        {/* Status Bar */}
        <div style={{ 
          backgroundColor: isConnected ? '#238636' : '#da3633', 
          color: '#ffffff', 
          padding: '8px 12px', 
          borderRadius: '6px', 
          marginBottom: '15px',
          fontWeight: 'bold',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <span style={{ display: 'inline-block', width: '10px', height: '10px', backgroundColor: '#fff', borderRadius: '50%' }}></span>
          {isConnected ? 'SYSTEM ONLINE' : 'SYSTEM OFFLINE - RECONNECTING...'}
        </div>

        {/* Chat Box */}
        <div style={{ 
          backgroundColor: '#161b22', 
          border: '1px solid #30363d', 
          borderRadius: '6px',
          height: '500px', 
          overflowY: 'auto', 
          padding: '20px', 
          marginBottom: '15px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
        }}>
          {messages.length === 0 ? (
            <p style={{ color: '#8b949e', fontStyle: 'italic' }}>Awaiting incident reports...</p>
          ) : null}
          
          {messages.map((msg, index) => {
            // Check if the message is from our bot
            const isBot = msg.sender === 'OpsBot';
            
            return (
              <div key={index} style={{ 
                marginBottom: '12px', 
                padding: '10px', 
                backgroundColor: isBot ? '#1f2428' : 'transparent', 
                borderLeft: isBot ? '4px solid #e3b341' : 'none', // Yellow accent for bot
                borderRadius: '4px'
              }}>
                <strong style={{ color: isBot ? '#e3b341' : '#79c0ff' }}>
                  {msg.sender}:
                </strong> 
                <span style={{ 
                marginLeft: '10px', 
                color: isBot ? '#d2a8ff' : '#c9d1d9',
                whiteSpace: 'pre-wrap',      // <-- This tells React to respect the \n line breaks
                wordBreak: 'break-word'      // <-- This prevents long text from pushing outside the box
              }}>
                {msg.text}
              </span>
              </div>
            )
          })}
          {/* Invisible div to pull the scrollbar down */}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Form */}
        <form onSubmit={sendMessage} style={{ display: 'flex', gap: '10px' }}>
          <input 
            type="text" 
            value={messageInput} 
            onChange={(e) => setMessageInput(e.target.value)} 
            placeholder="Enter command (e.g., /status) or message..."
            style={{ 
              flex: 1, 
              padding: '15px', 
              fontSize: '16px',
              backgroundColor: '#0d1117',
              border: '1px solid #30363d',
              borderRadius: '6px',
              color: '#c9d1d9',
              fontFamily: 'inherit',
              outline: 'none'
            }}
            onFocus={(e) => e.target.style.borderColor = '#58a6ff'}
            onBlur={(e) => e.target.style.borderColor = '#30363d'}
          />
          <button 
            type="submit" 
            disabled={!isConnected} 
            style={{ 
              padding: '0 30px', 
              fontSize: '16px', 
              cursor: isConnected ? 'pointer' : 'not-allowed',
              backgroundColor: '#238636',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              fontWeight: 'bold',
              fontFamily: 'inherit',
              transition: 'background-color 0.2s'
            }}
          >
            EXECUTE
          </button>
        </form>

      </div>
    </div>
  );
}

export default App;