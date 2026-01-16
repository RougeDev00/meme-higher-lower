'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import './PodChat.css';

export default function PodChat() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showWelcome, setShowWelcome] = useState(true);
    const [size, setSize] = useState({ width: 380, height: 520 });
    const [isResizing, setIsResizing] = useState(false);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);
    const chatPanelRef = useRef(null);
    const resizeStartRef = useRef({ x: 0, y: 0, width: 0, height: 0 });

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    const handleToggle = () => {
        setIsOpen(!isOpen);
    };

    // Resize handlers
    const handleResizeStart = useCallback((e, direction) => {
        e.preventDefault();
        setIsResizing(true);
        resizeStartRef.current = {
            x: e.clientX,
            y: e.clientY,
            width: size.width,
            height: size.height,
            direction
        };
    }, [size]);

    useEffect(() => {
        const handleResizeMove = (e) => {
            if (!isResizing) return;

            const { x, y, width, height, direction } = resizeStartRef.current;
            let newWidth = width;
            let newHeight = height;

            if (direction.includes('left')) {
                newWidth = Math.max(320, Math.min(600, width + (x - e.clientX)));
            }
            if (direction.includes('bottom')) {
                newHeight = Math.max(400, Math.min(700, height + (e.clientY - y)));
            }

            setSize({ width: newWidth, height: newHeight });
        };

        const handleResizeEnd = () => {
            setIsResizing(false);
        };

        if (isResizing) {
            document.addEventListener('mousemove', handleResizeMove);
            document.addEventListener('mouseup', handleResizeEnd);
            document.body.style.cursor = 'nwse-resize';
            document.body.style.userSelect = 'none';
        }

        return () => {
            document.removeEventListener('mousemove', handleResizeMove);
            document.removeEventListener('mouseup', handleResizeEnd);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        };
    }, [isResizing]);

    const handleSend = async () => {
        if (!inputValue.trim() || isLoading) return;

        const userMessage = inputValue.trim();
        setInputValue('');
        setShowWelcome(false);

        // Add user message
        const newMessages = [...messages, { role: 'user', content: userMessage }];
        setMessages(newMessages);
        setIsLoading(true);

        try {
            const response = await fetch('/api/pod', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: newMessages })
            });

            const data = await response.json();

            if (data.error) {
                setMessages([...newMessages, { role: 'assistant', content: "Oops! Something went wrong 🫛 Try again!" }]);
            } else {
                setMessages([...newMessages, { role: 'assistant', content: data.message }]);
            }
        } catch (error) {
            console.error('Error sending message:', error);
            setMessages([...newMessages, { role: 'assistant', content: "Connection error! POD is taking a nap 💤" }]);
        }

        setIsLoading(false);
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="pod-container">
            {/* POD Logo Button */}
            <button
                className={`pod-button ${isOpen ? 'pod-button-open' : ''}`}
                onClick={handleToggle}
                aria-label="Open POD Chat"
            >
                <div className="pod-logo-wrapper">
                    <img src="/pod-logo.png" alt="POD" className="pod-logo" />
                    <div className="pod-pulse"></div>
                </div>
                {!isOpen && <span className="pod-label">Ask POD</span>}
            </button>

            {/* Chat Panel */}
            <div
                ref={chatPanelRef}
                className={`pod-chat-panel ${isOpen ? 'pod-chat-open' : ''} ${isResizing ? 'pod-resizing' : ''}`}
                style={isOpen ? { width: size.width, height: size.height } : {}}
            >
                {/* Resize Handles */}
                {isOpen && (
                    <>
                        <div
                            className="pod-resize-handle pod-resize-left"
                            onMouseDown={(e) => handleResizeStart(e, 'left')}
                        />
                        <div
                            className="pod-resize-handle pod-resize-bottom"
                            onMouseDown={(e) => handleResizeStart(e, 'bottom')}
                        />
                        <div
                            className="pod-resize-handle pod-resize-corner"
                            onMouseDown={(e) => handleResizeStart(e, 'left-bottom')}
                        />
                    </>
                )}
                {/* Header */}
                <div className="pod-chat-header">
                    <div className="pod-header-info">
                        <img src="/pod-logo.png" alt="POD" className="pod-header-logo" />
                        <div>
                            <h3>POD</h3>
                            <span className="pod-status">
                                <span className="pod-status-dot"></span>
                                Online
                            </span>
                            <span className="pod-powered-by">Powered by Claude</span>
                        </div>
                    </div>
                    <button className="pod-close-btn" onClick={handleToggle}>
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                            <path d="M14 1.41L12.59 0L7 5.59L1.41 0L0 1.41L5.59 7L0 12.59L1.41 14L7 8.41L12.59 14L14 12.59L8.41 7L14 1.41Z" />
                        </svg>
                    </button>
                </div>

                {/* Messages */}
                <div className="pod-messages">
                    {showWelcome && messages.length === 0 && (
                        <div className="pod-welcome">
                            <img src="/pod-logo.png" alt="POD" className="pod-welcome-logo" />
                            <h4>Hey there, trencher! 🚀</h4>
                            <p>I'm POD, the trenchers' best friend (or at least I'd like to be). Ask me anything about meme coins, Solana, and I'll help you out with whatever you need. You can even talk to me about girls... but I know you don't have time for that loser stuff 😏💎</p>
                            <div className="pod-suggestions">
                                <button onClick={() => setInputValue("Who are you, POD?")}>Who are you, POD? 🫛</button>
                                <button onClick={() => setInputValue("What is pump.fun?")}>What is pump.fun? 🚀</button>
                                <button onClick={() => setInputValue("Tips for trading meme coins?")}>Trading tips? 💎</button>
                            </div>
                        </div>
                    )}

                    {messages.map((msg, index) => (
                        <div key={index} className={`pod-message ${msg.role}`}>
                            {msg.role === 'assistant' && (
                                <img src="/pod-logo.png" alt="POD" className="pod-message-avatar" />
                            )}
                            <div className="pod-message-content">
                                {msg.content}
                            </div>
                        </div>
                    ))}

                    {isLoading && (
                        <div className="pod-message assistant">
                            <img src="/pod-logo.png" alt="POD" className="pod-message-avatar" />
                            <div className="pod-message-content pod-typing">
                                <span></span>
                                <span></span>
                                <span></span>
                            </div>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="pod-input-container">
                    <input
                        ref={inputRef}
                        type="text"
                        className="pod-input"
                        placeholder="Ask POD about meme coins..."
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyPress={handleKeyPress}
                        disabled={isLoading}
                    />
                    <button
                        className="pod-send-btn"
                        onClick={handleSend}
                        disabled={!inputValue.trim() || isLoading}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
}
