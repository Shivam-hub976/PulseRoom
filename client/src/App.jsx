import { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";
import { Activity, Send, User, Hash } from "lucide-react"; // NAYA: 'Hash' icon add kiya Room ke liye

const socket = io("http://localhost:5000", {
  autoConnect: false,
});

function App() {
  // Session Identity States
  const [isConnected, setIsConnected] = useState(false);
  const [isJoined, setIsJoined] = useState(false);
  const [username, setUsername] = useState("");
  const [room, setRoom] = useState("General"); // Room state

  // Chat and Typing States
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);

  // Reference for typing timeout to clear it later
  const typingTimeoutRef = useRef(null);

  // Chat end point refference
  const messagesEndRef = useRef(null);

  // Auto-scroll effect
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat, typingUsers]);

  useEffect(() => {
    // Do not connect to socket until user enters their name
    if (!isJoined) return;

    socket.connect();

    function onConnect() {
      setIsConnected(true);
      // After connecting, tell server which room it belongs to
      socket.emit("join_room", room);
    }

    function onDisconnect() {
      setIsConnected(false);
    }

    function onReceiveMessage(payload) {
      setChat((prevChat) => [...prevChat, payload]);
    }

    function onUserTyping(name) {
      setTypingUsers((prev) => (prev.includes(name) ? prev : [...prev, name]));
    }

    function onUserStoppedTyping(name) {
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
  }, [isJoined, room]); // Passed room in array as well as isJoined

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
        sender: username,
        room: room, // Along with message
      });
      setMessage("");

      // Now stop typing includes both room and username
      socket.emit("stop_typing", { username, room });
    }
  };

  // Input handler for typing indicator logic
  const handleTyping = (e) => {
    setMessage(e.target.value);

    // Typing - room added
    socket.emit("typing", { username, room });

    // Clear existing timeout to reset the timer
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    // Set a new timeout to stop typing after 1.5 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("stop_typing", { username, room }); // room added
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

          {/* Dropdown for selecting Room */}
          <div className="w-full relative mb-6">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Hash className="text-slate-400" size={18} />
            </div>
            <select
              value={room}
              onChange={(e) => setRoom(e.target.value)}
              className="w-full bg-slate-900 border border-slate-600 rounded-lg pl-10 pr-4 py-3 focus:outline-none focus:border-indigo-500 transition-colors appearance-none text-slate-200"
            >
              <option value="General">General</option>
              <option value="Tech Support">Tech Support</option>
              <option value="Off-Topic">Off-Topic</option>
            </select>
          </div>

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
          {/* Showing room on status bar */}
          <div className="flex items-center gap-2">
            <span>
              Logged in as{" "}
              <strong className="text-indigo-400">{username}</strong>
            </span>
            <span className="bg-slate-700 px-2 py-0.5 rounded text-xs flex items-center gap-1">
              <Hash size={12} /> {room}
            </span>
          </div>
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
            <div className="text-slate-500 text-center mt-10 flex flex-col items-center">
              <Hash size={40} className="mb-2 opacity-50" />
              <p>
                Welcome to <strong>#{room}</strong>
              </p>
              <p className="text-sm">Start the conversation!</p>
            </div>
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
            placeholder={`Message #${room}...`}
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
