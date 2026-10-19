import React, { useState } from 'react';
import { Send, X, MessageSquare, CheckCircle } from 'lucide-react';
import { notifyContactDeveloper } from '../services/telegramService';
import { useToast } from './Toast';

function ContactDevModal({ isOpen, onClose, userEmail, userDept }) {
  const { showToast } = useToast();
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim() || sending) return;

    setSending(true);
    try {
      const res = await notifyContactDeveloper({
        userEmail,
        message: message.trim(),
        dept: userDept
      });

      if (res && res.ok) {
        setSentSuccess(true);
        showToast('Message sent to developer on Telegram!', 'success');
        setTimeout(() => {
          setSentSuccess(false);
          setMessage('');
          onClose();
        }, 1500);
      } else {
        showToast('Could not deliver message to Telegram. Please try again.', 'error');
      }
    } catch (err) {
      showToast('Error sending message: ' + err.message, 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.45)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '16px'
    }}>
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '460px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
        border: '1px solid #e2e8f0',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 20px',
          borderBottom: '1px solid #f1f5f9'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              backgroundColor: '#eff6ff',
              color: '#2563eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <MessageSquare size={18} />
            </div>
            <div>
              <div style={{ fontWeight: '700', fontSize: '15px', color: '#0f172a' }}>
                Contact Developer
              </div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>
                Sends instant alert via Telegram
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              borderRadius: '6px'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        {sentSuccess ? (
          <div style={{ padding: '36px 24px', textAlign: 'center' }}>
            <CheckCircle size={44} color="#16a34a" style={{ marginBottom: '12px' }} />
            <div style={{ fontWeight: '700', fontSize: '16px', color: '#0f172a', marginBottom: '4px' }}>
              Message Delivered!
            </div>
            <div style={{ fontSize: '13px', color: '#64748b' }}>
              Your message was forwarded to the developer's Telegram.
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ padding: '20px' }}>
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>
                Sender
              </label>
              <div style={{
                fontSize: '13px',
                color: '#1e293b',
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '8px 12px'
              }}>
                {userEmail} {userDept ? `(${userDept})` : ''}
              </div>
            </div>

            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>
                Message / Issue Details
              </label>
              <textarea
                rows={4}
                required
                placeholder="Describe what happened, any issue you're facing, or your request..."
                value={message}
                onChange={e => setMessage(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                  outline: 'none',
                  boxSizing: 'border-box',
                  fontFamily: 'inherit',
                  resize: 'vertical'
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={onClose}
                disabled={sending}
                style={{
                  padding: '9px 16px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#475569',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={sending || !message.trim()}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '9px 18px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#0f172a',
                  color: '#ffffff',
                  fontSize: '13px',
                  fontWeight: '700',
                  cursor: (sending || !message.trim()) ? 'not-allowed' : 'pointer',
                  opacity: (sending || !message.trim()) ? 0.6 : 1,
                  boxShadow: '0 2px 4px rgba(15, 23, 42, 0.15)'
                }}
              >
                <Send size={14} />
                {sending ? 'Sending…' : 'Send to Developer'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default ContactDevModal;
