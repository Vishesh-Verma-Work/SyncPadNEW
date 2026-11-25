
import { useState, useEffect } from "react";
import { io } from "socket.io-client";
import "./App.css";

const socket = io("http://localhost:5000", {
  autoConnect: false,
});

function App() {
  const [username, setUsername] = useState("");
  const [roomInput, setRoomInput] = useState("");
  const [roomId, setRoomId] = useState("");
  const [documentText, setDocumentText] = useState("");
  const [currentUser, setCurrentUser] = useState("");
  const [page, setPage] = useState("home");
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);

  const [activeUsers, setActiveUsers] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState("Connecting...");

  // Generate unique room ID
  const generateRoomId = () => {
    return (
      "SP-" +
      Math.random().toString(36).substring(2, 8).toUpperCase()
    );
  };

  // Connect to backend and listen for events
  useEffect(() => {
    socket.connect();

    socket.on("connect", () => {
      setConnectionStatus("Connected");
    });

    socket.on("disconnect", () => {
      setConnectionStatus("Disconnected");
    });

    socket.on("room-joined", (data) => {
      setDocumentText(data.content);
      setActiveUsers(data.users);
      setMessage("");
    });

    socket.on("document-update", (data) => {
      setDocumentText(data.content);
    });

    socket.on("user-joined", (data) => {
      setActiveUsers(data.users);
    });

    socket.on("user-left", (data) => {
      setActiveUsers(data.users);
    });

    socket.on("room-error", (error) => {
      setMessage(error);
    });

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, []);

  // Automatically join room when editor opens
  useEffect(() => {
    if (page !== "editor" || !roomId || !currentUser) {
      return;
    }

    const joinRoom = () => {
      socket.emit("join-room", {
        roomId,
        username: currentUser,
      });
    };

    if (socket.connected) {
      joinRoom();
    } else {
      socket.once("connect", joinRoom);
    }

    return () => {
      socket.off("connect", joinRoom);
    };
  }, [page, roomId, currentUser]);

  // Create new room
  const handleCreateRoom = () => {
    if (!username.trim()) {
      setMessage("Please enter your username first.");
      return;
    }

    const newRoomId = generateRoomId();

    setCurrentUser(username.trim());
    setRoomId(newRoomId);
    setDocumentText("");
    setMessage("");
    setPage("editor");
  };

  // Join existing room
  const handleJoinRoom = () => {
    if (!username.trim()) {
      setMessage("Please enter your username first.");
      return;
    }

    if (!roomInput.trim()) {
      setMessage("Please enter a Room ID.");
      return;
    }

    setCurrentUser(username.trim());
    setRoomId(roomInput.trim().toUpperCase());
    setMessage("");
    setPage("editor");
  };

  // Copy room ID
  const handleCopyRoomId = async () => {
    try {
      await navigator.clipboard.writeText(roomId);
      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (error) {
      setMessage(error + "Unable to copy Room ID.");
    }
  };

  // Leave room
  const handleLeaveRoom = () => {
    if (socket.connected) {
      socket.emit("leave-room");
    }

    setPage("home");
    setRoomId("");
    setRoomInput("");
    setDocumentText("");
    setMessage("");
    setCopied(false);
    setActiveUsers([]);
    setCurrentUser("");
  };

  // Handle document changes
  const handleDocumentChange = (e) => {
    const newText = e.target.value;

    setDocumentText(newText);

    socket.emit("document-change", {
      content: newText,
    });
  };

  const wordCount = documentText.trim()
    ? documentText.trim().split(/\s+/).length
    : 0;

  return (
    <div className="app">

      {/* NAVBAR */}
      <header className="navbar">
        <div className="nav-container">

          <div
            className="brand"
            onClick={handleLeaveRoom}
            role="button"
            tabIndex={0}
          >
            <div className="brand-icon">S</div>
            <span>
              Sync<span className="brand-highlight">Pad</span>
            </span>
          </div>

          <div className="nav-right">
            <span className="nav-status-dot"></span>
            <span className="nav-status-text">
              Simple. Shared. Synced.
            </span>
          </div>

        </div>
      </header>

      {/* HOME PAGE */}
      {page === "home" && (
        <main className="home-page">
          <section className="hero-section">

            <div className="hero-badge">
              <span className="badge-dot"></span>
              REAL-TIME COLLABORATIVE EDITOR
            </div>

            <h1>
              Write together.
              <br />
              <span>Stay in sync.</span>
            </h1>

            <p className="hero-description">
              A simple shared space where you and your team can write,
              edit and collaborate together in real time.
            </p>

            <div className="home-card">

              <div className="card-heading">
                <h2>Get started</h2>
                <p>
                  Enter your details to create or join a workspace.
                </p>
              </div>

              <div className="form-group">
                <label htmlFor="username">Your name</label>

                <input
                  id="username"
                  type="text"
                  placeholder="Enter your name"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    setMessage("");
                  }}
                  maxLength={25}
                />
              </div>

              <button
                className="primary-button"
                onClick={handleCreateRoom}
              >
                <span>＋</span>
                Create a new room
                <span className="button-arrow">→</span>
              </button>

              <div className="form-divider">
                <span></span>
                <p>OR JOIN EXISTING ROOM</p>
                <span></span>
              </div>

              <div className="form-group">
                <label htmlFor="roomId">Room ID</label>

                <input
                  id="roomId"
                  type="text"
                  placeholder="e.g. SP-A12BCD"
                  value={roomInput}
                  onChange={(e) => {
                    setRoomInput(e.target.value);
                    setMessage("");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleJoinRoom();
                  }}
                />
              </div>

              <button
                className="secondary-button"
                onClick={handleJoinRoom}
              >
                Join room
                <span>→</span>
              </button>

              {message && (
                <p className="error-message">{message}</p>
              )}

            </div>

            <div className="home-features">

              <div className="feature-item">
                <span className="feature-icon">✦</span>
                <span>Easy collaboration</span>
              </div>

              <div className="feature-item">
                <span className="feature-icon">⌘</span>
                <span>No account required</span>
              </div>

              <div className="feature-item">
                <span className="feature-icon">↗</span>
                <span>Share with a Room ID</span>
              </div>

            </div>

          </section>
        </main>
      )}

      {/* EDITOR PAGE */}
      {page === "editor" && (
        <main className="editor-page">

          <div className="editor-topbar">

            <div className="editor-room-info">

              <button
                className="back-button"
                onClick={handleLeaveRoom}
                title="Leave room"
              >
                ←
              </button>

              <div>
                <h2>Workspace</h2>
                <p>Collaborative document</p>
              </div>

            </div>

            <div className="editor-actions">

              <div className="connection-status">
                <span
                  className="status-dot"
                  style={{
                    background:
                      connectionStatus === "Connected"
                        ? "#22c55e"
                        : "#ef4444",
                  }}
                ></span>

                <span>{connectionStatus}</span>
              </div>

              <button
                className="leave-button"
                onClick={handleLeaveRoom}
              >
                Leave room
              </button>

            </div>

          </div>

          <div className="editor-content">

            <div className="document-header">

              <div>
                <div className="room-label">ROOM ID</div>

                <div className="room-id-display">
                  <h3>{roomId}</h3>

                  <button
                    className="copy-button"
                    onClick={handleCopyRoomId}
                    title="Copy Room ID"
                  >
                    {copied ? "Copied ✓" : "Copy ↗"}
                  </button>
                </div>
              </div>

              <div className="user-profile">

                <div className="user-avatar">
                  {currentUser.charAt(0).toUpperCase()}
                </div>

                <div>
                  <p className="user-name">{currentUser}</p>
                  <p className="user-role">You</p>
                </div>

              </div>

            </div>

            <div className="document-card">

              <div className="document-toolbar">

                <div className="document-title">
                  <span className="document-icon">▤</span>
                  <span>Untitled document</span>
                </div>

                <div className="save-status">
                  <span></span>
                  Live synchronization
                </div>

              </div>

              <textarea
                className="document-editor"
                placeholder="Start typing your thoughts here..."
                value={documentText}
                onChange={handleDocumentChange}
                spellCheck={true}
                disabled={!socket.connected}
              />

              <div className="document-footer">
                <span>{documentText.length} characters</span>
                <span>{wordCount} words</span>
              </div>

            </div>

            <div className="collaboration-note">
              <span>ⓘ</span>

              <p>
                Share the Room ID with others so they can join this
                workspace. Everyone in the room can edit the document
                together.
              </p>
            </div>

            <div className="active-users">
              <span>👥</span>
              {activeUsers.length} user(s) online
            </div>

            {message && (
              <p className="error-message">{message}</p>
            )}

          </div>

        </main>
      )}

      {/* FOOTER */}
      <footer className="footer">
        <p>Made for better collaboration.</p>
        <span>© 2026 SyncPad</span>
      </footer>

    </div>
  );
}

export default App;
