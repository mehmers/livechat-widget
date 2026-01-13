import React, { useState, useRef, useEffect } from 'react';
import { useLiveChat } from '../hooks/useLiveChat';
import './LiveChat.css';

// Icons
const ChatIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

const CloseIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const SendIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);

const AttachIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
  </svg>
);

const RefreshIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="23 4 23 10 17 10" />
    <polyline points="1 20 1 14 7 14" />
    <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" />
  </svg>
);

// Registration Form Component
function RegistrationForm({ onSubmit, isLoading, primaryColor }) {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
  });
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.name.trim()) {
      newErrors.name = 'Ad Soyad zorunludur';
    }
    if (!formData.phone.trim()) {
      newErrors.phone = 'Telefon zorunludur';
    } else if (!/^[0-9]{10,15}$/.test(formData.phone.replace(/\D/g, ''))) {
      newErrors.phone = 'Geçerli bir telefon numarası girin';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      onSubmit(formData);
    }
  };

  return (
    <form className="lc-registration-form" onSubmit={handleSubmit}>
      <h3 className="lc-form-title">Sohbete Başla</h3>
      <p className="lc-form-subtitle">Lütfen bilgilerinizi girin</p>

      <div className="lc-form-group">
        <label htmlFor="lc-name">Ad Soyad *</label>
        <input
          id="lc-name"
          type="text"
          name="name"
          value={formData.name}
          onChange={handleChange}
          placeholder="Adınız Soyadınız"
          disabled={isLoading}
        />
        {errors.name && <span className="lc-error">{errors.name}</span>}
      </div>

      <div className="lc-form-group">
        <label htmlFor="lc-phone">Telefon *</label>
        <input
          id="lc-phone"
          type="tel"
          name="phone"
          value={formData.phone}
          onChange={handleChange}
          placeholder="5XX XXX XX XX"
          disabled={isLoading}
        />
        {errors.phone && <span className="lc-error">{errors.phone}</span>}
      </div>

      <div className="lc-form-group">
        <label htmlFor="lc-email">E-posta (Opsiyonel)</label>
        <input
          id="lc-email"
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          placeholder="ornek@email.com"
          disabled={isLoading}
        />
      </div>

      <button
        type="submit"
        className="lc-submit-btn"
        style={{ backgroundColor: primaryColor }}
        disabled={isLoading}
      >
        {isLoading ? 'Yükleniyor...' : 'Sohbete Başla'}
      </button>
    </form>
  );
}

