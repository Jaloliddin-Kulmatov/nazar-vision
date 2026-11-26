import { site } from "@/config/site";
import { CODE_MINUTES } from "./codes";

const TEXT = {
  en: { subject: (c: string) => `${c} is your ${site.name} code`, intro: "Your code to download the demo source code:", expires: `It works for ${CODE_MINUTES} minutes. If you didn’t ask for it, ignore this email.` },
  ru: { subject: (c: string) => `${c} — ваш код ${site.name}`, intro: "Ваш код для скачивания исходного кода демо:", expires: `Код действует ${CODE_MINUTES} минут. Если вы его не запрашивали, просто проигнорируйте письмо.` },
  uz: { subject: (c: string) => `${c} — ${site.name} kodingiz`, intro: "Demo manba kodini yuklab olish uchun kodingiz:", expires: `Kod ${CODE_MINUTES} daqiqa amal qiladi. Agar siz so‘ramagan bo‘lsangiz, bu xatga e’tibor bermang.` },
} as const;

export function codeEmail(code: string, locale: string) {
  const t = TEXT[(locale as keyof typeof TEXT) in TEXT ? (locale as keyof typeof TEXT) : "en"];
  return {
    subject: t.subject(code),
    text: `${t.intro}\n\n${code}\n\n${t.expires}`,
    html: `<div style="font-family:system-ui,sans-serif;max-width:420px">
<p>${t.intro}</p>
<p style="font-size:32px;font-weight:700;letter-spacing:6px;margin:16px 0">${code}</p>
<p style="color:#666">${t.expires}</p>
<p style="color:#999">${site.name}</p></div>`,
  };
}
