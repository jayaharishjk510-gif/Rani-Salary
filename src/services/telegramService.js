// Telegram Notification Service for Rani Salary

const TELEGRAM_CONFIG = {
  botToken: process.env.REACT_APP_TELEGRAM_BOT_TOKEN || '',
  devChatId: process.env.REACT_APP_TELEGRAM_DEV_CHAT_ID || '',
  adminChatId: process.env.REACT_APP_TELEGRAM_ADMIN_CHAT_ID || '' // Can be added later
};

/**
 * Format current timestamp in Indian Standard Time (IST)
 */
function getISTDateTime() {
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
function getDeviceInfo() {
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
 * Core send helper
 */
export async function sendTelegramMessage(text, targetChatIds = []) {
  const { botToken, devChatId, adminChatId } = TELEGRAM_CONFIG;
  if (!botToken) {
    console.warn('Telegram Bot Token not configured.');
    return { ok: false, error: 'No Bot Token' };
  }

  // Determine recipients
  let recipients = targetChatIds;
  if (!recipients || recipients.length === 0) {
    recipients = [devChatId];
    if (adminChatId) recipients.push(adminChatId);
  }

  // Filter valid non-empty IDs
  const validRecipients = recipients.filter(Boolean);
  if (validRecipients.length === 0) {
    return { ok: false, error: 'No valid recipient Chat IDs' };
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
        return { chatId, success: data.ok, data };
      } catch (err) {
        console.error(`Telegram error for ${chatId}:`, err);
        return { chatId, success: false, error: err.message };
      }
    })
  );

  return { ok: results.some(r => r.success), results };
}

/**
 * Send Login Notification to Dev (and Admin when set)
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
    const recipients = [TELEGRAM_CONFIG.devChatId];
    if (TELEGRAM_CONFIG.adminChatId) {
      recipients.push(TELEGRAM_CONFIG.adminChatId);
    }
    const res = await sendTelegramMessage(message, recipients);
    if (res.ok) {
      sessionStorage.setItem(sessionKey, 'true');
    }
    return res;
  } catch (e) {
    console.error('Failed to send login notification:', e);
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
