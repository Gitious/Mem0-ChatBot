// app/page.jsx
'use client';
import { useState } from 'react';

export default function ChatPage() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  // You can hardcode a userId or add a login mechanism later
  const userId = 'user123';

  async function sendMessage() {
    if (!input.trim()) return;
    
    // Append user message locally
    const userMsg = { role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    
    // Clear the input immediately after sending the message
    setInput('');
    
    setLoading(true);
    
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, message: input }),
      });
      const data = await res.json();
      const assistantMsg = { role: 'assistant', content: data.response };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Error: Unable to get response.' }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center p-4">
      <h1 className="text-3xl font-bold mb-4">Mem0 Chatbot</h1>
      <div className="w-full max-w-xl border p-4 rounded-md mb-4 h-96 overflow-y-auto bg-gray-80">
        {messages.map((msg, idx) => (
          <div key={idx} className={`mb-2 text-${msg.role === 'user' ? 'right' : 'left'}`}>
            <strong>{msg.role === 'user' ? 'You' : 'Assistant'}:</strong>
            <p className="inline-block p-2 rounded-md bg-white shadow text-black">{msg.content}</p>
          </div>
        ))}
        {loading && <p>Loading...</p>}
      </div>
      <div className="w-full max-w-xl flex">
        <input
          type="text"
          className="flex-1 p-2 border rounded-l-md text-black"
          placeholder="Type your message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
        />
        <button
          className="p-2 bg-blue-500 text-white rounded-r-md"
          onClick={sendMessage}
          disabled={loading}
        >
          Send
        </button>
      </div>
    </div>
  );
}
