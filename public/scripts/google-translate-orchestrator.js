const LANGUAGE_CODE = "en";
const LANGUAGE_PAIR = `/ko/${LANGUAGE_CODE}`;
const RETRANSLATE_DELAY = 140;
const TRANSLATE_DISABLED_PATHS = ["/en/check-ai"];

let readyMarked = false;
let readyFallback = null;
let pendingRetranslate = null;
let isTranslating = false;
let lastTranslateAt = 0;

function setTranslateState(state) {
  try {
    document.documentElement.setAttribute("data-wb-translate-state", state);
  } catch (error) {}
}

function markReady() {
  if (readyMarked) {
    return;
  }
  readyMarked = true;
  setTranslateState("ready");
  if (readyFallback) {
    window.clearTimeout(readyFallback);
    readyFallback = null;
  }
}

function markLoading() {
  readyMarked = false;
  setTranslateState("loading");
  if (readyFallback) {
    window.clearTimeout(readyFallback);
  }
  readyFallback = window.setTimeout(markReady, 4000);
}

function setCookie(value, domain) {
  const expires = new Date();
  expires.setFullYear(expires.getFullYear() + 1);
  let cookie = `googtrans=${value}; expires=${expires.toUTCString()}; path=/`;
  if (domain) {
    cookie += `; domain=${domain}`;
  }
  document.cookie = cookie;
}

function ensureCookies() {
  setCookie(LANGUAGE_PAIR);
  const hostname = window.location.hostname;
  if (hostname.indexOf(".") !== -1) {
    setCookie(LANGUAGE_PAIR, hostname);
    setCookie(LANGUAGE_PAIR, `.${hostname}`);
  }
}

function clearCookies() {
  const expireDate = new Date(0).toUTCString();
  function clearCookie(domain) {
    let cookie = `googtrans=; expires=${expireDate}; path=/`;
    if (domain) {
      cookie += `; domain=${domain}`;
    }
    document.cookie = cookie;
  }
  clearCookie();
  const hostname = window.location.hostname;
  if (hostname.indexOf(".") !== -1) {
    clearCookie(hostname);
    clearCookie(`.${hostname}`);
  }
}

function purgeTranslateArtifacts() {
  const bannerFrame = document.querySelector(".goog-te-banner-frame");
  if (bannerFrame && bannerFrame.parentNode) {
    bannerFrame.parentNode.removeChild(bannerFrame);
  }

  const menuFrame = document.querySelector(".goog-te-menu-frame");
  if (menuFrame && menuFrame.parentNode) {
    menuFrame.parentNode.removeChild(menuFrame);
  }

  const skipTranslate = document.querySelector("body > .skiptranslate");
  if (!skipTranslate) {
    return;
  }

  skipTranslate.style.visibility = "hidden";
  skipTranslate.style.opacity = "0";
  skipTranslate.style.pointerEvents = "none";
  skipTranslate.style.display = "block";
  skipTranslate.style.maxHeight = "0";
  skipTranslate.style.width = "0";
  skipTranslate.style.height = "0";
  skipTranslate.style.border = "0";
  skipTranslate.style.margin = "0";
  skipTranslate.style.padding = "0";
  skipTranslate.style.position = "absolute";
  skipTranslate.style.top = "-10000px";
  skipTranslate.style.left = "0";
}

function cleanupRootStyles() {
  const html = document.documentElement;
  const body = document.body;

  if (html) {
    html.style.top = "";
    html.style.transform = "";
    html.style.fontSize = "";
    html.style.letterSpacing = "";
    html.style.fontFamily = "";
  }

  if (!body) {
    return;
  }

  body.style.top = "";
  body.style.transform = "";
  body.style.fontSize = "";
  body.style.letterSpacing = "";
  body.style.lineHeight = "";
  body.style.webkitTextSizeAdjust = "";
  if (body.style.fontFamily && body.style.fontFamily.indexOf("Pretendard") === -1) {
    body.style.fontFamily = "";
  }
}

