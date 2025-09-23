import { useState, useRef, useEffect } from 'react';
import { Send, Check, CheckCheck, Clock, User, Building2, X } from 'lucide-react';
import './ChatComponent.css';
import { getAuth } from 'firebase/auth';

const ChatComponent = ({ plannerId, vendorId, eventId, currentUser, otherUser, closeChat}) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

 function formatDate(date) {
    if (!date) return "";

    if(typeof date === 'object' && typeof date._seconds === 'number' && typeof date._nanoseconds === 'number') {
      const jsDate = new Date( date._seconds * 1000 + date._nanoseconds / 1e6);
      return jsDate.toLocaleTimeString();
    }

    // Already a JS Date
    if (date instanceof Date) {
      return date.toLocaleTimeString();
    }

    // String
    if (typeof date === "string") {
      return new Date(date).toLocaleTimeString();
    }

    return String(date); // fallback
}

    const fetchMessages = async( eventId, plannerId, vendorId) => {
            const auth = getAuth();
            const user = auth.currentUser;
            const token = await user.getIdToken(true);

            const res = await fetch(`https://us-central1-planit-sdp.cloudfunctions.net/api/chats/${eventId}/${plannerId}/${vendorId}/messages`, {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });

            if(!res){
                console.error("Could not fetch messages");
            }
            const data = await res.json();
            return data.messages;
    }

    const sendMessage = async(eventId, plannerId, vendorId, content) => {
        const auth = getAuth();
        const user = auth.currentUser;
        const token = await user.getIdToken(true);

        const res = await fetch(`https://us-central1-planit-sdp.cloudfunctions.net/api/chats/${eventId}/${plannerId}/${vendorId}/messages`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(content)
        });

        if(!res){
            const err = await res.json();
            console.log(err);
        }

    }

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const loadMessages = async () => {
        const mess = await fetchMessages(eventId, plannerId, vendorId);
        if(!mess){
            alert("Failed to fetch messages");
            return;
        }
        setMessages(mess);
        console.log("Messages: ", messages);
    }

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        console.log("IDS: VENDOR: ", vendorId, "PLANNER: ", plannerId, "EVENT: ", eventId);
        loadMessages();
    }, [])


    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (newMessage.trim()) {
        const message = {
            id: Date.now().toString(),
            senderId: currentUser.id,
            senderName: currentUser.name,
            senderType: currentUser.type,
            content: newMessage.trim(),
            timestamp: new Date(),
            status: 'sent'
        };

        const res = await sendMessage(eventId, plannerId, vendorId, message);
        
        setMessages(prev => [...prev, message]);
        setNewMessage('');
        
        // Simulate message delivery
        setTimeout(() => {
            setMessages(prev => 
            prev.map(msg => 
                msg.id === message.id 
                ? { ...msg, status: 'delivered' }
                : msg
            )
            );
        }, 1000);
        }
    };

    const formatTime = (timestamp) => {
        return new Date(timestamp).toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
        });
    };

    const getMessageStatus = (status) => {
        switch (status) {
        case 'sent':
            return <Check className="message-status" size={14} />;
        case 'delivered':
            return <CheckCheck className="message-status" size={14} />;
        case 'read':
            return <CheckCheck className="message-status read" size={14} />;
        default:
            return <Clock className="message-status" size={14} />;
        }
    };

  return (
    <section className='chat-container-overlay'>
        <section className="chat-container" role="main" aria-label="Chat conversation">
        <header className="chat-header">
            <section className="chat-participants">
            <section className="participant">
                {currentUser.type === 'vendor' ? <Building2 size={20} /> : <User size={20} />}
                <span>{currentUser.name}</span>
                <span className="participant-type">({currentUser.type})</span>
            </section>
            <section className="chat-sectionider">↔</section>
            <section className="participant">
                {otherUser.type === 'vendor' ? <Building2 size={20} /> : <User size={20} />}
                <span>{otherUser.name}</span>
                <span className="participant-type">({otherUser.type})</span>
            </section>
            </section>
            <section className="service-context">
            <button onClick={() => closeChat()}><X/></button>
            </section>
        </header>

        <main className="messages-container" role="log" aria-label="Chat messages">
            <section className="messages-list">
            {messages.map((message) => (
                <article 
                key={message.id}
                className={`message ${message.senderId === currentUser.id ? 'sent' : 'received'}`}
                aria-label={`Message from ${message.senderName}`}
                >
                <section className="message-content">
                    <section className="message-header">
                    <span className="sender-name">{message.senderName}</span>
                    <span className="sender-type">({message.senderType})</span>
                    <time className="message-time" dateTime={formatDate(message.createdAt)}>
                        {formatDate(message.createdAt)}
                    </time>
                    </section>
                    <section className="message-text">{message.content}</section>
                    {message.senderId === currentUser.id && (
                    <section className="message-status-container">
                        {getMessageStatus(message.status)}
                    </section>
                    )}
                </section>
                </article>
            ))}
            
            {isTyping && (
                <section className="typing-indicator" aria-label={`${otherUser.name} is typing`}>
                <section className="typing-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                </section>
                <span className="typing-text">{otherUser.name} is typing...</span>
                </section>
            )}
            
            <section ref={messagesEndRef} />
            </section>
        </main>

        <footer className="message-input-container">
            <form onSubmit={handleSendMessage} className="message-form">
            <label htmlFor="message-input" className="sr-only">
                Type your message
            </label>
            <textarea
                id="message-input"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder={`Message ${otherUser.name}...`}
                className="message-input"
                rows="1"
                onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage(e);
                }
                }}
                aria-describedby="message-help"
            />
            <section id="message-help" className="sr-only">
                Press Enter to send, Shift+Enter for new line
            </section>
            <button 
                type="submit" 
                className="send-button"
                disabled={!newMessage.trim()}
                aria-label="Send message"
            >
                <Send size={20} />
            </button>
            </form>
        </footer>
        </section>
    </section>
  );
};

export default ChatComponent;