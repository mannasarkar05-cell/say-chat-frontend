import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import './App.css';

const API_URL = process.env.REACT_APP_API_URL || 'https://say-chat-backend.onrender.com';

function App() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [message, setMessage] = useState('');
  
  const [loggedInUser, setLoggedInUser] = useState(null);
  const [usersList, setUsersList] = useState([]);
  const [selectedChatUser, setSelectedChatUser] = useState(null);
  
  const [chatMessages, setChatMessages] = useState([]);
  const [currentMessage, setCurrentMessage] = useState('');

  // ইউজার রেজিস্ট্রেশন হ্যান্ডলার
  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:5007/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password }),
      });
      const data = await response.json();
      if (response.ok) {
        setMessage('Registration Successful! Please Login.');
        setIsLogin(true);
      } else {
        setMessage(data.message);
      }
    } catch (error) {
      setMessage('Server error. Make sure backend is running.');
    }
  };

  // ইউজার লগইন হ্যান্ডলার
  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:5007/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (response.ok) {
        setLoggedInUser({ username: data.username, email: data.email });
        socket.emit('join_room', data.email);
        fetchUsers(data.email);
      } else {
        setMessage(data.message);
      }
    } catch (error) {
      setMessage('Server error. Make sure backend is running.');
    }
  };

  // অন্য ইউজারদের তালিকা আনা
  const fetchUsers = async (userEmail) => {
    try {
      const response = await fetch(`http://localhost:5007/api/users/${userEmail}`);
      const data = await response.json();
      if (response.ok) {
        setUsersList(data);
      }
    } catch (error) {
      console.log('Error fetching users');
    }
  };

  // চ্যাট ইউজার সিলেক্ট করলে পুরোনো হিস্ট্রি আনা
  const selectChatUser = async (user) => {
    setSelectedChatUser(user);
    try {
      const response = await fetch(`http://localhost:5007/api/messages/${loggedInUser.email}/${user.email}`);
      const data = await response.json();
      if (response.ok) {
        setChatMessages(data);
      }
    } catch (error) {
      console.log('Error fetching messages');
    }
  };

  // রিয়েল-টাইম মেসেজ রিসিভ করা
  useEffect(() => {
    socket.on('receive_message', (data) => {
      if (selectedChatUser && data.sender === selectedChatUser.email) {
        setChatMessages((prev) => [...prev, data]);
      }
    });
    return () => socket.off('receive_message');
  }, [selectedChatUser]);

  // মেসেজ পাঠানো
  const sendMessage = async (e) => {
    e.preventDefault();
    if (currentMessage.trim() === '') return;

    const messageData = {
      sender: loggedInUser.email,
      receiver: selectedChatUser.email,
      message: currentMessage,
      timestamp: new Date()
    };

    socket.emit('send_message', messageData);
    setChatMessages((prev) => [...prev, messageData]);
    setCurrentMessage('');
  };

  // যদি লগইন করা না থাকে, তবে লগইন/রেজিস্ট্রেশন ফর্ম দেখাবে
  if (!loggedInUser) {
    return (
      <div className="auth-container" style={{ textAlign: 'center', marginTop: '50px' }}>
        <h2>Say Chat - {isLogin ? 'Login' : 'Register'}</h2>
        {message && <p style={{ color: 'red' }}>{message}</p>}
        
        {isLogin ? (
          <form onSubmit={handleLogin}>
            <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required /><br/><br/>
            <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required /><br/><br/>
            <button type="submit">Login</button>
          </form>
        ) : (
          <form onSubmit={handleRegister}>
            <input type="text" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} required /><br/><br/>
            <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required /><br/><br/>
            <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required /><br/><br/>
            <button type="submit">Register</button>
          </form>
        )}
        <br/>
        <button onClick={() => { setIsLogin(!isLogin); setMessage(''); }} style={{ background: 'none', border: 'none', color: 'blue', cursor: 'pointer' }}>
          {isLogin ? "Don't have an account? Register here" : "Already have an account? Login here"}
        </button>
      </div>
    );
  }

  // লগইন করার পর মূল চ্যাট ইন্টারফেস
  return (
    <div className="chat-dashboard" style={{ display: 'flex', height: '100vh' }}>
      {/* বামপাশে ইউজারের তালিকা */}
      <div className="users-sidebar" style={{ width: '30%', borderRight: '1px solid #ccc', padding: '20px' }}>
        <h3>Welcome, {loggedInUser.username}</h3>
        <h4>Contacts:</h4>
        {usersList.length === 0 ? <p>No other users found.</p> : null}
        <ul>
          {usersList.map((user) => (
            <li key={user.email} onClick={() => selectChatUser(user)} style={{ cursor: 'pointer', padding: '10px', borderBottom: '1px solid #eee', background: selectedChatUser?.email === user.email ? '#e0e0e0' : 'transparent' }}>
              <strong>{user.username}</strong><br/>
              <small>{user.email}</small>
            </li>
          ))}
        </ul>
      </div>

      {/* ডানপাশে চ্যাট উইন্ডো */}
      <div className="chat-window" style={{ width: '70%', display: 'flex', flexDirection: 'column', padding: '20px' }}>
        {selectedChatUser ? (
          <>
            <h3>Chat with {selectedChatUser.username}</h3>
            <div className="messages-box" style={{ flex: 1, border: '1px solid #ccc', padding: '15px', overflowY: 'scroll', marginBottom: '15px' }}>
              {chatMessages.map((msg, index) => (
                <div key={index} style={{ textAlign: msg.sender === loggedInUser.email ? 'right' : 'left', margin: '10px 0' }}>
                  <span style={{ background: msg.sender === loggedInUser.email ? '#dcf8c6' : '#f1f0f0', padding: '8px 12px', borderRadius: '8px', display: 'inline-block' }}>
                    {msg.message}
                  </span>
                </div>
              ))}
            </div>
            <form onSubmit={sendMessage} style={{ display: 'flex' }}>
              <input type="text" placeholder="Type a message..." value={currentMessage} onChange={(e) => setCurrentMessage(e.target.value)} style={{ flex: 1, padding: '10px' }} />
              <button type="submit" style={{ padding: '10px 20px' }}>Send</button>
            </form>
          </>
        ) : (
          <div style={{ margin: 'auto', textAlign: 'center', color: '#777' }}>
            <h2>Select a user from the left to start chatting!</h2>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;