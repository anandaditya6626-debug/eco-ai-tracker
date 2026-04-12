import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'

const QUICK_PROMPTS = [
  "Give me tips to reduce my carbon footprint today",
  "How does my diet affect CO₂ emissions?",
  "What's the best transport option for the planet?",
  "How can I reduce my electricity usage?",
  "What do my eco points mean?",
]

function Message({ msg }) {
  const isBot = msg.role === 'assistant'
  return (
    <div className={`chat-msg ${isBot ? 'bot' : 'user'}`}>
      {isBot && <div className="chat-avatar">🤖</div>}
      <div className="chat-bubble">
        <p>{msg.content}</p>
        <span className="chat-time">{msg.time}</span>
      </div>
      {!isBot && <div className="chat-avatar user-av">👤</div>}
    </div>
  )
}

export default function Chat() {
  const { user } = useAuth()
  const { entries, ecoPoints, streak, badges } = useData()
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `Hi ${user?.name || 'there'}! 🌿 I'm your Eco AI Tracker AI assistant. Ask me for eco tips, explain your carbon data, or get personalized advice to reduce your footprint!`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }
  ])
  const [input, setInput]     = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)
  const [isListening, setIsListening] = useState(false)
  const recognitionRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => setIsListening(true);
      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInput(prev => prev ? prev + ' ' + transcript : transcript);
      };
      recognition.onerror = (event) => console.error('Speech recognition error:', event.error);
      recognition.onend = () => setIsListening(false);
      
      recognitionRef.current = recognition;
    }
  }, []);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      recognitionRef.current?.start();
    }
  };

  const sendMessage = async (text) => {
    const userText = (text || input).trim()
    if (!userText) return

    const userMsg = {
      role: 'user', content: userText,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }
    setMessages(m => [...m, userMsg])
    setInput('')
    setLoading(true)

    try {
      const avgCO2 = entries.length > 0 ? (entries.reduce((s,e) => s+e.totalCO2, 0) / entries.length).toFixed(1) : 0
      
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMsg].map(m => ({ role: m.role, content: m.content })),
          context: {
            name: user?.name,
            ecoPoints,
            streak,
            badgesCount: badges.length,
            avgCO2
          }
        })
      });

      const rawText = await response.text();
      let data = {};
      try {
        data = rawText ? JSON.parse(rawText) : {};
      } catch {
        throw new Error('Server returned an invalid response. Is the backend running?');
      }

      if (!response.ok) throw new Error(data.error || 'Failed to get response');

      setMessages(m => [...m, data]);
    } catch (err) {
      console.error('Chat error:', err);
      setMessages(m => [...m, {
        role: 'assistant',
        content: `❌ ${err.message || 'I encountered an error. Please check your internet connection or API key.'} 🌿`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }]);
    } finally {
      setLoading(false);
    }
  }

  const handleKey = e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  return (
    <div className="page chat-page">
      <div className="page-header">
        <div>
          <h1>🤖 AI Eco Assistant</h1>
          <p className="page-sub">Powered by Gemini AI — personalized advice based on your carbon data.</p>
        </div>
        <div className="ai-status">
          <span className="status-dot" />
          AI Online
        </div>
      </div>

      <div className="chat-layout">
        {/* ── Chat Window ── */}
        <div className="chat-window glass-card">
          <div className="chat-messages">
            {messages.map((m, i) => <Message key={i} msg={m} />)}
            {loading && (
              <div className="chat-msg bot">
                <div className="chat-avatar">🤖</div>
                <div className="chat-bubble typing">
                  <span /><span /><span />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="chat-input-area">
            <textarea
              className="chat-input"
              placeholder="Ask me anything about your carbon footprint…"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              rows={2}
              disabled={loading}
            />
            {recognitionRef.current && (
              <button 
                className={`chat-mic ${isListening ? 'listening' : ''}`} 
                onClick={toggleListening}
                title="Voice Input"
                disabled={loading}
              >
                {isListening ? '🎙️' : '🎤'}
              </button>
            )}
            <button className="chat-send btn-primary" onClick={() => sendMessage()} disabled={!input.trim() || loading}>
              {loading ? '⏳' : '➤'}
            </button>
          </div>
        </div>

        {/* ── Side Panel ── */}
        <div className="chat-sidebar">
          <div className="sidebar-card glass-card">
            <h3>💡 Quick Questions</h3>
            <div className="quick-btns">
              {QUICK_PROMPTS.map(p => (
                <button key={p} className="quick-btn" onClick={() => sendMessage(p)} disabled={loading}>
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div className="sidebar-card glass-card">
            <h3>🌍 Your Context</h3>
            <div className="ctx-row"><span>Eco Points</span><strong>⚡ {ecoPoints}</strong></div>
            <div className="ctx-row"><span>Streak</span><strong>🔥 {streak} days</strong></div>
            <div className="ctx-row"><span>Badges</span><strong>🏅 {badges.length} earned</strong></div>
          </div>

          <div className="sidebar-card glass-card fact-card">
            <h3>🌱 Eco Fact</h3>
            <p>The average person produces 4–8 kg of CO₂ per day. Vegetarians produce up to <strong>50% less</strong> food-related emissions than meat-eaters.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
