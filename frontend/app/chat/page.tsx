"use client";

import { useState, useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import EmojiPicker from "emoji-picker-react";
import { Smile, Paperclip, Mic, Square } from "lucide-react";

type Message = {
  id?: string;
  user: string;
  text: string;
  time?: string;
  status?: string;
  image?: string;
  audio?: string;
  reactions?: { [emoji: string]: number };
};

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [username, setUsername] = useState("");
  const [typingUser, setTypingUser] = useState("");
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
const [audioBlob, setAudioBlob] = useState<string | null>(null);

const mediaRecorderRef = useRef<MediaRecorder | null>(null);
const audioChunksRef = useRef<Blob[]>([]);

  const socketRef = useRef<Socket | null>(null);
  const typingTimeoutRef = useRef<any>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);
  const [unreadCount, setUnreadCount] = useState(0);

  //  SOCKET SETUP
  useEffect(() => {
    const socket = io("http://localhost:5000");
    socketRef.current = socket;

    // FETCH MESSAGES
    fetch("http://localhost:5000/api/chat")
      .then((res) => res.json())
      .then((data) => {
        const formatted = data.map((msg: any) => ({
          id: msg.id,
          user: msg.username,
          text: msg.text,
          time: new Date(msg.created_at).toLocaleTimeString(),
          status: msg.status || "sent",
        }));
        setMessages(formatted);
      });

// NEW MESSAGE
socket.on("newMessage", (msg) => {
  // prevent duplicate message for sender
  if (msg.username === username) return;

  setMessages((prev) => [
    ...prev,
    {
      id: msg.id,
      user: msg.username,
      text: msg.text,
      time: new Date(msg.created_at).toLocaleTimeString(),
      status: msg.status,
    },
  ]);

  if (!isAtBottomRef.current) {
    setUnreadCount((prev) => prev + 1);
  }
});
    // TYPING
    socket.on("typing", (user) => {
      setTypingUser(user);

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      typingTimeoutRef.current = setTimeout(() => {
        setTypingUser("");
      }, 1500);
    });

    // ONLINE USERS
    socket.on("onlineUsers", (users) => {
      setOnlineUsers(users);
    });

    // SEEN
    socket.on("messageSeen", (messageId) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId ? { ...msg, status: "seen" } : msg
        )
      );
    });
    socket.on("reactionUpdate", ({ messageId, reactions }) => {
      setMessages((prev) =>
      prev.map((msg) =>
      msg.id === messageId ? { ...msg, reactions } : msg ));
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  //  JOIN USER
  useEffect(() => {
    if (socketRef.current && username.trim()) {
      socketRef.current.emit("join", username);
    }
  }, [username]);

  //  SMART AUTO SCROLL (FIXED)
  useEffect(() => {
    if (isAtBottomRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // MARK ONLY LAST MESSAGE AS SEEN 
  useEffect(() => {
    if (!socketRef.current) return;

    const lastMsg = messages[messages.length - 1];
    if (lastMsg?.id) {
      socketRef.current.emit("seen", lastMsg.id);
    }
  }, [messages]);

  // SEND
  async function handleSend() {
  if ((!input.trim() && !selectedImage && !audioBlob) || !username.trim()) return;

  const localMessage: Message = {
  id: Date.now().toString(),
  user: username,
  text: input,
  image: selectedImage || undefined,
  audio: audioBlob || undefined,
  time: new Date().toLocaleTimeString(),
  status: "sent",
};

  // immediately show message in UI
  setMessages((prev) => [...prev, localMessage]);

  // send text to backend
  await fetch("http://localhost:5000/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text: input,
      username,
    }),
  });

  // clear inputs
  setInput("");
  setSelectedImage(null);
  setAudioBlob(null);
  // auto scroll
  bottomRef.current?.scrollIntoView({
    behavior: "smooth",
  });
}

  // TYPING
  function handleTyping(e: any) {
    setInput(e.target.value);

    if (socketRef.current && username.trim()) {
      socketRef.current.emit("typing", username);
    }
  }
  //emoji select function
  function handleEmojiClick(emojiData: any) {
    setInput((prev) => prev + emojiData.emoji);
    setShowEmojiPicker(false);
  }
  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];

    if (!file) return;

        const imageUrl = URL.createObjectURL(file);
        setSelectedImage(imageUrl);
  }

  async function startRecording() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
    });

    const mediaRecorder = new MediaRecorder(stream);

    mediaRecorderRef.current = mediaRecorder;

    audioChunksRef.current = [];

    mediaRecorder.ondataavailable = (event) => {
      audioChunksRef.current.push(event.data);
    };

    mediaRecorder.onstop = () => {
      const audioBlob = new Blob(audioChunksRef.current, {
        type: "audio/webm",
      });

      const audioUrl = URL.createObjectURL(audioBlob);

      setAudioBlob(audioUrl);
    };

    mediaRecorder.start();

    setIsRecording(true);
  } catch (error) {
    console.error("Recording failed:", error);
  }
}
function stopRecording() {
  mediaRecorderRef.current?.stop();
  setIsRecording(false);
}

  function handleReact(messageId: string | undefined, emoji: string) {
    if (!messageId) return;

    // send reaction to server
    socketRef.current?.emit("react", { messageId, emoji, username,});
  }


  


