export function disableGoogleTranslateForEnglishMode() {
  if (typeof window === "undefined") return;

  const wbWindow = window as typeof window & {
    __wbEnglishModeActive?: boolean;
    __wbDisconnectTranslateObserver?: () => void;
  };

  try {
    wbWindow.__wbEnglishModeActive = false;
  } catch {}

  try {
    wbWindow.__wbDisconnectTranslateObserver?.();
  } catch {}

  try {
    document.documentElement.removeAttribute("data-wb-translate-state");
    document.documentElement.classList.remove("translated-ltr", "translated-rtl");
    document.documentElement.setAttribute("lang", "en");
  } catch {}

  const expiredAt = new Date(0).toUTCString();
  const clearCookie = (domain?: string) => {
    const base = `googtrans=; expires=${expiredAt}; path=/`;
    document.cookie = domain ? `${base}; domain=${domain}` : base;
  };

  try {
    clearCookie();
    const hostname = window.location.hostname;
    if (hostname.includes(".")) {
      clearCookie(hostname);
      clearCookie(`.${hostname}`);
    }
  } catch {}

  try {
    document
      .querySelectorAll(
        'script[src*="translate.google.com/translate_a/element.js"], #google-translate-script, #google-translate-script-tag'
      )
      .forEach((node) => node.parentNode?.removeChild(node));
  } catch {}

  try {
    document
      .querySelectorAll(
        ".goog-te-banner-frame, .goog-te-menu-frame, .goog-tooltip, .goog-te-balloon-frame, body > .skiptranslate"
      )
      .forEach((node) => node.parentNode?.removeChild(node));
  } catch {}
}
