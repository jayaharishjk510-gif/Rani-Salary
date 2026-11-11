// Telegram Notification Service for Rani Salary
import { db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';

export const TELEGRAM_CONFIG = {
  botToken: process.env.REACT_APP_TELEGRAM_BOT_TOKEN || '',
  botUsername: process.env.REACT_APP_TELEGRAM_BOT_USERNAME || 'Rani_alerts_bot',
  botUrl: process.env.REACT_APP_TELEGRAM_BOT_URL || 'https://t.me/Rani_alerts_bot',
  devChatId: process.env.REACT_APP_TELEGRAM_DEV_CHAT_ID || '',
  adminChatId: process.env.REACT_APP_TELEGRAM_ADMIN_CHAT_ID || ''
};

/**
 * Format current timestamp in Indian Standard Time (IST)
 */
export function getISTDateTime() {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'medium',
    timeStyle: 'medium',
    hour12: true
  }).format(new Date());
}

/**
 * Basic device / browser summary from User Agent
 */
export function getDeviceInfo() {
  const ua = navigator.userAgent;
  let browser = 'Unknown Browser';
  if (ua.includes('Chrome') && !ua.includes('Edg')) browser = 'Chrome';
  else if (ua.includes('Edg')) browser = 'Edge';
  else if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';

  let os = 'Unknown OS';
  if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
  else if (ua.includes('Mac')) os = 'macOS';
  else if (ua.includes('Linux')) os = 'Linux';

  return `${os} (${browser})`;
}

/**
 * Fetch all enabled custom recipients from Firestore
 */
export async function getActiveRecipientsFromFirestore() {
  try {
    const snap = await getDocs(collection(db, 'telegram_recipients'));
    return snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(r => r.enabled !== false && r.chatId);
  } catch (err) {
    console.warn('Could not read telegram_recipients from Firestore:', err);
    return [];
  }
}

/**
 * Core send helper
 * Sends to targetChatIds if specified, or to all active configured recipients
 */
export async function sendTelegramMessage(text, targetChatIds = []) {
  const { botToken, devChatId, adminChatId } = TELEGRAM_CONFIG;
  if (!botToken) {
    console.warn('Telegram Bot Token not configured.');
    return { ok: false, error: 'No Bot Token' };
  }

  // Determine recipients
  let recipients = targetChatIds && targetChatIds.length > 0 ? [...targetChatIds] : [];
  if (recipients.length === 0) {
    // Collect active recipients from Firestore
    try {
      const customRecipients = await getActiveRecipientsFromFirestore();
      customRecipients.forEach(r => {
        if (r.chatId && !recipients.includes(r.chatId)) {
          recipients.push(r.chatId);
        }
      });
    } catch (e) {
      console.warn('Error loading custom recipients:', e);
    }

    if (devChatId && !recipients.includes(devChatId)) recipients.push(devChatId);
    if (adminChatId && !recipients.includes(adminChatId)) recipients.push(adminChatId);
  }

  // Filter valid non-empty IDs
  const validRecipients = recipients.filter(Boolean);
  if (validRecipients.length === 0) {
    return { ok: false, error: 'No valid recipient Chat IDs found.' };
  }

  const endpoint = `https://api.telegram.org/bot${botToken}/sendMessage`;

  const results = await Promise.all(
    validRecipients.map(async (chatId) => {
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text,
            parse_mode: 'HTML',
            disable_web_page_preview: true
          })
        });
        const data = await response.json();
        return {
          chatId,
          success: data.ok,
          description: data.description || (data.ok ? 'Sent successfully' : 'Failed'),
          data
        };
      } catch (err) {
        console.error(`Telegram error for ${chatId}:`, err);
        return { chatId, success: false, error: err.message, description: err.message };
      }
    })
  );

  return { ok: results.some(r => r.success), results };
}

/**
 * Send Login Notification to all active recipients
 */
