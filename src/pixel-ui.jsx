// pixel-ui.js
// 共用像素風 UI 樣式模組 —— 從使用者自製的「Tamagotchi Paradise UI Icons.html」萃取而來。
// 那份檔案是純 HTML/CSS(clip-path 做鋸齒轉角、box-shadow 做立體感、border 做外框、
// Google Fonts 的 Press Start 2P 做像素字），完全沒有用到任何圖片，所以不需要 Piskel
// 或任何美術素材檔案 —— 這個檔案把同一套 CSS 數值包成可以在 React 內重複使用的樣式產生器。
//
// 使用方式：其他 prototype 檔案 `import { ... } from "./pixel-ui";`
// （site-full-preview.jsx 這種合併預覽檔則直接把這個檔案的內容貼進同一個 scope，不能用 import）

import { useEffect } from "react";

export const OUTLINE = "#262b52";
export const PIXEL_FONT = "'Press Start 2P', monospace";
export const BODY_FONT = "'Nunito', system-ui, sans-serif";
export const PAGE_BG = "#dff3f9";
export const PAGE_DOT = "#c7ebf5";

// 在畫面上載入 Google Fonts（Press Start 2P + Nunito）。放在網站骨架最外層一次即可。
export function PixelFontLoader() {
  useEffect(() => {
    const id = "pixel-ui-font-link";
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Press+Start+2P&family=Nunito:wght@400;700;800&display=swap";
    document.head.appendChild(link);
  }, []);
  return null;
}

// 產生鋸齒像素轉角的 clip-path。o = 外層切角大小(px)，內層固定是 o 的一半。
// 按鈕/卡片用 12，分類籤/勾選框用 7，徽章/導覽鈕用 6，圖片框用 8，浮動鈕用 20。
export function pixelClip(o) {
  const i = o / 2;
  return (
    `polygon(0% ${o}px, ${i}px ${o}px, ${i}px ${i}px, ${o}px ${i}px, ${o}px 0%, ` +
    `calc(100% - ${o}px) 0%, calc(100% - ${o}px) ${i}px, calc(100% - ${i}px) ${i}px, calc(100% - ${i}px) ${o}px, 100% ${o}px, ` +
    `100% calc(100% - ${o}px), calc(100% - ${i}px) calc(100% - ${o}px), calc(100% - ${i}px) calc(100% - ${i}px), calc(100% - ${o}px) calc(100% - ${i}px), calc(100% - ${o}px) 100%, ` +
    `${o}px 100%, ${o}px calc(100% - ${i}px), ${i}px calc(100% - ${i}px), ${i}px calc(100% - ${o}px), 0% calc(100% - ${o}px))`
  );
}

// 按鈕左上角那兩小塊反光，直接疊在 relative 容器內即可（pressed 狀態不加）。
export function ButtonShine() {
  return (
    <>
      <span style={{ position: "absolute", top: 6, left: 16, width: 16, height: 4, background: "#fff", opacity: 0.9 }} />
      <span style={{ position: "absolute", top: 14, left: 11, width: 8, height: 4, background: "#fff", opacity: 0.7 }} />
    </>
  );
}

const BUTTON_VARIANTS = {
  primary: {
    normal: { background: "#ff5fa2", boxShadow: `inset 0 -9px 0 -1px #d43e82, 0 5px 0 0 ${OUTLINE}`, color: "#fff" },
    hover: { background: "#ff77b0", boxShadow: `inset 0 -9px 0 -1px #d43e82, 0 7px 0 0 ${OUTLINE}`, color: "#fff", transform: "translateY(-2px)" },
    active: { background: "#e0428a", boxShadow: `inset 0 -4px 0 -1px #b8306e, 0 2px 0 0 ${OUTLINE}`, color: "#fff", transform: "translateY(3px)" },
  },
  secondary: {
    normal: { background: "#ffffff", boxShadow: `inset 0 -9px 0 -1px #d7ddf5, 0 5px 0 0 ${OUTLINE}`, color: OUTLINE },
    hover: { background: "#f5f7ff", boxShadow: `inset 0 -9px 0 -1px #d7ddf5, 0 7px 0 0 ${OUTLINE}`, color: OUTLINE, transform: "translateY(-2px)" },
    active: { background: "#e7eaf9", boxShadow: `inset 0 -4px 0 -1px #c9cfec, 0 2px 0 0 ${OUTLINE}`, color: OUTLINE, transform: "translateY(3px)" },
  },
};

// state: "normal" | "hover" | "active"（active＝按下）。實務上 normal/hover 由 CSS :hover 比較道地，
// 但這裡先給 React state（例如 onMouseDown/onMouseUp）切換用，陽春夠用。
export function pixelButtonStyle(variant = "primary", state = "normal") {
  return {
    position: "relative",
    border: `4px solid ${OUTLINE}`,
    padding: "16px 32px",
    minWidth: 120,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: PIXEL_FONT,
    fontSize: 13,
    letterSpacing: 1,
    cursor: "pointer",
    clipPath: pixelClip(12),
    transition: "transform .05s",
    ...BUTTON_VARIANTS[variant][state],
  };
}

