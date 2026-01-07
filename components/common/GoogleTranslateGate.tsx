"use client";

import { usePathname } from "next/navigation";
import Script from "next/script";

const DISABLED_PATH = "/en/check-ai";

function isTranslateDisabled(pathname: string | null) {
  if (!pathname) {
    return false;
  }
  return pathname === DISABLED_PATH || pathname.startsWith(`${DISABLED_PATH}/`);
}

export default function GoogleTranslateGate() {
  const pathname = usePathname();
  const disableTranslate = isTranslateDisabled(pathname);

  if (disableTranslate) {
    return null;
  }

  return (
    <>
      <div id="google_translate_element" style={{ display: "none" }} />
      <Script id="google-translate-orchestrator" strategy="afterInteractive">
        {`
            (function () {
              var LANGUAGE_CODE = 'en';
              var LANGUAGE_PAIR = '/ko/' + LANGUAGE_CODE;
              var readyMarked = false;
              var readyFallback = null;
              var pendingRetranslate = null;
              var RETRANSLATE_DELAY = 140;
              var isTranslating = false;
              var lastTranslateAt = 0;
              var TRANSLATE_DISABLED_PATHS = ['/en/check-ai'];

              function setTranslateState(state) {
                try {
                  document.documentElement.setAttribute('data-wb-translate-state', state);
                } catch (error) {}
              }

              function markReady() {
                if (readyMarked) {
                  return;
                }
                readyMarked = true;
                setTranslateState('ready');
                if (readyFallback) {
                  window.clearTimeout(readyFallback);
                  readyFallback = null;
                }
              }

              function markLoading() {
                readyMarked = false;
                setTranslateState('loading');
                if (readyFallback) {
                  window.clearTimeout(readyFallback);
                }
                readyFallback = window.setTimeout(markReady, 4000);
              }

              function setCookie(value, domain) {
                var expires = new Date();
                expires.setFullYear(expires.getFullYear() + 1);
                var cookie = 'googtrans=' + value + '; expires=' + expires.toUTCString() + '; path=/';
                if (domain) {
                  cookie += '; domain=' + domain;
                }
                document.cookie = cookie;
              }

              function ensureCookies() {
                setCookie(LANGUAGE_PAIR);
                var hostname = window.location.hostname;
                if (hostname.indexOf('.') !== -1) {
                  setCookie(LANGUAGE_PAIR, hostname);
                  setCookie(LANGUAGE_PAIR, '.' + hostname);
                }
              }

              function clearCookies() {
                var expireDate = new Date(0).toUTCString();
                function clearCookie(domain) {
                  var cookie = 'googtrans=; expires=' + expireDate + '; path=/';
                  if (domain) {
                    cookie += '; domain=' + domain;
                  }
                  document.cookie = cookie;
                }
                clearCookie();
                var hostname = window.location.hostname;
                if (hostname.indexOf('.') !== -1) {
                  clearCookie(hostname);
                  clearCookie('.' + hostname);
                }
              }

              function purgeTranslateArtifacts() {
                var bannerFrame = document.querySelector('.goog-te-banner-frame');
                if (bannerFrame && bannerFrame.parentNode) {
                  bannerFrame.parentNode.removeChild(bannerFrame);
                }

                var menuFrame = document.querySelector('.goog-te-menu-frame');
                if (menuFrame && menuFrame.parentNode) {
                  menuFrame.parentNode.removeChild(menuFrame);
                }

                var skipTranslate = document.querySelector('body > .skiptranslate');
                if (skipTranslate) {
                  skipTranslate.style.visibility = 'hidden';
                  skipTranslate.style.opacity = '0';
                  skipTranslate.style.pointerEvents = 'none';
                  skipTranslate.style.display = 'block';
                  skipTranslate.style.maxHeight = '0';
                  skipTranslate.style.width = '0';
                  skipTranslate.style.height = '0';
                  skipTranslate.style.border = '0';
                  skipTranslate.style.margin = '0';
                  skipTranslate.style.padding = '0';
                  skipTranslate.style.position = 'absolute';
                  skipTranslate.style.top = '-10000px';
                  skipTranslate.style.left = '0';
                }
              }

              function cleanupRootStyles() {
                var html = document.documentElement;
                var body = document.body;
                if (html) {
                  html.style.top = '';
                  html.style.transform = '';
                  html.style.fontSize = '';
                  html.style.letterSpacing = '';
                  html.style.fontFamily = '';
                }
                if (body) {
                  body.style.top = '';
                  body.style.transform = '';
                  body.style.fontSize = '';
                  body.style.letterSpacing = '';
                  body.style.lineHeight = '';
                  body.style.webkitTextSizeAdjust = '';
                  if (body.style.fontFamily && body.style.fontFamily.indexOf('Pretendard') === -1) {
                    body.style.fontFamily = '';
                  }
                }
              }

              function disableTranslateStyleSheets() {
                var styleSheets = [];
                try {
                  styleSheets = Array.prototype.slice.call(document.styleSheets || []);
                } catch (error) {
                  return;
                }

                styleSheets.forEach(function (sheet) {
                  var owner = sheet && sheet.ownerNode;
                  if (!owner) {
                    return;
                  }
                  var id = owner.id || '';
                  var className = owner.className || '';
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
                  document.documentElement.classList.contains('translated-ltr') ||
                  document.documentElement.classList.contains('translated-rtl')
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
                var el = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
                if (!el || typeof el.closest !== 'function') {
                  return false;
                }
                return Boolean(
                  el.closest(
                    '.goog-te-banner-frame, .goog-te-menu-frame, .goog-tooltip, .goog-te-balloon-frame, #google_translate_element'
                  )
                );
              }

              function shouldUseEnglish() {
                var path = window.location.pathname || '/';
                if (
                  TRANSLATE_DISABLED_PATHS.indexOf(path) !== -1 ||
                  path.indexOf('/en/check-ai/') === 0
                ) {
                  return false;
                }
                return path === '/en' || path.indexOf('/en/') === 0;
              }

              function isEnglishPath() {
                var path = window.location.pathname || '/';
                return path === '/en' || path.indexOf('/en/') === 0;
              }

              function setHtmlLang(isEnglish) {
                try {
                  document.documentElement.setAttribute('lang', isEnglish ? 'en' : 'ko');
                } catch (error) {}
              }

              function triggerTranslation() {
                if (!window.__wbEnglishModeActive || isTranslating) {
                  return;
                }
                var now = Date.now();
                if (now - lastTranslateAt < 120) {
                  return;
                }
                lastTranslateAt = now;
                isTranslating = true;
                ensureCookies();
                purgeTranslateArtifacts();
                cleanupRootStyles();
                disableTranslateStyleSheets();

                var combo = document.querySelector('select.goog-te-combo');
                if (!combo) {
                  window.setTimeout(triggerTranslation, 120);
                  isTranslating = false;
                  return;
                }

                if (combo.value !== LANGUAGE_CODE) {
                  combo.value = LANGUAGE_CODE;
                }

                combo.dispatchEvent(new Event('change'));
                updateReadyState();
                window.setTimeout(function () {
                  isTranslating = false;
                }, 220);
              }

              function scheduleRetranslate() {
                if (!window.__wbEnglishModeActive || isTranslating) {
                  return;
                }
                if (pendingRetranslate) {
                  return;
                }
                pendingRetranslate = window.setTimeout(function () {
                  pendingRetranslate = null;
                  triggerTranslation();
                }, RETRANSLATE_DELAY);
              }

              window.__wbApplyTranslation = triggerTranslation;

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
                      pageLanguage: 'ko',
                      includedLanguages: LANGUAGE_CODE,
                      autoDisplay: false,
                    },
                    'google_translate_element'
                  );
                  triggerTranslation();
                }
              }

              window.googleTranslateElementInit = function googleTranslateElementInit() {
                bootTranslateElement();
              };

              function loadGoogleScript() {
                if (window.google && window.google.translate) {
                  bootTranslateElement();
                  return;
                }
                if (document.getElementById('google-translate-script-tag')) {
                  return;
                }
                var script = document.createElement('script');
                script.id = 'google-translate-script-tag';
                script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
                script.async = true;
                document.head.appendChild(script);
              }

              function resetTranslateSelection() {
                var combo = document.querySelector('select.goog-te-combo');
                if (combo) {
                  combo.value = '';
                  try {
                    combo.dispatchEvent(new Event('change'));
                  } catch (error) {}
                }
              }

              function cleanupTranslateArtifacts() {
                try {
                  document.documentElement.removeAttribute('data-wb-translate-state');
                } catch (error) {}
                resetTranslateSelection();
                purgeTranslateArtifacts();
                cleanupRootStyles();
                disableTranslateStyleSheets();
                if (typeof window.__wbDisconnectTranslateObserver === 'function') {
                  try {
                    window.__wbDisconnectTranslateObserver();
                  } catch (error) {}
                }
              }

              function syncLocaleMode() {
                var shouldBeEnglish = shouldUseEnglish();
                var wasEnglish = Boolean(window.__wbEnglishModeActive);
                window.__wbEnglishModeActive = shouldBeEnglish;
                setHtmlLang(isEnglishPath());
                if (shouldBeEnglish) {
                  markLoading();
                  ensureCookies();
                  loadGoogleScript();
                  bootTranslateElement();
                  if (document.readyState === 'complete' || document.readyState === 'interactive') {
                    triggerTranslation();
                  } else {
                    document.addEventListener('DOMContentLoaded', function onceReady() {
                      document.removeEventListener('DOMContentLoaded', onceReady);
                      triggerTranslation();
                    });
                  }
                } else {
                  clearCookies();
                  if (wasEnglish) {
                    cleanupTranslateArtifacts();
                  }
                }
              }

              var attributeObserver = new MutationObserver(function () {
                if (!window.__wbEnglishModeActive) {
                  attributeObserver.disconnect();
                  return;
                }
                cleanupRootStyles();
                disableTranslateStyleSheets();
                purgeTranslateArtifacts();
                updateReadyState();
              });

              var domObserver = new MutationObserver(function (mutations) {
                if (!window.__wbEnglishModeActive) {
                  domObserver.disconnect();
                  return;
                }
                if (isTranslating) {
                  return;
                }
                var hasAppMutation = mutations.some(function (mutation) {
                  if (mutation.type !== 'childList') {
                    return false;
                  }
                  var nodes = Array.prototype.slice.call(mutation.addedNodes || []);
                  if (nodes.some(function (n) { return !isGoogleTranslateNode(n); })) {
                    return true;
                  }
                  var target = mutation.target;
                  var host = target && target.nodeType === Node.TEXT_NODE ? target.parentElement : target;
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
                try {
                  attributeObserver.observe(document.documentElement, {
                    attributes: true,
                    attributeFilter: ['class', 'style'],
                  });
                  domObserver.observe(document.documentElement, { childList: true, subtree: true });
                } catch (error) {}
              }

              window.__wbDisconnectTranslateObserver = function () {
                attributeObserver.disconnect();
                domObserver.disconnect();
              };

              ['pushState', 'replaceState'].forEach(function (method) {
                var original = history[method];
                history[method] = function () {
                  var result = original.apply(this, arguments);
                  syncLocaleMode();
                  if (window.__wbEnglishModeActive) {
                    window.setTimeout(triggerTranslation, 0);
                  }
                  return result;
                };
              });

              window.addEventListener('popstate', function () {
                syncLocaleMode();
                if (window.__wbEnglishModeActive) {
                  window.setTimeout(triggerTranslation, 0);
                }
              });

              window.addEventListener('focus', function () {
                if (window.__wbEnglishModeActive) {
                  window.setTimeout(triggerTranslation, 75);
                }
              });

              document.addEventListener('visibilitychange', function () {
                if (!document.hidden && window.__wbEnglishModeActive) {
                  window.setTimeout(triggerTranslation, 75);
                }
              });

              window.addEventListener('wb-locale-change', function () {
                syncLocaleMode();
                if (window.__wbEnglishModeActive) {
                  triggerTranslation();
                }
              });

              startObservers();
              syncLocaleMode();
            })();
            `}
      </Script>
      <Script
        id="google-translate-script"
        src="https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit"
        strategy="beforeInteractive"
      />
    </>
  );
}
