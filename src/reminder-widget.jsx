import React, { useState } from "react";
import { pixelButtonStyle, ButtonShine, pixelClip, OUTLINE, PIXEL_FONT, BODY_FONT } from "./pixel-ui";

// 提醒工具：遊戲內有些固定會發生的事（例如每月固定某天商店特賣、每年聖誕節活動），
// 玩家常常會忘記登入查看。這個元件會在使用者進站時，如果剛好有「今天」的提醒，
// 跳一個置中彈窗；使用者關掉彈窗後，會收合成畫面左下角的小懸浮鈴鐺圖示，
// 滑鼠移過去（或點一下，方便觸控裝置）會展開顯示完整清單，平常收起來不佔版面。
// 跟討論區右下角的「意見回饋」浮動鈕分開放在左右兩側，不會疊在一起。
//
// 這裡的提醒資料目前是寫死在程式碼裡的範例（REMINDERS），之後如果想讓你自己能新增/修改提醒，
// 需要接一個後台或簡單的設定檔案，屆時只要換掉 REMINDERS 這個陣列的資料來源即可，畫面邏輯不用改。
//
// 注意：彈窗「已讀」的狀態只存在這次瀏覽期間（React state，沒有用 localStorage），
// 所以重新整理頁面後彈窗還是會再跳出來一次 —— 這是目前沒有後端/帳號系統下的已知限制，
// 之後如果想要「今天不要再提醒」這種效果，需要接 localStorage 或帳號系統。

const REMINDERS = [
  { id: "r1", title: "行星商店固定特賣", desc: "每月 10 號商店會有限時折扣，記得上線逛逛！", rule: { type: "monthly", day: 10 } },
  { id: "r2", title: "聖誕節限定活動", desc: "遊戲內聖誕節活動通常 12 月下旬開跑，別錯過限定裝飾！", rule: { type: "yearly", month: 12, day: 25 } },
];

// 提前幾天開始在懸浮清單顯示「快到了」（彈窗仍然只在當天才跳出來）
const UPCOMING_WINDOW_DAYS = 5;

function startOfDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

// 算出這個規則「下一次」發生的日期（如果今天就是，回傳今天）
function nextOccurrence(rule, now) {
  const today = startOfDay(now);
  if (rule.type === "monthly") {
    let candidate = new Date(today.getFullYear(), today.getMonth(), rule.day);
    if (candidate < today) candidate = new Date(today.getFullYear(), today.getMonth() + 1, rule.day);
    return candidate;
  }
  // yearly
  let candidate = new Date(today.getFullYear(), rule.month - 1, rule.day);
  if (candidate < today) candidate = new Date(today.getFullYear() + 1, rule.month - 1, rule.day);
  return candidate;
}

function daysUntil(rule, now) {
  const today = startOfDay(now);
  const next = nextOccurrence(rule, now);
  return Math.round((next - today) / 86400000);
}

export default function ReminderWidget() {
  const [now] = useState(() => new Date());
  const [dismissed, setDismissed] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const withDays = REMINDERS.map((r) => ({ ...r, daysLeft: daysUntil(r.rule, now) })).sort((a, b) => a.daysLeft - b.daysLeft);

  const dueToday = withDays.filter((r) => r.daysLeft === 0);
  const upcoming = withDays.filter((r) => r.daysLeft > 0 && r.daysLeft <= UPCOMING_WINDOW_DAYS);
  const showPopup = dueToday.length > 0 && !dismissed;
  const badgeCount = dueToday.length + upcoming.length;

  return (
    <>
      {showPopup && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(38,43,82,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1100,
            padding: 20,
          }}
        >
          <div style={{ background: "#fff", border: `4px solid ${OUTLINE}`, clipPath: pixelClip(12), padding: 20, width: "min(360px, 90vw)" }}>
            <strong style={{ fontFamily: PIXEL_FONT, fontSize: 13, color: OUTLINE }}>🔔 今日提醒</strong>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12, marginBottom: 16 }}>
              {dueToday.map((r) => (
                <div key={r.id} style={{ background: "#f7f8fd", border: "2px solid #e0e3f5", padding: 10 }}>
                  <strong style={{ fontSize: 13, color: OUTLINE }}>{r.title}</strong>
                  <p style={{ margin: "4px 0 0", fontSize: 12, color: "#5a6099", fontFamily: BODY_FONT }}>{r.desc}</p>
                </div>
              ))}
            </div>
            <button onClick={() => setDismissed(true)} style={{ ...pixelButtonStyle("primary", "normal"), width: "100%" }}>
              <ButtonShine />
              知道了
            </button>
          </div>
        </div>
      )}

      <div onMouseEnter={() => setExpanded(true)} onMouseLeave={() => setExpanded(false)} style={{ position: "fixed", left: 24, bottom: 24, zIndex: 1000, fontFamily: BODY_FONT }}>
        {expanded && (
          <div
            style={{
              position: "absolute",
              bottom: 66,
              left: 0,
              width: 260,
              background: "#fff",
              border: `3px solid ${OUTLINE}`,
              clipPath: pixelClip(8),
              padding: 14,
              boxShadow: "4px 4px 0 rgba(38,43,82,.15)",
            }}
          >
            <strong style={{ fontFamily: PIXEL_FONT, fontSize: 11, color: OUTLINE }}>提醒清單</strong>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
              {withDays.map((r) => (
                <div key={r.id} style={{ fontSize: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 6 }}>
                    <strong style={{ color: OUTLINE }}>{r.title}</strong>
                    <span style={{ color: r.daysLeft === 0 ? "#e0428a" : "#8a90bf", whiteSpace: "nowrap", fontWeight: 700 }}>
                      {r.daysLeft === 0 ? "就是今天！" : `${r.daysLeft}天後`}
                    </span>
                  </div>
                  <p style={{ margin: "2px 0 0", color: "#5a6099" }}>{r.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={() => setExpanded((v) => !v)}
          title="提醒清單"
          style={{
            position: "relative",
            width: 56,
            height: 56,
            background: "#34c3f0",
            border: `4px solid ${OUTLINE}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: `inset 0 -8px 0 -1px #1fa3ce, 0 4px 0 0 ${OUTLINE}`,
            clipPath: pixelClip(16),
            cursor: "pointer",
            fontSize: 22,
          }}
        >
          🔔
          {badgeCount > 0 && (
            <span
              style={{
                position: "absolute",
                top: -6,
                right: -6,
                minWidth: 18,
                height: 18,
                padding: "0 4px",
                borderRadius: "50%",
                background: "#ff5fa2",
                border: `2px solid ${OUTLINE}`,
                color: "#fff",
                fontSize: 10,
                fontFamily: PIXEL_FONT,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {badgeCount}
            </span>
          )}
        </button>
      </div>
    </>
  );
}