// 分類籤（道具分類／討論版面／活動篩選共用）
export function pixelTabStyle(active) {
  return active
    ? {
        fontFamily: PIXEL_FONT,
        fontSize: 11,
        color: "#fff",
        background: "#34c3f0",
        border: `3.5px solid ${OUTLINE}`,
        padding: "11px 20px",
        boxShadow: "inset 0 -6px 0 -1px #1fa3ce, 0 4px 0 0 " + OUTLINE,
        clipPath: pixelClip(7),
        cursor: "pointer",
      }
    : {
        fontFamily: PIXEL_FONT,
        fontSize: 11,
        color: "#8a90bf",
        background: "#fff",
        border: "3.5px solid #c9cfec",
        padding: "11px 20px",
        clipPath: pixelClip(7),
        cursor: "pointer",
      };
}

// 勾選框 36x36
export function pixelCheckboxStyle(checked) {
  return checked
    ? {
        width: 36,
        height: 36,
        background: "#4ecb5f",
        border: `3.5px solid ${OUTLINE}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "inset 0 -6px 0 -1px #38a848, 0 3px 0 0 " + OUTLINE,
        clipPath: pixelClip(7),
        cursor: "pointer",
      }
    : {
        width: 36,
        height: 36,
        background: "#fff",
        border: "3.5px solid #c9cfec",
        clipPath: pixelClip(7),
        cursor: "pointer",
      };
}

export function CheckboxMark() {
  return (
    <svg width="16" height="14" viewBox="0 0 16 14">
      <polyline points="1,7 6,12 15,1" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="square" strokeLinejoin="miter" />
    </svg>
  );
}

// 卡片外框(圖鑑/道具/活動卡片共用)
export function pixelCardStyle() {
  return {
    background: "#fff",
    border: `4px solid ${OUTLINE}`,
    boxShadow: "6px 6px 0 rgba(38,43,82,.18)",
    clipPath: pixelClip(12),
    padding: 20,
  };
}

// 卡片內的圖片佔位框
export function pixelImageBoxStyle() {
  return {
    width: "100%",
    background: "#c7ebf5",
    border: `3px solid ${OUTLINE}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: PIXEL_FONT,
    fontSize: 9,
    color: "#5a6099",
    clipPath: pixelClip(8),
  };
}

// 狀態徽章：進行中(green) / 即將開始(yellow) / 已結束(gray) / 已收集(pink)
const BADGE_VARIANTS = {
  green: { background: "#4ecb5f", shadow: "#38a848", color: "#fff" },
  yellow: { background: "#ffc93c", shadow: "#e8ab13", color: OUTLINE },
  gray: { background: "#a4abd6", shadow: "#8188bb", color: "#fff" },
  pink: { background: "#ff5fa2", shadow: "#d43e82", color: "#fff" },
};

export function pixelBadgeStyle(colorKey) {
  const v = BADGE_VARIANTS[colorKey] || BADGE_VARIANTS.gray;
  return {
    fontFamily: PIXEL_FONT,
    fontSize: 10,
    color: v.color,
    background: v.background,
    border: `3px solid ${OUTLINE}`,
    padding: "8px 16px",
    boxShadow: `inset 0 -5px 0 -1px ${v.shadow}`,
    clipPath: pixelClip(6),
    display: "inline-block",
  };
}

// 導覽列本身(深色底條)
export function pixelNavBarStyle() {
  return { display: "flex", gap: 10, background: OUTLINE, padding: 12, flexWrap: "wrap" };
}

export function pixelNavButtonStyle(active) {
  return active
    ? {
        fontFamily: PIXEL_FONT,
        fontSize: 11,
        color: OUTLINE,
        background: "#ffc93c",
        border: `3px solid ${OUTLINE}`,
        padding: "10px 18px",
        boxShadow: "inset 0 -5px 0 -1px #e8ab13",
        clipPath: pixelClip(8),
        cursor: "pointer",
      }
    : {
        fontFamily: PIXEL_FONT,
        fontSize: 11,
        color: "#c7cbf0",
        padding: "10px 18px",
        background: "transparent",
        border: "none",
        cursor: "pointer",
      };
}

// 浮動按鈕(討論區意見回饋) 64x64
export function pixelFabStyle(hover) {
  return {
    position: "relative",
    width: 64,
    height: 64,
    background: hover ? "#b380f0" : "#a06bea",
    border: `4px solid ${OUTLINE}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: hover
      ? "inset 0 -10px 0 -2px #8149c9, 0 7px 0 0 " + OUTLINE
      : "inset 0 -10px 0 -2px #8149c9, 0 5px 0 0 " + OUTLINE,
    transform: hover ? "translateY(-2px)" : "none",
    clipPath: pixelClip(20),
    cursor: "pointer",
  };
}

export function FabShine() {
  return <span style={{ position: "absolute", top: 12, left: 16, width: 12, height: 4, background: "#fff", opacity: 0.85 }} />;
}

// 網站底層背景(圓點格線 + 淺藍)，套在最外層容器上
export function pixelPageBg() {
  return {
    fontFamily: BODY_FONT,
    background: PAGE_BG,
    backgroundImage: `radial-gradient(${PAGE_DOT} 2px, transparent 2px)`,
    backgroundSize: "26px 26px",
    color: OUTLINE,
  };
}
