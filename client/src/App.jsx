import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import { Activity, Send } from "lucide-react"; // 'Send' icon UI
import "./App.css";

const socket = io("http://localhost:5000", {
  autoConnect: false,
});

function App() {
  const [isConnected, setIsConnected] = useState(false);

  // States:
  const [message, setMessage] = useState(""); // user input box typed message
  const [chat, setChat] = useState([]); // Messages list on screen

  useEffect(() => {
    socket.connect();

    function onConnect() {
      setIsConnected(true);
    }

    function onDisconnect() {
      setIsConnected(false);
    }

    // When new messages comes from server
    function onReceiveMessage(payload) {
      // Appending new messages on old chat array
      setChat((prevChat) => [...prevChat, payload]);
    }

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("receive_message", onReceiveMessage); // Listener Activated

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("receive_message", onReceiveMessage); // Cleanup
      socket.disconnect();
    };
  }, []);

  // When user submits form
  const handleSendMessage = (e) => {
    e.preventDefault(); // Page refresh stopped
    if (message.trim()) {
      // emit payload on server
      socket.emit("send_message", {
        id: Date.now(), // React (unique ID)
        text: message,
      });
      setMessage(""); // Empty input box after sending message
    }
  };

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
      <div className="w-full max-w-2xl bg-slate-800 border border-slate-700 rounded-xl shadow-2xl flex flex-col h-[60vh]">
        {/* Messages Area  */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4">
          {chat.length === 0 ? (
            <p className="text-slate-500 text-center mt-10">
              No messages yet. Start the conversation!
            </p>
          ) : (
            chat.map((msg) => (
              <div
                key={msg.id}
                className="bg-slate-700/50 p-3 rounded-lg w-fit max-w-[80%]"
              >
                <p className="text-slate-200">{msg.text}</p>
              </div>
            ))
          )}
        </div>

        {/* Input Form */}
        <form
          onSubmit={handleSendMessage}
          className="p-4 bg-slate-800/80 border-t border-slate-700 flex gap-2 rounded-b-xl"
        >
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
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