function disableTranslateStyleSheets() {
  let styleSheets = [];
  try {
    styleSheets = Array.prototype.slice.call(document.styleSheets || []);
  } catch (error) {
    return;
  }

  styleSheets.forEach((sheet) => {
    const owner = sheet && sheet.ownerNode;
    if (!owner) {
      return;
    }
    const id = owner.id || "";
    const className = owner.className || "";
    if (/^goog/i.test(id) || /^google-translate/i.test(id) || /goog-te/i.test(className)) {
      try {
        sheet.disabled = true;
      } catch (error) {}
      if (owner.parentNode) {
        owner.parentNode.removeChild(owner);
      }
    }
  });
}

function updateReadyState() {
  if (
    document.documentElement.classList.contains("translated-ltr") ||
    document.documentElement.classList.contains("translated-rtl")
  ) {
    markReady();
    return true;
  }
  return false;
}

function isGoogleTranslateNode(node) {
  if (!node) {
    return false;
  }
  const el = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
  if (!el || typeof el.closest !== "function") {
    return false;
  }
  return Boolean(
    el.closest(
      ".goog-te-banner-frame, .goog-te-menu-frame, .goog-tooltip, .goog-te-balloon-frame, #google_translate_element"
    )
  );
}

function shouldUseEnglish() {
  const path = window.location.pathname || "/";
  if (
    TRANSLATE_DISABLED_PATHS.indexOf(path) !== -1 ||
    path.indexOf("/en/check-ai/") === 0
  ) {
    return false;
  }
  return path === "/en" || path.indexOf("/en/") === 0;
}

function isEnglishPath() {
  const path = window.location.pathname || "/";
  return path === "/en" || path.indexOf("/en/") === 0;
}

function setHtmlLang(isEnglish) {
  try {
    document.documentElement.setAttribute("lang", isEnglish ? "en" : "ko");
  } catch (error) {}
}

function triggerTranslation() {
  if (!window.__wbEnglishModeActive || isTranslating) {
    return;
  }

  const now = Date.now();
  if (now - lastTranslateAt < 120) {
    return;
  }
  lastTranslateAt = now;
  isTranslating = true;

  ensureCookies();
  purgeTranslateArtifacts();
  cleanupRootStyles();
  disableTranslateStyleSheets();

  const combo = document.querySelector("select.goog-te-combo");
  if (!combo) {
    window.setTimeout(triggerTranslation, 120);
    isTranslating = false;
    return;
  }

  if (combo.value !== LANGUAGE_CODE) {
    combo.value = LANGUAGE_CODE;
  }
  combo.dispatchEvent(new Event("change"));
  updateReadyState();

  window.setTimeout(() => {
    isTranslating = false;
  }, 220);
}

function scheduleRetranslate() {
  if (!window.__wbEnglishModeActive || isTranslating || pendingRetranslate) {
    return;
  }
  pendingRetranslate = window.setTimeout(() => {
    pendingRetranslate = null;
    triggerTranslation();
  }, RETRANSLATE_DELAY);
}

function bootTranslateElement() {
  if (!window.__wbEnglishModeActive) {
    return;
  }

  if (window.__wbTranslateElement) {
    triggerTranslation();
    return;
  }

  if (window.google && window.google.translate && window.google.translate.TranslateElement) {
    window.__wbTranslateElement = new window.google.translate.TranslateElement(
      {
        pageLanguage: "ko",
        includedLanguages: LANGUAGE_CODE,
        autoDisplay: false,
      },
      "google_translate_element"
    );
    triggerTranslation();
  }
}

function loadGoogleScript() {
  if (window.google && window.google.translate) {
    bootTranslateElement();
    return;
  }
  if (document.getElementById("google-translate-script-tag")) {
    return;
  }

  const script = document.createElement("script");
  script.id = "google-translate-script-tag";
  script.src = "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
  script.async = true;
  document.head.appendChild(script);
}

function resetTranslateSelection() {
  const combo = document.querySelector("select.goog-te-combo");
  if (!combo) {
    return;
  }
  combo.value = "";
  try {
    combo.dispatchEvent(new Event("change"));
  } catch (error) {}
}

function cleanupTranslateArtifacts() {
  try {
    document.documentElement.removeAttribute("data-wb-translate-state");
  } catch (error) {}
  resetTranslateSelection();
  purgeTranslateArtifacts();
  cleanupRootStyles();
  disableTranslateStyleSheets();
  if (typeof window.__wbDisconnectTranslateObserver === "function") {
    try {
      window.__wbDisconnectTranslateObserver();
    } catch (error) {}
  }
}

