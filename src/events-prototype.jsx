import React, { useState, useEffect } from "react";
import { pixelTabStyle, pixelBadgeStyle, pixelClip, OUTLINE, PIXEL_FONT, BODY_FONT } from "./pixel-ui";
import { supabase } from "./supabaseClient";

// 活動跟官方情報現在都存在同一張 Supabase 的 events 表裡，用 type 欄位（'event' / 'news'）區分，
// 讀出來後這個檔案會照原本的欄位習慣（name/startDate/endDate 給活動，title/publishedAt/content 給情報）
// 分別組成兩份陣列，所以下面畫面的部分完全不用改。
//
// startDate / endDate 都是「可選」欄位 —— 某些活動（例如常態開放的活動）可以不設定時間，
// 一律留空即可，畫面會自動顯示為「長期開放」而不會出現倒數。
//
// intro（簡介）支援兩種寫法，存在資料庫的 intro 這個 jsonb 欄位裡：
//   1. 純文字字串（跟之前一樣）
//   2. 陣列，混合「純文字片段」與 { type: "link", text, url } 連結片段，
//      用來在內文中插入可點擊的連結（例如活動規則說明頁）

const STATUS_LABEL = {
  upcoming: "即將開始",
  ongoing: "進行中",
  ended: "已結束",
};

// 對應 pixel-ui.js 裡 pixelBadgeStyle 的色系 key（green/yellow/gray/pink）
const STATUS_BADGE_COLOR = {
  upcoming: "yellow",
  ongoing: "green",
  ended: "gray",
};

// 未設定的時間一律視為「沒有限制」：
// - 沒有 startDate → 一開始就算已經開始
// - 沒有 endDate → 沒有結束時間，永遠不會變成「已結束」
function getStatus(event, now) {
  const start = event.startDate ? new Date(event.startDate).getTime() : null;
  const end = event.endDate ? new Date(event.endDate).getTime() : null;
  if (start !== null && now < start) return "upcoming";
  if (end !== null && now > end) return "ended";
  return "ongoing";
}

function formatCountdown(ms) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  return `${days}天 ${hours}時 ${minutes}分 ${seconds}秒`;
}

function formatDate(iso) {
  const d = new Date(iso);
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
}

function DateRangeText({ event }) {
  const { startDate, endDate } = event;
  if (!startDate && !endDate) return <span>長期開放</span>;
  if (startDate && endDate) {
    return (
      <span>
        {startDate.slice(0, 10)} ～ {endDate.slice(0, 10)}
      </span>
    );
  }
  if (startDate) return <span>{startDate.slice(0, 10)} 起</span>;
  return <span>至 {endDate.slice(0, 10)} 止</span>;
}

function CountdownText({ event, now }) {
  const status = getStatus(event, now);

  if (status === "upcoming") {
    const start = new Date(event.startDate).getTime();
    return <span>倒數開始：{formatCountdown(start - now)}</span>;
  }
  if (status === "ongoing") {
    if (!event.endDate) return <span style={{ color: "#8a90bf" }}>長期開放，無倒數</span>;
    const end = new Date(event.endDate).getTime();
    return <span>倒數結束：{formatCountdown(end - now)}</span>;
  }
  return <span style={{ color: "#8a90bf" }}>活動已結束</span>;
}

// intro 支援純字串或「文字＋連結」混合陣列
function IntroText({ intro }) {
  if (typeof intro === "string") return <>{intro}</>;
  return (
    <>
      {intro.map((seg, i) =>
        typeof seg === "string" ? (
          <React.Fragment key={i}>{seg}</React.Fragment>
        ) : (
          <a key={i} href={seg.url} target="_blank" rel="noopener noreferrer" style={{ color: "#ff5fa2", fontWeight: 700 }}>
            {seg.text}
          </a>
        )
      )}
    </>
  );
}

