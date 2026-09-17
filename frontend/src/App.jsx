import React, { useState, useEffect } from 'react';
import ParticleBackground from './components/ParticleBackground.jsx';
import Navbar from './components/Navbar.jsx';
import Introduction from './components/Introduction.jsx';
import CompanyPolicy from './components/CompanyPolicy.jsx';
import RefundRequest from './components/RefundRequest.jsx';
import { ApiService } from './services/api.js';
import { DEFAULT_POLICY_MARKDOWN } from './data/policyDefault.js';

export default function App() {
  const [activeTab, setActiveTab] = useState('introduction');

  // Policy state
  const [policyText, setPolicyText] = useState("");
  const [policyMeta, setPolicyMeta] = useState(null);

  // Load policy on mount
  useEffect(() => {
    const fetchPolicy = async () => {
      const data = await ApiService.getPolicy();
      setPolicyText(data.content);
      setPolicyMeta({ filename: data.filename, size: data.size });
    };
    fetchPolicy();
  }, []);

  const handleSavePolicy = async (filename, content) => {
    await ApiService.savePolicy(filename, content);
  };

  const handleResetPolicy = () => {
    setPolicyText(DEFAULT_POLICY_MARKDOWN);
    setPolicyMeta({
      filename: "FIN-EXP-001.md",
      size: `${(DEFAULT_POLICY_MARKDOWN.length / 1024).toFixed(1)} KB`
    });
  };

  return (
    <>
      {/* Dynamic neural canvas background */}
      <ParticleBackground />

      <main className="shell">
        {/* Top Navbar */}
        <Navbar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />

        <div style={{ height: '24px' }}></div>

        {/* View 1: Introduction */}
        {activeTab === 'introduction' && (
          <Introduction />
        )}

        {/* View 2: Company Policy */}
        {activeTab === 'policy' && (
          <CompanyPolicy
            policyText={policyText}
            setPolicyText={setPolicyText}
            policyMeta={policyMeta}
            setPolicyMeta={setPolicyMeta}
            onSavePolicy={handleSavePolicy}
            onResetPolicy={handleResetPolicy}
          />
        )}

        {/* View 3: Refund Request (Chatbot) */}
        {activeTab === 'refund_request' && (
          <RefundRequest onNavigateToPolicy={() => setActiveTab('policy')} />
        )}
      </main>
    </>
  );
}

