import React, { useState } from "react";
import { pixelCheckboxStyle, CheckboxMark, pixelBadgeStyle, pixelClip, OUTLINE, PIXEL_FONT, BODY_FONT } from "./pixel-ui";

// 每個角色的進化路徑用陣列表示：
// { type: "stage", name, icon } 代表一個階段
// { type: "conditions", items: [{ name, op, count }] } 代表進化到下一階段需要的條件
const CHARACTERS = [
  {
    id: "c001",
    name: "跳跳丸",
    intro: "從嬰兒階段開始成長，依序經過幼兒、青年階段。",
    evolutionPath: [
      { type: "stage", name: "嬰兒階段", icon: "嬰兒" },
      { type: "conditions", items: [{ name: "陸地細胞", op: "=", count: 4 }] },
      { type: "stage", name: "幼兒階段", icon: "幼兒" },
      { type: "conditions", items: [{ name: "肉細胞", op: "=", count: 1 }] },
      { type: "stage", name: "青年階段", icon: "青年" },
      {
        type: "conditions",
        items: [
          { name: "龍捲風", op: "=", count: 0 },
          { name: "飯糰", op: ">", count: 5 },
        ],
      },
      { type: "stage", name: "成年階段", icon: "?" },
    ],
  },
  {
    id: "c002",
    name: "小圓仔",
    intro: "剛孵化的初期型態，個性天真愛玩。",
    evolutionPath: [
      { type: "stage", name: "蛋", icon: "蛋" },
      { type: "conditions", items: [{ name: "孵化", op: "=", count: 1 }] },
      { type: "stage", name: "嬰兒階段", icon: "嬰兒" },
    ],
  },
];

function EvolutionPath({ path }) {
  return (
    <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
      {path.map((step, i) =>
        step.type === "stage" ? (
          <React.Fragment key={i}>
            {i > 0 && <span style={{ color: "#c9cfec" }}>→</span>}
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  background: "#f0f2fc",
                  border: "2px solid #c9cfec",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 11,
                  color: "#8a90bf",
                  clipPath: pixelClip(6),
                }}
              >
                {step.icon}
              </div>
              <div style={{ fontSize: 11, marginTop: 4, fontFamily: BODY_FONT, color: OUTLINE }}>{step.name}</div>
            </div>
          </React.Fragment>
        ) : (
          <React.Fragment key={i}>
            <span style={{ color: "#c9cfec" }}>→</span>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {step.items.map((it, j) => (
                <div
                  key={j}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    fontSize: 11,
                    background: "#f7f8fd",
                    border: "2px solid #e0e3f5",
                    padding: "3px 8px",
                    fontFamily: BODY_FONT,
                    color: OUTLINE,
                  }}
                >
                  <span style={{ width: 14, height: 14, background: "#c9cfec", display: "inline-block" }} />
                  {it.name} {it.op}
                  {it.count}
                </div>
              ))}
            </div>
          </React.Fragment>
        )
      )}
    </div>
  );
}

export default function ZukanPrototype() {
  const [query, setQuery] = useState("");
  const [collected, setCollected] = useState({});
  const [openId, setOpenId] = useState(null);

  const filtered = CHARACTERS.filter((c) => c.name.includes(query) || c.intro.includes(query));

  const toggleCollected = (id) => {
    setCollected((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const collectedCount = Object.values(collected).filter(Boolean).length;

  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: 20, fontFamily: BODY_FONT }}>
      <h2 style={{ marginBottom: 4, fontFamily: PIXEL_FONT, fontSize: 16, color: OUTLINE }}>角色圖鑑</h2>
      <p style={{ color: "#8a90bf", fontSize: 14, marginTop: 0 }}>
        已收集 {collectedCount} / {CHARACTERS.length}
      </p>

      <input
        type="text"
        placeholder="搜尋角色名字或簡介..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        style={{
          width: "100%",
          padding: 10,
          marginBottom: 16,
          border: `2px solid ${OUTLINE}`,
          boxSizing: "border-box",
          fontFamily: BODY_FONT,
          fontSize: 14,
        }}
      />

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {filtered.map((c) => (
          <div
            key={c.id}
            style={{
              border: `3px solid ${OUTLINE}`,
              padding: 14,
              clipPath: pixelClip(8),
              background: "#fff",
              boxShadow: "3px 3px 0 rgba(38,43,82,.12)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  background: "#f0f2fc",
                  border: "2px solid #c9cfec",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                  color: "#8a90bf",
                  flexShrink: 0,
                  clipPath: pixelClip(6),
                }}
              >
                圖片
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <strong style={{ color: OUTLINE }}>{c.name}</strong>
                  {collected[c.id] && <span style={pixelBadgeStyle("green")}>已收集</span>}
                </div>
                <p style={{ margin: "4px 0 0", fontSize: 13, color: "#5a6099" }}>{c.intro}</p>
              </div>

              <button onClick={() => toggleCollected(c.id)} style={pixelCheckboxStyle(!!collected[c.id])} aria-label="已收集">
                {collected[c.id] && <CheckboxMark />}
              </button>
            </div>

            <button
              onClick={() => setOpenId(openId === c.id ? null : c.id)}
              style={{
                marginTop: 10,
                fontSize: 12,
                background: "none",
                border: "none",
                color: "#ff5fa2",
                cursor: "pointer",
                padding: 0,
                fontFamily: BODY_FONT,
                fontWeight: 700,
              }}
            >
              {openId === c.id ? "收合進化路徑 ▲" : "查看進化路徑 ▼"}
            </button>

            {openId === c.id && (
              <div style={{ marginTop: 10, background: "#f7f8fd", padding: 12, overflowX: "auto", border: "2px solid #e0e3f5" }}>
                <EvolutionPath path={c.evolutionPath} />
              </div>
            )}
          </div>
        ))}

        {filtered.length === 0 && <p style={{ color: "#8a90bf", fontSize: 14 }}>找不到符合的角色</p>}
      </div>
    </div>
  );
}
