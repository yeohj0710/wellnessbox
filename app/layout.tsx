import type { Metadata } from "next";
import "./globals.css";
import { SITE_URL } from "@/lib/constants";
import TopBar from "@/components/common/topBar";
import { FooterProvider } from "@/components/common/footerContext";
import { LocalStorageProvider } from "@/components/common/localStorage";
import { LoadingProvider } from "@/components/common/loadingContext.client";
import { ToastProvider } from "@/components/common/toastContext.client";
import { pretendard } from "./fonts";
import RouteTransition from "@/components/common/routeTransition";
import KakaoExternalBridge from "@/components/common/kakaoExternalBridge";
import Script from "next/script";
import { cookies, headers } from "next/headers";

export const metadata: Metadata = {
  title: "웰니스박스 | 내 몸에 맞는 프리미엄 건강 솔루션",
  description: "내 몸에 맞는 프리미엄 건강 솔루션",
  metadataBase: new URL(SITE_URL),
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  themeColor: "#ffffff",
  icons: {
    icon: "/logo.png",
  },
  openGraph: {
    title: "웰니스박스 | 내 몸에 맞는 프리미엄 건강 솔루션",
    description: "내 몸에 맞는 프리미엄 건강 솔루션",
    url: "/",
    type: "website",
    locale: "ko_KR",
    siteName: "웰니스박스",
    images: [
      {
        url: new URL("/kakao-logo.png", SITE_URL).toString(),
        width: 800,
        height: 400,
        alt: "웰니스박스",
      },
      {
        url: new URL("/logo.png", SITE_URL).toString(),
        width: 800,
        height: 800,
        alt: "웰니스박스",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "웰니스박스 | 내 몸에 맞는 프리미엄 건강 솔루션",
    description: "내 몸에 맞는 프리미엄 건강 솔루션",
    images: [new URL("/logo.png", SITE_URL).toString()],
  },
  verification: {
    google: "rxIVuaujGlI5Tc8FtIqiIFwfntmlTl1MSA5EG9E67Rw",
    other: {
      google: ["EiOmKkr5y00llK20sdFBlYhBH_QYN7vLobIvNoNiAC4"],
      naver: ["536a76956d9646a965851d58cf29ab28600a2577"],
    },
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headerLocale = (await headers()).get("x-wb-locale");
  const localeCookie = (await cookies()).get("wb-locale");
  const isEnglish = headerLocale === "en" || localeCookie?.value === "en";
  return (
    <html lang={isEnglish ? "en" : "ko"}>
      <body
        className={`${pretendard.className} overflow-x-hidden flex flex-col bg-white`}
      >
        <KakaoExternalBridge />
        <LocalStorageProvider>
          <FooterProvider>
            <LoadingProvider>
              <ToastProvider>
                <TopBar />
                <main
                  className="min-h-[105vh] flex flex-col items-center"
                  style={{
                    paddingTop: "3.5rem",
                  }}
                >
                  {children}
                </main>
                <RouteTransition />
              </ToastProvider>
            </LoadingProvider>
          </FooterProvider>
        </LocalStorageProvider>
        <div id="google_translate_element" style={{ display: "none" }} />
        <div id="toast-portal" />

        <Script
          id="ld-json-org"
          type="application/ld+json"
          strategy="afterInteractive"
        >
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            name: "웰니스박스",
            url: SITE_URL,
            logo: new URL("/logo.png", SITE_URL).toString(),
          })}
        </Script>

        <Script
          id="ld-json-website"
          type="application/ld+json"
          strategy="afterInteractive"
        >
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: "웰니스박스",
            url: SITE_URL,
          })}
        </Script>
        {isEnglish ? (
          <>
            <style
              dangerouslySetInnerHTML={{
                __html: `
                  body { top: 0 !important; position: relative !important; }
                  body > .skiptranslate,
                  .goog-te-banner-frame,
                  .goog-te-menu-frame,
                  .goog-tooltip,
                  .goog-te-balloon-frame,
                  #google_translate_element { display: none !important; }
                  html[data-wb-translate-state="loading"] body {
                    opacity: 0;
                  }
                  html[data-wb-translate-state] body {
                    transition: opacity 0.2s ease;
                  }
                  html[data-wb-translate-state="ready"] body {
                    opacity: 1;
                  }
                `,
              }}
            />
            <Script
              id="google-translate-initializer"
              strategy="afterInteractive"
            >
              {`
                (function () {
                  var LANGUAGE_CODE = 'en';
                  var LANGUAGE_PAIR = '/ko/' + LANGUAGE_CODE;
                  window.__wbEnglishModeActive = true;

                  var readyMarked = false;
                  var readyFallback = null;

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

                  markLoading();
                  ensureCookies();
                  purgeTranslateArtifacts();
                  cleanupRootStyles();
                  disableTranslateStyleSheets();

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

                  function triggerTranslation() {
                    if (!window.__wbEnglishModeActive) {
                      return;
                    }
                    ensureCookies();
                    purgeTranslateArtifacts();
                    cleanupRootStyles();
                    disableTranslateStyleSheets();

                    var combo = document.querySelector('select.goog-te-combo');
                    if (!combo) {
                      window.setTimeout(triggerTranslation, 75);
                      return;
                    }

                    if (combo.value !== LANGUAGE_CODE) {
                      combo.value = LANGUAGE_CODE;
                    }

                    combo.dispatchEvent(new Event('change'));
                    updateReadyState();
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

                  bootTranslateElement();

                  if (document.readyState === 'complete' || document.readyState === 'interactive') {
                    triggerTranslation();
                  } else {
                    document.addEventListener('DOMContentLoaded', function handleDOMContentLoaded() {
                      document.removeEventListener('DOMContentLoaded', handleDOMContentLoaded);
                      triggerTranslation();
                    });
                  }

                  window.addEventListener('load', function handleLoad() {
                    triggerTranslation();
                    updateReadyState();
                  });

                  window.addEventListener('focus', function handleFocus() {
                    window.setTimeout(triggerTranslation, 75);
                  });

                  document.addEventListener('visibilitychange', function handleVisibility() {
                    if (!document.hidden) {
                      window.setTimeout(triggerTranslation, 75);
                    }
                  });

                  ['pushState', 'replaceState'].forEach(function (method) {
                    var original = history[method];
                    history[method] = function () {
                      var result = original.apply(this, arguments);
                      window.setTimeout(triggerTranslation, 0);
                      return result;
                    };
                  });

                  window.addEventListener('popstate', function () {
                    window.setTimeout(triggerTranslation, 0);
                  });

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

                  attributeObserver.observe(document.documentElement, {
                    attributes: true,
                    attributeFilter: ['class', 'style'],
                  });

                  var domObserver = new MutationObserver(function () {
                    if (!window.__wbEnglishModeActive) {
                      domObserver.disconnect();
                      return;
                    }
                    cleanupRootStyles();
                    disableTranslateStyleSheets();
                    purgeTranslateArtifacts();
                    updateReadyState();
                  });

                  domObserver.observe(document.documentElement, { childList: true, subtree: true });

                  window.__wbDisconnectTranslateObserver = function () {
                    attributeObserver.disconnect();
                    domObserver.disconnect();
                  };
                })();
              `}
            </Script>
            <Script
              id="google-translate-script"
              src="https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit"
              strategy="beforeInteractive"
            />
          </>
        ) : (
          <Script id="google-translate-cleanup" strategy="afterInteractive">
            {`
              (function () {
                window.__wbEnglishModeActive = false;
                try {
                  document.documentElement.removeAttribute('data-wb-translate-state');
                } catch (error) {}
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

                var bannerFrame = document.querySelector('.goog-te-banner-frame');
                if (bannerFrame && bannerFrame.parentNode) {
                  bannerFrame.parentNode.removeChild(bannerFrame);
                }

                var skipTranslate = document.querySelector('body > .skiptranslate');
                if (skipTranslate && skipTranslate.parentNode) {
                  skipTranslate.parentNode.removeChild(skipTranslate);
                }

                document.documentElement.style.top = '0px';
                document.body.style.top = '0px';
                document.documentElement.style.transform = '';
                document.body.style.transform = '';
                document.documentElement.style.fontFamily = '';
                document.body.style.fontFamily = '';
                document.documentElement.style.fontSize = '';
                document.body.style.fontSize = '';
                document.documentElement.style.letterSpacing = '';
                document.body.style.letterSpacing = '';
                document.body.style.lineHeight = '';
                document.body.style.webkitTextSizeAdjust = '';

                if (typeof window.__wbDisconnectTranslateObserver === 'function') {
                  try {
                    window.__wbDisconnectTranslateObserver();
                  } catch (error) {
                    console.error('Failed to disconnect translate observer', error);
                  }
                }
              })();
            `}
          </Script>
        )}
      </body>
    </html>
  );
}