// Message Component
function Message({ message, primaryColor }) {
  const isUser = message.sender === 'user';
  const isAgent = message.sender === 'agent';

  return (
    <div className={`lc-message ${isUser ? 'lc-message-user' : 'lc-message-bot'}`}>
      <div
        className="lc-message-bubble"
        style={isUser ? { backgroundColor: primaryColor } : {}}
      >
        {isAgent && <span className="lc-agent-badge">Temsilci</span>}
        <p>{message.content}</p>
        {message.file && (
          <div className="lc-message-file">
            📎 {message.file.name}
          </div>
        )}
        <span className="lc-message-time">
          {new Date(message.timestamp).toLocaleTimeString('tr-TR', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      </div>
    </div>
  );
}

// Options Component
function OptionsSelector({ options, onSelect, disabled }) {
  return (
    <div className="lc-options">
      {options.map((option, index) => (
        <button
          key={index}
          className="lc-option-btn"
          onClick={() => onSelect(option.value || option.label)}
          disabled={disabled}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

// Main LiveChat Component
export function LiveChat({
  apiUrl,
  token,
  position = 'bottom-right',
  primaryColor = '#3B82F6',
  title = 'Canlı Destek',
  subtitle = 'Size nasıl yardımcı olabiliriz?',
  placeholder = 'Mesajınızı yazın...',
  welcomeMessage = 'Merhaba! Size nasıl yardımcı olabilirim?',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const {
    messages,
    isLoading,
    error,
    isInitialized,
    user,
    isLiveAgentMode,
    currentOptions,
    currentInputType,
    widgetConfig,
    hasEnded,
    initSession,
    sendMessage,
    sendFile,
    resetChat,
    setError,
  } = useLiveChat({ apiUrl, token });

  // Use widget config if available
  const effectivePrimaryColor = widgetConfig?.settings?.primaryColor || primaryColor;
  const effectiveTitle = widgetConfig?.firm_name || title;

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleRegistration = async (userData) => {
    const success = await initSession(userData);
  };

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;
    const message = inputValue.trim();
    setInputValue('');
    await sendMessage(message);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleOptionSelect = async (value) => {
    await sendMessage(value);
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      await sendFile(file);
      e.target.value = '';
    }
  };

  const positionClass = `lc-position-${position}`;

  return (
    <div className={`lc-container ${positionClass}`}>
      {/* Overlay for mobile */}
      {isOpen && <div className="lc-overlay" onClick={() => setIsOpen(false)} />}

      {/* Chat Window */}
      {isOpen && (
        <div className="lc-window">
          {/* Header */}
          <div className="lc-header" style={{ backgroundColor: effectivePrimaryColor }}>
            <div className="lc-header-info">
              <h4>{effectiveTitle}</h4>
              <p>{isLiveAgentMode ? 'Canlı temsilci ile görüşüyorsunuz' : subtitle}</p>
            </div>
            <div className="lc-header-actions">
              {isInitialized && (
                <button
                  className="lc-reset-btn"
                  onClick={resetChat}
                  title="Yeni Sohbet"
                >
                  <RefreshIcon />
                </button>
              )}
              <button className="lc-close-btn" onClick={() => setIsOpen(false)}>
                <CloseIcon />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="lc-body">
            {/* Error */}
            {error && (
              <div className="lc-error-banner" onClick={() => setError(null)}>
                {error}
              </div>
            )}

            {!isInitialized ? (
              !error && (
                <RegistrationForm
                  onSubmit={handleRegistration}
                  isLoading={isLoading}
                  primaryColor={effectivePrimaryColor}
                />
              )
            ) : (
              <>
                {/* Messages */}
                <div className="lc-messages">
                  {messages.map((msg) => (
                    <Message
                      key={msg.id}
                      message={msg}
                      primaryColor={effectivePrimaryColor}
                    />
                  ))}
                  {isLoading && (
                    <div className="lc-typing">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  )}

                  {/* Options - inside messages container for better positioning */}
                  {currentOptions.length > 0 && !hasEnded && (
                    <OptionsSelector
                      options={currentOptions}
                      onSelect={handleOptionSelect}
                      disabled={isLoading}
                    />
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* Ended Message */}
                {hasEnded && (
                  <div className="lc-ended-banner">
                    Sohbet sonlandı. Teşekkür ederiz!
                  </div>
                )}
              </>
            )}
          </div>

          {/* Input */}
          {isInitialized && !hasEnded && (
            <div className="lc-input-area">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept="image/jpeg,image/png"
                style={{ display: 'none' }}
              />
              <button
                className="lc-attach-btn"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
                title="Dosya ekle"
              >
                <AttachIcon />
              </button>
              <input
                type="text"
                className="lc-input"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={currentInputType === 'file' ? 'Dosya yükleyin...' : placeholder}
                disabled={isLoading || currentInputType === 'file'}
              />
              <button
                className="lc-send-btn"
                onClick={handleSend}
                disabled={!inputValue.trim() || isLoading}
                style={{ backgroundColor: effectivePrimaryColor }}
              >
                <SendIcon />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Toggle Button */}
      <button
        className="lc-toggle-btn"
        onClick={() => setIsOpen(!isOpen)}
        style={{ backgroundColor: effectivePrimaryColor }}
      >
        {isOpen ? <CloseIcon /> : <ChatIcon />}
      </button>
    </div>
  );
}

export default LiveChat;
