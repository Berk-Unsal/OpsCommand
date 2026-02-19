import { useState, useEffect } from 'react';
import io from 'socket.io-client';

// Force the connection to the backend port
const socket = io('http://localhost:4000');

function App() {
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [isConnected, setIsConnected] = useState(socket.connected);

  useEffect(() => {
    // 1. Connection Debugging
    socket.on('connect', () => {
      console.log("✅ Connected with ID:", socket.id);
      setIsConnected(true);
    });
    
    socket.on('disconnect', () => {
      console.log("❌ Disconnected");
      setIsConnected(false);
    });

    // 2. The Listener
    socket.on('receive_message', (data) => {
      console.log("📨 Incoming Message:", data); 
      // We only add the message if the SERVER sent it back
      setMessages((prevMessages) => [...prevMessages, data]);
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('receive_message');
    };
  }, []);

  const sendMessage = (e) => {
    e.preventDefault();
    if (messageInput.trim() !== '') {
      const newMessage = {
        text: messageInput,
        sender: 'Engineer-' + socket.id?.substr(0, 4) // Use real Socket ID
      };
      
      // REMOVED: Optimistic Update
      // We do NOT add it locally. We wait for the server echo.
      
      console.log("📤 Sending:", newMessage);
      socket.emit('send_message', newMessage);
      setMessageInput(''); 
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '600px', margin: '0 auto' }}>
      <h1>OpsCommand War Room</h1>
      
      {/* CONNECTION STATUS BADGE */}
      <div style={{ 
        padding: '10px', 
        backgroundColor: isConnected ? '#d4edda' : '#f8d7da', 
        color: isConnected ? '#155724' : '#721c24',
        marginBottom: '10px',
        borderRadius: '4px',
        fontWeight: 'bold'
      }}>
        STATUS: {isConnected ? '🟢 CONNECTED' : '🔴 DISCONNECTED'}
      </div>

      <div style={{ 
        border: '1px solid #ccc', 
        height: '400px', 
        overflowY: 'scroll', 
        padding: '15px', 
        marginBottom: '15px',
        backgroundColor: '#f9f9f9'
      }}>
        {messages.map((msg, index) => (
          <div key={index} style={{ color: '#333',marginBottom: '10px', padding: '5px', borderBottom: '1px solid #eee' }}>
            <strong style={{color: '#007bff'}}>{msg.sender}:</strong> {msg.text}
          </div>
        ))}
      </div>

      <form onSubmit={sendMessage} style={{ display: 'flex', gap: '10px' }}>
        <input 
          type="text" 
          value={messageInput} 
          onChange={(e) => setMessageInput(e.target.value)} 
          placeholder="Type message..."
          style={{ flex: 1, padding: '10px', fontSize: '16px' }}
        />
        <button type="submit" disabled={!isConnected} style={{ padding: '10px 20px', cursor: 'pointer' }}>
          Send
        </button>
      </form>
    </div>
  );
}

export default App;