export async function notifyLogin({ email, dept }) {
  // Prevent duplicate notifications in the same active session
  const sessionKey = `tg_login_notified_${email}`;
  if (sessionStorage.getItem(sessionKey)) {
    return;
  }

  const istTime = getISTDateTime();
  const device = getDeviceInfo();
  const shop = dept || 'Not specified';

  const message = [
    `🔔 <b>RANI SALARY - LOGIN ALERT</b>`,
    ``,
    `👤 <b>User:</b> <code>${email}</code>`,
    `🏢 <b>Shop / Role:</b> ${shop}`,
    `🕒 <b>Time:</b> ${istTime} (IST)`,
    `💻 <b>Device:</b> ${device}`,
    `🌐 <b>Host:</b> ${window.location.origin}`
  ].join('\n');

  try {
    const res = await sendTelegramMessage(message);
    if (res.ok) {
      sessionStorage.setItem(sessionKey, 'true');
    }
    return res;
  } catch (e) {
    console.error('Failed to send login notification:', e);
  }
}

/**
 * Send Notification when a Salary Record is processed
 */
export async function notifySalaryProcessed({ employeeName, employeeCode, dept, month, year, gTotal, net, processedBy }) {
  const istTime = getISTDateTime();
  const codeStr = employeeCode ? ` [${employeeCode}]` : '';

  const message = [
    `💵 <b>RANI SALARY - SALARY PROCESSED</b>`,
    ``,
    `👤 <b>Employee:</b> <b>${employeeName}</b>${codeStr}`,
    `🏪 <b>Shop:</b> ${dept}`,
    `📅 <b>Period:</b> ${month} ${year}`,
    `💰 <b>Gross Earnings:</b> ₹${Number(gTotal || 0).toLocaleString('en-IN')}`,
    `✅ <b>Net Salary:</b> ₹${Number(net ?? gTotal ?? 0).toLocaleString('en-IN')}`,
    `🕒 <b>Time:</b> ${istTime} (IST)`,
    `✍️ <b>Processed By:</b> <code>${processedBy || 'Admin'}</code>`
  ].join('\n');

  try {
    return await sendTelegramMessage(message);
  } catch (err) {
    console.error('Failed to send salary notification:', err);
  }
}

/**
 * Send Error / Crash Report to Developer
 */
export async function notifyErrorReport({ error, errorInfo, userNote, userEmail }) {
  const istTime = getISTDateTime();
  const device = getDeviceInfo();
  const url = window.location.href;
  const user = userEmail || 'Anonymous / Not logged in';
  const errorMsg = error?.message || (typeof error === 'string' ? error : 'Unknown Error');

  let stackSnippet = '';
  if (error?.stack) {
    stackSnippet = error.stack.slice(0, 500);
  } else if (errorInfo?.componentStack) {
    stackSnippet = errorInfo.componentStack.slice(0, 500);
  }

  const message = [
    `🚨 <b>RANI SALARY - ERROR REPORT</b>`,
    ``,
    `👤 <b>User:</b> <code>${user}</code>`,
    `📍 <b>Location:</b> <code>${url}</code>`,
    `🕒 <b>Time:</b> ${istTime} (IST)`,
    `💻 <b>Device:</b> ${device}`,
    userNote ? `💬 <b>User Note:</b> ${userNote}` : '',
    ``,
    `⚠️ <b>Error:</b>`,
    `<code>${errorMsg}</code>`,
    stackSnippet ? `\n📜 <b>Stack Preview:</b>\n<pre>${stackSnippet}</pre>` : ''
  ].filter(Boolean).join('\n');

  // Error reports are sent specifically to Developer
  return sendTelegramMessage(message, [TELEGRAM_CONFIG.devChatId]);
}

/**
 * Send User Feedback / Contact Message to Developer
 */
export async function notifyContactDeveloper({ userEmail, message, dept }) {
  const istTime = getISTDateTime();
  const device = getDeviceInfo();
  const user = userEmail || 'Unknown';
  const shop = dept || 'Not specified';

  const text = [
    `💬 <b>RANI SALARY - USER MESSAGE</b>`,
    ``,
    `👤 <b>From:</b> <code>${user}</code> (${shop})`,
    `🕒 <b>Time:</b> ${istTime} (IST)`,
    `💻 <b>Device:</b> ${device}`,
    ``,
    `📝 <b>Message:</b>`,
    `<blockquote>${message}</blockquote>`
  ].join('\n');

  return sendTelegramMessage(text, [TELEGRAM_CONFIG.devChatId]);
}
