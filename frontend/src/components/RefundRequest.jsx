import React from 'react';
import ChatContainer from './chat/ChatContainer.jsx';

/**
 * RefundRequest View
 * Renders the clean Refunder Chatbot interface with direct policy link.
 */
export default function RefundRequest({ onNavigateToPolicy }) {
  return <ChatContainer onNavigateToPolicy={onNavigateToPolicy} />;
}