return (
  <div className="mx-auto flex max-w-6xl flex-col gap-6 p-6 md:p-10 relative">

    <div className="rounded-3xl border border-(--line) bg-white p-6 shadow-sm">
      <h1 className="text-3xl font-bold text-slate-800">
        Team Chat
      </h1>

      <p className="mt-1 text-sm text-slate-500">
        Collaborate and communicate with your team in real time.
      </p>
    </div>

    {/* USERNAME */}
    <input
      value={username}
      onChange={(e) => setUsername(e.target.value)}
      placeholder="Enter name"
      className="w-full rounded-2xl border border-(--line) bg-white px-4 py-3 text-sm shadow-sm outline-none transition focus:border-slate-400"
    />

    {/* ONLINE USERS */}
    <div className="flex items-center gap-2 text-sm text-slate-600">
      <div className="h-2 w-2 rounded-full bg-green-500"></div>

      <span className="font-medium">
        Online:
      </span>
    <span>
      {onlineUsers.join(", ")}
    </span>
  </div>

    {/* MESSAGES */}
    <div
  ref={containerRef}
  onScroll={() => {
    const el = containerRef.current;
    if (!el) return;

    const threshold = 100;

    const atBottom =
      el.scrollHeight - el.scrollTop - el.clientHeight < threshold;

    isAtBottomRef.current = atBottom;

    //  reset unread when user reaches bottom
    if (atBottom) {
      setUnreadCount(0);
    }
  }}
  className="h-[500px] overflow-y-auto rounded-3xl border border-(--line) bg-white p-5 shadow-sm"
>
        {messages.map((msg, i) => {
          const prevMsg = messages[i - 1];
          const isSameUser = prevMsg && prevMsg.user === msg.user;
          const isMe = msg.user === username;

          return (
            <div key={i} className={`flex ${isMe ? "justify-end" : "justify-start"} ${ isSameUser ? "mt-0.5" : "mt-3"}`}>
              <div
                className={`max-w-md rounded-2xl p-4 shadow-sm ${
                  isMe
                  ? `bg-teal-700 text-white ${
                    isSameUser
                    ? "rounded-lg rounded-tr-2xl"
                    : "rounded-2xl rounded-br-md"
                  }`
                  : `bg-slate-100 text-slate-800 ${
                        isSameUser
                        ? "rounded-lg rounded-tl-2xl"
                        : "rounded-2xl rounded-bl-md"
                      }`
                    }`}
>
                {/* Show name only for others */}
                {!isMe && !isSameUser && (
                      <p className="font-semibold text-sm">{msg.user}</p>
                )}

                {msg.text && <p>{msg.text}</p>}

                {msg.image && (
                  <img src={msg.image} alt="Shared image" className="mt-2 max-h-64 rounded-xl object-cover"/>
                )}
                {msg.audio && (
                   <audio controls className="mt-3 w-[260px]">
                   <source src={msg.audio} type="audio/webm" />
                    </audio>
                )}

                  <div className="flex gap-2 mt-1 text-sm">
                  {["👍", "❤️", "😂"].map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => handleReact(msg.id, emoji)}
                      className="hover:scale-110 transition"
                      >
                        {emoji}
                      </button>
                    ))}
                  {/* counts will show here*/}
                    {msg.reactions &&
                      Object.entries(msg.reactions).filter(([_, count]) => count > 0).map(([emoji, count]) => (
                        <span
                        key={emoji}
                        className={`px-2 py-0.5 rounded-full text-xs ${isMe ? "bg-white text-black" : "bg-gray-200"}`}
                      >
                        {emoji} {count}
                      </span>
                    ))}
                  </div>

                <p className="mt-2 text-right text-[11px] opacity-60">
                  {msg.time} {msg.status === "seen" ? "✓✓" : "✓"}
                </p>
              </div>
            </div>
          );
        })}

        <div ref={bottomRef}></div>
      </div>
      {unreadCount > 0 && (
  <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-10">
    <button
      onClick={() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
        setUnreadCount(0);
      }}
      className="bg-blue-500 text-white px-4 py-1 rounded-full text-sm shadow hover:bg-blue-600 transition"
    >
      {unreadCount} New Message{unreadCount > 1 ? "s" : ""}
    </button>
  </div>
)}

      {/* TYPING */}
      {typingUser && typingUser !== username && (
        <p className="text-sm italic mt-1">
          {typingUser} is typing...
        </p>
      )}
      {selectedImage && (
  <div className="rounded-2xl border border-(--line) bg-white p-3 shadow-sm">
    <img
      src={selectedImage}
      alt="Preview"
      className="max-h-60 rounded-xl object-cover"
    />
  </div>
)}
{audioBlob && (
  <div className="rounded-2xl border border-(--line) bg-white p-4 shadow-sm">
    <audio controls className="w-full">
      <source src={audioBlob} type="audio/webm" />
    </audio>
  </div>
)}

      {/* INPUT */}
