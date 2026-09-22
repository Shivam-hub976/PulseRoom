import { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";
import { Activity, Send, User } from "lucide-react"; // Added 'User' icon for login screen

const socket = io("http://localhost:5000", {
  autoConnect: false,
});

function App() {
  // Session Identity States
  const [isConnected, setIsConnected] = useState(false);
  const [isJoined, setIsJoined] = useState(false);
  const [username, setUsername] = useState("");

  // Chat and Typing States
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);

  // Reference for typing timeout to clear it later
  const typingTimeoutRef = useRef(null);

  // Chat end point refference
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat, typingUsers]);

  useEffect(() => {
    // Do not connect to socket until user enters their name
    if (!isJoined) return;

    socket.connect();

    function onConnect() {
      setIsConnected(true);
    }

    function onDisconnect() {
      setIsConnected(false);
    }

    function onReceiveMessage(payload) {
      setChat((prevChat) => [...prevChat, payload]);
    }

    function onUserTyping(name) {
      // Add user to typing array if they are not already in it
      setTypingUsers((prev) => (prev.includes(name) ? prev : [...prev, name]));
    }

    function onUserStoppedTyping(name) {
      // Remove user from typing array
      setTypingUsers((prev) => prev.filter((user) => user !== name));
    }

    // Register Event Listeners
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("receive_message", onReceiveMessage);
    socket.on("user_typing", onUserTyping);
    socket.on("user_stopped_typing", onUserStoppedTyping);

    return () => {
      // Cleanup listeners and disconnect on unmount
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("receive_message", onReceiveMessage);
      socket.off("user_typing", onUserTyping);
      socket.off("user_stopped_typing", onUserStoppedTyping);
      socket.disconnect();
    };
  }, [isJoined]); // Re-run effect only when isJoined changes

  // Form handler for Joining the room
  const handleJoin = (e) => {
    e.preventDefault();
    if (username.trim()) {
      setIsJoined(true);
    }
  };

  // Form handler for sending messages
  const handleSendMessage = (e) => {
    e.preventDefault();
    if (message.trim()) {
      socket.emit("send_message", {
        id: Date.now(),
        text: message,
        sender: username, // Attach identity to message
      });
      setMessage("");

      // Stop typing immediately when message is sent
      socket.emit("stop_typing", username);
    }
  };

  // Input handler for typing indicator logic
  const handleTyping = (e) => {
    setMessage(e.target.value);

    // Notify server that this user is typing
    socket.emit("typing", username);

    // Clear existing timeout to reset the timer
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    // Set a new timeout to stop typing after 1.5 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("stop_typing", username);
    }, 1500);
  };

  // UI: Pre-connection Join Screen
  if (!isJoined) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-slate-100 p-4 font-sans">
        <form
          onSubmit={handleJoin}
          className="bg-slate-800 p-8 rounded-xl shadow-2xl max-w-sm w-full border border-slate-700 flex flex-col items-center"
        >
          <div className="bg-indigo-500/20 p-4 rounded-full mb-6">
            <User className="text-indigo-400" size={40} />
          </div>
          <h2 className="text-2xl font-bold mb-6 text-center">
            Join PulseRoom
          </h2>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter your name..."
            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 focus:outline-none focus:border-indigo-500 transition-colors text-center mb-4"
            autoFocus
          />
          <button
            type="submit"
            disabled={!username.trim()}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition-colors"
          >
            Enter Workspace
          </button>
        </form>
      </div>
    );
  }

  // UI: Main Chat Interface
  return (
    <div className="flex flex-col items-center min-h-screen bg-slate-900 text-slate-100 p-4 font-sans">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 mt-8">
        <Activity
          className={isConnected ? "text-emerald-400" : "text-rose-400"}
          size={32}
        />
        <h1 className="text-3xl font-bold tracking-tight text-white">
          PulseRoom
        </h1>
      </div>

      {/* Chat Container */}
      <div className="w-full max-w-2xl bg-slate-800 border border-slate-700 rounded-xl shadow-2xl flex flex-col h-[70vh]">
        {/* Status Bar */}
        <div className="bg-slate-900/50 p-3 rounded-t-xl border-b border-slate-700 flex justify-between items-center text-sm text-slate-400">
          <span>
            Logged in as <strong className="text-indigo-400">{username}</strong>
          </span>
          {isConnected ? (
            <span className="text-emerald-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>{" "}
              Connected
            </span>
          ) : (
            <span className="text-rose-400">Disconnected</span>
          )}
        </div>

        {/* Messages Area */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4">
          {chat.length === 0 ? (
            <p className="text-slate-500 text-center mt-10">
              No messages yet. Start the conversation!
            </p>
          ) : (
            chat.map((msg) => {
              // Check if the current user is the sender
              const isMe = msg.sender === username;

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                >
                  {!isMe && (
                    <span className="text-xs text-slate-400 mb-1 ml-1">
                      {msg.sender}
                    </span>
                  )}
                  <div
                    className={`p-3 max-w-[80%] ${
                      isMe
                        ? "bg-indigo-600 text-white rounded-2xl rounded-tr-sm"
                        : "bg-slate-700 text-slate-100 rounded-2xl rounded-tl-sm"
                    }`}
                  >
                    <p>{msg.text}</p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Typing Indicator Bar */}
        <div className="h-8 px-4 flex items-center text-xs text-indigo-400 font-medium italic bg-slate-800">
          {typingUsers.length > 0 && (
            <span>
              {typingUsers.join(", ")} {typingUsers.length > 1 ? "are" : "is"}{" "}
              typing...
            </span>
          )}
        </div>

        {/* Input Form */}
        <form
          onSubmit={handleSendMessage}
          className="p-4 bg-slate-900/50 border-t border-slate-700 flex gap-2 rounded-b-xl"
        >
          <input
            type="text"
            value={message}
            onChange={handleTyping}
            placeholder="Type a message..."
            className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 focus:outline-none focus:border-indigo-500 transition-colors"
          />
          <button
            type="submit"
            disabled={!isConnected || !message.trim()}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg transition-colors flex items-center justify-center"
          >
            <Send size={20} />
          </button>
        </form>
      </div>
    </div>
  );
}

export default App;