// 點標題 → 用 modal 在畫面正中央大張顯示圖片（活動、官方情報共用同一個 modal）
function ClickableTitle({ name, onOpen }) {
  return (
    <strong onClick={onOpen} style={{ cursor: "pointer", color: OUTLINE, textDecoration: "underline dotted", textUnderlineOffset: 3 }}>
      {name}
    </strong>
  );
}

// 圖片一律用 maxWidth/maxHeight + objectFit: contain 顯示，圖鑑、道具、活動、官方情報都會用一般照片風格素材
// （非手繪像素圖），所以這裡不設定 imageRendering: pixelated。
function ImageModal({ item, onClose }) {
  if (!item) return null;
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(38,43,82,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: 20,
      }}
    >
      <div
        onClick={(ev) => ev.stopPropagation()}
        style={{
          background: "#fff",
          border: `4px solid ${OUTLINE}`,
          clipPath: pixelClip(12),
          padding: 16,
          maxWidth: "90vw",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
          <strong style={{ color: OUTLINE }}>{item.name}</strong>
          <button onClick={onClose} style={{ border: "none", background: "none", fontSize: 18, cursor: "pointer", color: OUTLINE, lineHeight: 1 }}>
            ✕
          </button>
        </div>

        <div
          style={{
            width: "min(480px, 80vw)",
            height: "min(480px, 60vh)",
            background: "#f0f2fc",
            border: "2px solid #c9cfec",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#8a90bf",
            fontSize: 13,
            overflow: "hidden",
          }}
        >
          {item.image ? (
            <img src={item.image} alt={item.name} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
          ) : (
            "圖片（尚未設定）"
          )}
        </div>
      </div>
    </div>
  );
}

// 活動／官方情報 模式切換籤，樣式跟其他分類籤稍微不同（比較粗，代表這是最上層的模式切換，不是篩選）
function ModeToggle({ mode, onChange }) {
  return (
    <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
      <button onClick={() => onChange("events")} style={pixelTabStyle(mode === "events")}>
        活動
      </button>
      <button onClick={() => onChange("news")} style={pixelTabStyle(mode === "news")}>
        官方情報
      </button>
    </div>
  );
}