<div className="relative mt-4 flex gap-3">

  <div className="relative">
    <button
      onClick={() => setShowEmojiPicker((prev) => !prev)}
      className="flex h-full items-center rounded-2xl border border-(--line) bg-white px-4 shadow-sm transition hover:bg-slate-50"
    >
      <Smile size={20} className="text-slate-600" />
    </button>

    {showEmojiPicker && (
      <div className="absolute bottom-14 left-0 z-50">
        <EmojiPicker onEmojiClick={handleEmojiClick} />
      </div>
    )}
  </div>
  <label className="flex cursor-pointer items-center rounded-2xl border border-(--line) bg-white px-4 shadow-sm transition hover:bg-slate-50">
  <Paperclip size={20} className="text-slate-600" />

  <input
    type="file"
    accept="image/*"
    onChange={handleImageUpload}
    className="hidden"
  />
</label>
<button
  onClick={isRecording ? stopRecording : startRecording}
  className={`flex items-center rounded-2xl border border-(--line) bg-white px-4 shadow-sm transition hover:bg-slate-50 ${
    isRecording ? "text-red-500" : "text-slate-600"
  }`}
>
  {isRecording ? <Square size={20} /> : <Mic size={20} />}
</button>


  <input
    value={input}
    onChange={handleTyping}
    placeholder="Type message"
    className="flex-1 rounded-2xl border border-(--line) bg-white px-4 py-3 text-sm shadow-sm outline-none focus:border-slate-400"
  />
        <button
          onClick={handleSend}
          className="rounded-2xl bg-teal-700 px-6 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-teal-800"
        >
          Send
        </button>
      </div>
    </div>
  );
}