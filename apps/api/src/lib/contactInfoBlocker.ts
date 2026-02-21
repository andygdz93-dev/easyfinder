export type ContactBlockReason = "email" | "phone" | "social" | "contact_phrase";

const emailRe = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const socialKeywordRe = /\b(whatsapp|wa\.me|telegram|t\.me|instagram|ig|facebook|fb|snapchat|signal|wechat|line)\b/i;
const contactPhraseRe = /\b(call|text|sms|whats?app|dm|message|email)\s+me\b/i;
const phoneLikeRe = /\+?\d{1,3}[\s.-]?\(?\d{2,4}\)?[\s.-]?\d{3,4}[\s.-]?\d{4}\b/;
const phoneContextRe = /\b(call|text|sms|whats?app|phone|cell|mobile)\b/i;

export const getContactBlockReason = (body: string): ContactBlockReason | null => {
  if (emailRe.test(body)) {
    return "email";
  }

  if (socialKeywordRe.test(body)) {
    return "social";
  }

  if (contactPhraseRe.test(body)) {
    return "contact_phrase";
  }

  const digitsOnly = body.replace(/\D/g, "");
  const digitCount = digitsOnly.length;
  const hasPhoneSeparators = /[+\-().]/.test(body) || /\d+\s+\d+/.test(body);
  const hasPhoneContext = phoneContextRe.test(body);

  if (phoneLikeRe.test(body) || (digitCount >= 9 && (hasPhoneSeparators || hasPhoneContext))) {
    return "phone";
  }

  return null;
};

