import React, { useState } from "react";
import ZukanPrototype from "./zukan-prototype";
import ItemsPrototype from "./items-prototype";
import EventsPrototype from "./events-prototype";
import ForumPrototype from "./forum-prototype";
import ReminderWidget from "./reminder-widget";
import AdminPanel from "./admin-panel";
import {
  PixelFontLoader,
  pixelPageBg,
  pixelNavButtonStyle,
  pixelBadgeStyle,
  pixelClip,
  OUTLINE,
  PIXEL_FONT,
  BODY_FONT,
} from "./pixel-ui";

// 這是「網站骨架」：頂部導覽列（所有頁面共用）＋首頁的組成方式。
// 視覺樣式已經套用 pixel-ui.js 這套糖果像素風格（來自使用者自製的 UI 設計稿），
// 圖鑑／道具／活動／討論區四個功能頁面的內容邏輯完全沒有更動，只是被裝進這個骨架的
// <main> 主內容區裡展示，導覽列、頁面切換邏輯、首頁排版都是骨架自己的。

const PAGES = [
  { key: "home", label: "首頁" },
  { key: "zukan", label: "角色圖鑑" },
  { key: "items", label: "道具與兌換碼" },
  { key: "events", label: "活動一覽" },
  { key: "forum", label: "討論區" },
  { key: "admin", label: "後台管理" },
];

// 首頁「活動快訊」預覽用的精簡資料，跟 events-prototype.jsx 的完整資料是分開的兩份，
// 這裡只是示範首頁要抓哪幾筆、長什麼樣子，之後真正串接時會改成從活動資料裡自動抓「進行中／即將開始」的前幾筆。
const EVENT_PREVIEW = [
  { id: "e2", name: "行星探索週", status: "ongoing", image: null, dateText: "07/20 ～ 08/05" },
  { id: "e3", name: "星空觀測祭", status: "upcoming", image: null, dateText: "08/10 ～ 08/20" },
];
const HOME_EVENT_STATUS_LABEL = { ongoing: "進行中", upcoming: "即將開始" };
const HOME_EVENT_BADGE_COLOR = { ongoing: "green", upcoming: "yellow" };

// 首頁「討論區最新文章」預覽用的精簡資料，之後真正串接時會改成從討論區資料裡自動抓最新的前幾篇。
const FORUM_PREVIEW = [
  { id: "p5", title: "發現一組新碼", board: "兌換碼回報區", replyCount: 3, reactionCount: 12 },
  { id: "p3", title: "跳跳丸青年→成年 條件整理", board: "遊戲攻略討論區", replyCount: 5, reactionCount: 20 },
  { id: "p2", title: "找人一起互相拜訪！", board: "揪團配對區", replyCount: 1, reactionCount: 4 },
];

function TopNav({ current, onNavigate }) {
  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "14px 20px",
        background: OUTLINE,
        flexWrap: "wrap",
        gap: 10,
      }}
    >
      <button
        onClick={() => onNavigate("home")}
        style={{
          border: "none",
          background: "none",
          cursor: "pointer",
          padding: 0,
          fontFamily: PIXEL_FONT,
          fontSize: 13,
          color: "#fff",
          letterSpacing: 1,
        }}
      >
        🐣 TAMAGOTCHI PARADISE
      </button>
      <nav style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {PAGES.filter((p) => p.key !== "home").map((p) => (
          <button key={p.key} onClick={() => onNavigate(p.key)} style={pixelNavButtonStyle(current === p.key)}>
            {p.label}
          </button>
        ))}
      </nav>
    </header>
  );
}

function EntryCard({ label, desc, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        textAlign: "left",
        border: `3px solid ${OUTLINE}`,
        padding: 16,
        background: "#fff",
        cursor: "pointer",
        clipPath: pixelClip(8),
        boxShadow: "4px 4px 0 rgba(38,43,82,.15)",
      }}
    >
      <strong style={{ fontSize: 13, fontFamily: PIXEL_FONT, color: OUTLINE }}>{label}</strong>
      <p style={{ margin: "8px 0 0", fontSize: 12, color: "#8a90bf", fontFamily: BODY_FONT }}>{desc}</p>
    </button>
  );
}

// 活動快訊卡片：一格一格的長方形，上面是宣傳圖、下面是標題＋時間＋狀態。整張卡片可以點擊進去看。
function EventPreviewCard({ event, onOpen }) {
  return (
    <button
      onClick={onOpen}
      style={{
        display: "block",
        width: "100%",
        textAlign: "left",
        border: `3px solid ${OUTLINE}`,
        overflow: "hidden",
        background: "#fff",
        cursor: "pointer",
        padding: 0,
        clipPath: pixelClip(8),
        boxShadow: "4px 4px 0 rgba(38,43,82,.15)",
      }}
    >
      <div
        style={{
          aspectRatio: "4 / 3",
          background: "#c7ebf5",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#5a6099",
          fontSize: 11,
          fontFamily: PIXEL_FONT,
        }}
      >
        {event.image ? (
          <img src={event.image} alt={event.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          "宣傳圖"
        )}
      </div>
      <div style={{ padding: 10 }}>
        <strong style={{ fontSize: 13, display: "block", fontFamily: BODY_FONT, color: OUTLINE }}>{event.name}</strong>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8, gap: 6 }}>
          <span style={{ fontSize: 11, color: "#8a90bf", fontFamily: BODY_FONT }}>{event.dateText}</span>
          <span style={pixelBadgeStyle(HOME_EVENT_BADGE_COLOR[event.status])}>{HOME_EVENT_STATUS_LABEL[event.status]}</span>
        </div>
      </div>
    </button>
  );
}

