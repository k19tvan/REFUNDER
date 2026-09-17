import React, { useState } from 'react';
import ChatMessageList from './ChatMessageList.jsx';
import ChatComposer from './ChatComposer.jsx';
import { ChatService } from '../../services/chatService.js';

export default function ChatContainer({ onNavigateToPolicy }) {
  const [sessionId] = useState(() => `sess_${Math.random().toString(36).substring(2, 9)}`);
  const [messages, setMessages] = useState([
    {
      id: 'welcome-init',
      sender: 'bot',
      text: "Hello! I am Refunder Chatbot. Please describe your expense details and attach any receipt or invoice image to submit your refund request. I will cross-reference your claim against company policy in real time.",
      timestamp: 'Online',
      pipeline_nodes: null
    }
  ]);
  const [loading, setLoading] = useState(false);
  const [activeClaimId, setActiveClaimId] = useState(null);

  const handleSendMessage = async ({ message, receiptFile }) => {
    const userMsgId = `user_${Date.now()}`;
    const userMsg = {
      id: userMsgId,
      sender: 'user',
      senderName: 'Alex Johnson (EMP-1042)',
      text: message || (receiptFile ? `Uploaded receipt proof: ${receiptFile.name}` : ""),
      receiptName: receiptFile?.name,
      receiptPreview: receiptFile ? URL.createObjectURL(receiptFile) : null,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const response = await ChatService.sendMessage({
        sessionId,
        message,
        receiptFile,
        claimId: activeClaimId,
        action: "MESSAGE"
      });

      const botMsgId = `bot_${Date.now()}`;
      const botMsg = {
        id: botMsgId,
        sender: 'bot',
        text: response.reply,
        claim_id: response.claim_id,
        pipeline_nodes: response.pipeline_nodes,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, botMsg]);
      if (response.claim_id) setActiveClaimId(response.claim_id);
    } catch (e) {
      console.error("Chat error:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleResolveEscalation = async (resolutionNote, claimId, botMsgId) => {
    setLoading(true);

    const userMsg = {
      id: `user_res_${Date.now()}`,
      sender: 'user',
      senderName: 'Sarah Miller (EMP-1099)',
      text: `Clarification provided: "${resolutionNote}"`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages(prev => [...prev, userMsg]);

    try {
      const response = await ChatService.sendMessage({
        sessionId,
        message: resolutionNote,
        claimId: claimId || activeClaimId,
        action: "RESOLVE_ESCALATION"
      });

      setMessages(prev => prev.map(m => m.id === botMsgId ? {
        ...m,
        escalationResolved: true,
        escalationResolutionNote: resolutionNote
      } : m));

      const botMsg = {
        id: `bot_res_${Date.now()}`,
        sender: 'bot',
        text: response.reply,
        claim_id: response.claim_id,
        pipeline_nodes: response.pipeline_nodes,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, botMsg]);
    } catch (err) {
      console.error("Resolution error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleResetChat = () => {
    setMessages([
      {
        id: 'welcome-reset',
        sender: 'bot',
        text: "Conversation reset. Please describe your expense details and attach any receipt or invoice to submit your refund request.",
        timestamp: 'Just now',
        pipeline_nodes: null
      }
    ]);
    setActiveClaimId(null);
  };

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', width: '100%', padding: '0 12px' }}>
      <div className="chat-shell">
        {/* Top Header */}
        <div className="chat-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="chat-bot-avatar">
              <i className="fa-solid fa-comments-dollar"></i>
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--inkHeading)', letterSpacing: '-0.01em' }}>
                  Refunder Chatbot
                </span>
                <span style={{
                  fontSize: '9px',
                  fontWeight: 700,
                  background: 'rgba(37, 99, 235, 0.08)',
                  color: 'var(--accent)',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  border: '1px solid rgba(37, 99, 235, 0.2)'
                }}>
                  EXPENSE ASSISTANT
                </span>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ color: 'var(--signalGreen)', fontWeight: 600 }}>● Online</span>
                <span>•</span>
                <span>Autonomous Claim Submission & Policy Verification</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{
              fontSize: '10px',
              fontFamily: 'JetBrains Mono, monospace',
              color: 'var(--accent)',
              background: '#eff6ff',
              padding: '4px 10px',
              borderRadius: '8px',
              border: '1px solid rgba(37, 99, 235, 0.2)'
            }}>
              POST /api/chat/
            </span>
            <button
              type="button"
              onClick={handleResetChat}
              title="Reset conversation"
              style={{
                border: '1px solid #e2e8f0',
                background: '#ffffff',
                color: 'var(--muted)',
                padding: '7px 12px',
                borderRadius: '10px',
                fontSize: '11px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <i className="fa-solid fa-rotate-left"></i>
              <span>New Chat</span>
            </button>
          </div>
        </div>

        {/* Message Feed */}
        <ChatMessageList
          messages={messages}
          loading={loading}
          onResolveEscalation={handleResolveEscalation}
        />

        {/* Bottom Floating Composer with Direct Policy Link Below */}
        <ChatComposer
          loading={loading}
          onSendMessage={handleSendMessage}
          onNavigateToPolicy={onNavigateToPolicy}
        />
      </div>
    </div>
  );
}