export default function EventsPrototype() {
  const [mode, setMode] = useState("events");
  const [now, setNow] = useState(Date.now());
  const [filter, setFilter] = useState("all");
  const [openImageItem, setOpenImageItem] = useState(null);
  const [events, setEvents] = useState([]);
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    supabase
      .from("events")
      .select("*")
      .then(({ data, error }) => {
        if (error) {
          setLoadError(error.message);
          setLoading(false);
          return;
        }
        const rows = data || [];
        setEvents(
          rows
            .filter((r) => r.type === "event")
            .map((r) => ({ id: r.id, name: r.title, image: r.image_url, intro: r.intro, startDate: r.start_date, endDate: r.end_date }))
        );
        setNews(
          rows
            .filter((r) => r.type === "news")
            .map((r) => ({ id: r.id, title: r.title, image: r.image_url, content: r.intro, publishedAt: r.published_at }))
        );
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div style={{ maxWidth: 680, margin: "0 auto", padding: 20, fontFamily: BODY_FONT }}>
        <h2 style={{ marginBottom: 4, fontFamily: PIXEL_FONT, fontSize: 16, color: OUTLINE }}>活動與官方情報</h2>
        <p style={{ color: "#8a90bf", fontSize: 14 }}>載入中...</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div style={{ maxWidth: 680, margin: "0 auto", padding: 20, fontFamily: BODY_FONT }}>
        <h2 style={{ marginBottom: 4, fontFamily: PIXEL_FONT, fontSize: 16, color: OUTLINE }}>活動與官方情報</h2>
        <p style={{ color: "#e0428a", fontSize: 14 }}>資料讀取失敗：{loadError}</p>
      </div>
    );
  }

  const withStatus = events.map((e) => ({ ...e, status: getStatus(e, now) }));

  const counts = {
    all: withStatus.length,
    ongoing: withStatus.filter((e) => e.status === "ongoing").length,
    upcoming: withStatus.filter((e) => e.status === "upcoming").length,
    ended: withStatus.filter((e) => e.status === "ended").length,
  };

  const filtered = withStatus
    .filter((e) => (filter === "all" ? true : e.status === filter))
    .sort((a, b) => {
      // 進行中 > 即將開始 > 已結束，同狀態內依開始時間排序（沒設定開始時間的排最後）
      const order = { ongoing: 0, upcoming: 1, ended: 2 };
      if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status];
      const aStart = a.startDate ? new Date(a.startDate).getTime() : Infinity;
      const bStart = b.startDate ? new Date(b.startDate).getTime() : Infinity;
      return aStart - bStart;
    });

  const sortedNews = [...news].sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

  const TABS = [
    { key: "all", label: "全部" },
    { key: "ongoing", label: "進行中" },
    { key: "upcoming", label: "即將開始" },
    { key: "ended", label: "已結束" },
  ];

  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: 20, fontFamily: BODY_FONT }}>
      <h2 style={{ marginBottom: 4, fontFamily: PIXEL_FONT, fontSize: 16, color: OUTLINE }}>活動與官方情報</h2>
      <p style={{ color: "#8a90bf", fontSize: 13, marginTop: 0 }}>
        {mode === "events" ? "活動狀態依目前時間自動判斷，倒數每秒即時更新；點標題可放大顯示活動圖片" : "官方發布的消息與公告，沒有時間限制，依發布時間排序"}
      </p>

      <ModeToggle mode={mode} onChange={setMode} />

      {mode === "events" && (
        <>
          <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
            {TABS.map((t) => (
              <button key={t.key} onClick={() => setFilter(t.key)} style={pixelTabStyle(filter === t.key)}>
                {t.label} ({counts[t.key]})
              </button>
            ))}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {filtered.map((e) => (
              <div
                key={e.id}
                style={{ border: `3px solid ${OUTLINE}`, padding: 14, clipPath: pixelClip(8), background: "#fff", boxShadow: "3px 3px 0 rgba(38,43,82,.12)" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <ClickableTitle name={e.name} onOpen={() => setOpenImageItem(e)} />
                  <span style={pixelBadgeStyle(STATUS_BADGE_COLOR[e.status])}>{STATUS_LABEL[e.status]}</span>
                </div>

                <p style={{ margin: "6px 0 0", fontSize: 13, color: "#5a6099" }}>
                  <IntroText intro={e.intro} />
                </p>
                <p style={{ margin: "6px 0 0", fontSize: 12, color: "#8a90bf" }}>
                  <DateRangeText event={e} />
                </p>
                <p style={{ margin: "4px 0 0", fontSize: 13, fontWeight: 700, color: OUTLINE }}>
                  <CountdownText event={e} now={now} />
                </p>
              </div>
            ))}

            {filtered.length === 0 && <p style={{ color: "#8a90bf", fontSize: 14 }}>目前沒有符合的活動</p>}
          </div>
        </>
      )}

      {mode === "news" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {sortedNews.map((n) => (
            <div key={n.id} style={{ border: `3px solid ${OUTLINE}`, padding: 14, clipPath: pixelClip(8), background: "#fff", boxShadow: "3px 3px 0 rgba(38,43,82,.12)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <ClickableTitle name={n.title} onOpen={() => setOpenImageItem({ name: n.title, image: n.image })} />
              </div>
              <p style={{ margin: "6px 0 0", fontSize: 13, color: "#5a6099" }}>{n.content}</p>
              <p style={{ margin: "6px 0 0", fontSize: 12, color: "#8a90bf" }}>發布於 {formatDate(n.publishedAt)}</p>
            </div>
          ))}

          {sortedNews.length === 0 && <p style={{ color: "#8a90bf", fontSize: 14 }}>目前沒有官方情報</p>}
        </div>
      )}

      <ImageModal item={openImageItem} onClose={() => setOpenImageItem(null)} />
    </div>
  );
}