// 討論區最新文章的橫條，右邊顯示「熱度」（留言數＋表情數）。整條可以點擊進去看。
function ForumPreviewRow({ post, onOpen }) {
  return (
    <button
      onClick={onOpen}
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        width: "100%",
        textAlign: "left",
        border: `2px solid ${OUTLINE}`,
        padding: 10,
        background: "#fff",
        cursor: "pointer",
        gap: 8,
        clipPath: pixelClip(6),
        fontFamily: BODY_FONT,
      }}
    >
      <div style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        <span style={{ fontSize: 13, color: OUTLINE }}>{post.title}</span>
        <span style={{ fontSize: 11, color: "#8a90bf", marginLeft: 8 }}>{post.board}</span>
      </div>
      <div style={{ display: "flex", gap: 10, fontSize: 12, color: "#8a90bf", whiteSpace: "nowrap", flexShrink: 0 }}>
        <span>💬 {post.replyCount}</span>
        <span>❤️ {post.reactionCount}</span>
      </div>
    </button>
  );
}

function HomePage({ onNavigate }) {
  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ marginBottom: 8, fontSize: 18, fontFamily: PIXEL_FONT, color: OUTLINE, letterSpacing: 1 }}>
          歡迎來到 TAMAGOTCHI PARADISE
        </h1>
        <p style={{ color: "#5a6099", fontSize: 14, margin: 0 }}>
          這裡整理了角色圖鑑、道具與兌換碼、活動情報，也歡迎在討論區跟其他玩家交流養成心得。
        </p>
      </div>

      {/* 四個功能入口卡片 */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14, marginBottom: 36 }}>
        <EntryCard label="角色圖鑑" desc="收集進度、進化條件" onClick={() => onNavigate("zukan")} />
        <EntryCard label="道具與兌換碼" desc="查詢道具、複製兌換碼" onClick={() => onNavigate("items")} />
        <EntryCard label="活動一覽" desc="進行中／即將開始的活動" onClick={() => onNavigate("events")} />
        <EntryCard label="討論區" desc="發問、分享、交流" onClick={() => onNavigate("forum")} />
      </div>

      {/* 活動快訊預覽 */}
      <div style={{ marginBottom: 36 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
          <h3 style={{ margin: 0, fontSize: 13, fontFamily: PIXEL_FONT, color: OUTLINE }}>活動快訊</h3>
          <button
            onClick={() => onNavigate("events")}
            style={{ border: "none", background: "none", color: "#ff5fa2", fontSize: 12, cursor: "pointer", fontWeight: 700 }}
          >
            查看全部活動 →
          </button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 14 }}>
          {EVENT_PREVIEW.map((e) => (
            <EventPreviewCard key={e.id} event={e} onOpen={() => onNavigate("events")} />
          ))}
        </div>
      </div>

      {/* 討論區最新文章預覽 */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
          <h3 style={{ margin: 0, fontSize: 13, fontFamily: PIXEL_FONT, color: OUTLINE }}>討論區最新文章</h3>
          <button
            onClick={() => onNavigate("forum")}
            style={{ border: "none", background: "none", color: "#ff5fa2", fontSize: 12, cursor: "pointer", fontWeight: 700 }}
          >
            查看討論區 →
          </button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {FORUM_PREVIEW.map((p) => (
            <ForumPreviewRow key={p.id} post={p} onOpen={() => onNavigate("forum")} />
          ))}
        </div>
      </div>
    </div>
  );
}

// 底部欄：所有頁面共用。放版權/免責聲明（同人網站對 BANDAI 版權的自我保護聲明）跟社群連結。
// THREADS_URL 先放一個示意用的網址，記得換成你自己的 Threads 帳號連結。
const THREADS_URL = "https://www.threads.net/@your_account"; // ← 換成你自己的 Threads 帳號網址

function Footer() {
  return (
    <footer
      style={{
        borderTop: `2px solid ${OUTLINE}`,
        padding: "16px 24px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 8,
        fontFamily: BODY_FONT,
      }}
    >
      <p style={{ margin: 0, fontSize: 12, color: "#8a90bf" }}>
        本站為玩家自製的非官方粉絲網站，Tamagotchi Paradise 為 BANDAI 所有，本站與 BANDAI 官方無任何關係。
      </p>
      <a
        href={THREADS_URL}
        target="_blank"
        rel="noopener noreferrer"
        style={{ fontSize: 12, color: "#ff5fa2", textDecoration: "none", whiteSpace: "nowrap", fontWeight: 700 }}
      >
        Threads →
      </a>
    </footer>
  );
}

export default function SiteShellPrototype() {
  const [page, setPage] = useState("home");

  return (
    <div style={{ minHeight: "100vh", ...pixelPageBg() }}>
      <PixelFontLoader />
      <ReminderWidget />
      <div style={{ maxWidth: 960, margin: "0 auto" }}>
        <TopNav current={page} onNavigate={setPage} />

        {page === "home" && <HomePage onNavigate={setPage} />}
        {page === "zukan" && <ZukanPrototype />}
        {page === "items" && <ItemsPrototype />}
        {page === "events" && <EventsPrototype />}
        {page === "forum" && <ForumPrototype />}
        {page === "admin" && <AdminPanel />}

        <Footer />
      </div>
    </div>
  );
}