function runWhenDomReady(callback) {
  if (document.readyState === "complete" || document.readyState === "interactive") {
    callback();
    return;
  }

  function onceReady() {
    document.removeEventListener("DOMContentLoaded", onceReady);
    callback();
  }

  document.addEventListener("DOMContentLoaded", onceReady);
}

function syncLocaleMode() {
  const shouldBeEnglish = shouldUseEnglish();
  const wasEnglish = Boolean(window.__wbEnglishModeActive);
  window.__wbEnglishModeActive = shouldBeEnglish;

  setHtmlLang(isEnglishPath());

  if (shouldBeEnglish) {
    markLoading();
    ensureCookies();
    loadGoogleScript();
    bootTranslateElement();
    runWhenDomReady(triggerTranslation);
    return;
  }

  clearCookies();
  if (wasEnglish) {
    cleanupTranslateArtifacts();
  }
}

const attributeObserver = new MutationObserver(() => {
  if (!window.__wbEnglishModeActive) {
    attributeObserver.disconnect();
    return;
  }
  cleanupRootStyles();
  disableTranslateStyleSheets();
  purgeTranslateArtifacts();
  updateReadyState();
});

const domObserver = new MutationObserver((mutations) => {
  if (!window.__wbEnglishModeActive) {
    domObserver.disconnect();
    return;
  }
  if (isTranslating) {
    return;
  }

  const hasAppMutation = mutations.some((mutation) => {
    if (mutation.type !== "childList") {
      return false;
    }

    const nodes = Array.prototype.slice.call(mutation.addedNodes || []);
    if (nodes.some((node) => !isGoogleTranslateNode(node))) {
      return true;
    }

    const target = mutation.target;
    const host = target && target.nodeType === Node.TEXT_NODE ? target.parentElement : target;
    if (!host) {
      return false;
    }
    return !isGoogleTranslateNode(host);
  });

  if (!hasAppMutation) {
    return;
  }

  cleanupRootStyles();
  disableTranslateStyleSheets();
  purgeTranslateArtifacts();
  updateReadyState();
  scheduleRetranslate();
});

function startObservers() {
  if (window.__wbTranslateObserversStarted) {
    return;
  }
  window.__wbTranslateObserversStarted = true;

  try {
    attributeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "style"],
    });
    domObserver.observe(document.documentElement, { childList: true, subtree: true });
  } catch (error) {}
}

function patchHistoryNavigation() {
  if (window.__wbTranslateHistoryPatched) {
    return;
  }
  window.__wbTranslateHistoryPatched = true;

  ["pushState", "replaceState"].forEach((method) => {
    const original = history[method];
    history[method] = function patchedHistoryMethod() {
      const result = original.apply(this, arguments);
      syncLocaleMode();
      if (window.__wbEnglishModeActive) {
        window.setTimeout(triggerTranslation, 0);
      }
      return result;
    };
  });
}

function registerEventHandlers() {
  window.addEventListener("popstate", () => {
    syncLocaleMode();
    if (window.__wbEnglishModeActive) {
      window.setTimeout(triggerTranslation, 0);
    }
  });

  window.addEventListener("focus", () => {
    if (window.__wbEnglishModeActive) {
      window.setTimeout(triggerTranslation, 75);
    }
  });

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && window.__wbEnglishModeActive) {
      window.setTimeout(triggerTranslation, 75);
    }
  });

  window.addEventListener("wb-locale-change", () => {
    syncLocaleMode();
    if (window.__wbEnglishModeActive) {
      triggerTranslation();
    }
  });
}

function initGoogleTranslateOrchestrator() {
  if (window.__wbTranslateOrchestratorBooted) {
    return;
  }
  window.__wbTranslateOrchestratorBooted = true;

  window.__wbApplyTranslation = triggerTranslation;
  window.googleTranslateElementInit = function googleTranslateElementInit() {
    bootTranslateElement();
  };
  window.__wbDisconnectTranslateObserver = function disconnectTranslateObserver() {
    attributeObserver.disconnect();
    domObserver.disconnect();
    window.__wbTranslateObserversStarted = false;
  };

  patchHistoryNavigation();
  registerEventHandlers();
  startObservers();
  syncLocaleMode();
}

initGoogleTranslateOrchestrator();
