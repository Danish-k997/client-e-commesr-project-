export const WHATSAPP_NUMBER =
  process.env.NEXT_PUBLIC_CONTACT_PHONE || "8102888865";

const cleanNumber = WHATSAPP_NUMBER.replace(/\D/g, "");

export const FORMATTED_PHONE =
  cleanNumber.length === 10
    ? `+91 ${cleanNumber.slice(0, 5)} ${cleanNumber.slice(5)}`
    : `+91 ${cleanNumber}`;

export const WHATSAPP_URL = `https://wa.me/91${cleanNumber}`;

export const CONTACT_PHONE_URL = `tel:+91${cleanNumber}`;

export const INSTAGRAM_HANDLE = "kasar.dimensions";

export const INSTAGRAM_URL =
  process.env.NEXT_PUBLIC_INSTAGRAM_URL ||
  "https://www.instagram.com/kasar.dimensions?vrfl=MWVteXRqM3JjcG13Zw%3D%3D";

