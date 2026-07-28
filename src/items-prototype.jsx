import React, { useState } from "react";
import { pixelTabStyle, pixelCheckboxStyle, CheckboxMark, pixelClip, OUTLINE, PIXEL_FONT, BODY_FONT } from "./pixel-ui";

// obtain.type: "shop"（商店取得，不用打勾追蹤，除非該分類本身是永久道具）
//              "code" （兌換碼取得，一律需要打勾追蹤是否已兌換）
// category.alwaysTrackable：這個分類的道具即使用商店取得，也要能打勾記錄「已取得」（例如永久裝飾）

const CATEGORIES = [
  {
    key: "food",
    label: "食物",
    alwaysTrackable: false,
    fieldOrder: ["價格", "自製成本", "製作", "作用", "養成方向"],
    items: [
      { id: "f1", name: "牛排", fields: { 價格: "600", 自製成本: "30", 製作: "3小塊肉", 作用: "+6飽食度", 養成方向: "羔羔青年（陸地紅）" }, obtain: { type: "shop", value: "行星6級商店" } },
      { id: "f2", name: "蘋果派", fields: { 價格: "800", 自製成本: "60", 製作: "3蘋果", 作用: "+6飽食度", 養成方向: "特庫特庫青年（陸地黃）" }, obtain: { type: "shop", value: "行星6級商店" } },
      { id: "f3", name: "黑白麵包", fields: { 價格: "10", 自製成本: "-", 製作: "-", 作用: "+2飽食度", 養成方向: "-" }, obtain: { type: "code", value: "6398 4717" } },
      { id: "f4", name: "方便麵", fields: { 價格: "150", 自製成本: "-", 製作: "-", 作用: "+2飽食度", 養成方向: "-" }, obtain: { type: "code", value: "7532 4651" } },
    ],
  },
  {
    key: "snack",
    label: "零食",
    alwaysTrackable: false,
    fieldOrder: ["價格", "作用", "BUFF"],
    items: [
      { id: "s1", name: "紅色魔飲", fields: { 價格: "5000", 作用: "+1心情", BUFF: "角色變紅" }, obtain: { type: "shop", value: "行星8級" } },
      { id: "s2", name: "心情棒棒烤薄餅", fields: { 價格: "3000", 作用: "+20心情", BUFF: "心情下降變慢" }, obtain: { type: "shop", value: "行星7級" } },
      { id: "s3", name: "雞蛋小圓餅", fields: { 價格: "150", 作用: "+10心情（+1）", BUFF: "-" }, obtain: { type: "code", value: "1792 8690" } },
      { id: "s4", name: "森永巧克力牛奶糖冰淇淋", fields: { 價格: "250", 作用: "+10心情（+1）", BUFF: "-" }, obtain: { type: "code", value: "1739 0274" } },
    ],
  },
  {
    key: "decoration",
    label: "行星裝飾",
    alwaysTrackable: true,
    fieldOrder: ["部位", "價格", "途徑"],
    items: [
      { id: "d1", name: "蘋果帽", fields: { 部位: "頭", 價格: "400", 途徑: "商店輪換" }, obtain: { type: "shop", value: "行星6級" } },
      { id: "d2", name: "皇冠", fields: { 部位: "頭", 價格: "1500", 途徑: "商店輪換" }, obtain: { type: "shop", value: "行星6級" } },
      { id: "d3", name: "吉他", fields: { 部位: "身", 價格: "600", 途徑: "商店輪換" }, obtain: { type: "shop", value: "行星6級" } },
      { id: "d4", name: "心型太陽眼鏡", fields: { 部位: "臉", 價格: "500", 途徑: "商店輪換" }, obtain: { type: "shop", value: "行星6級" } },
    ],
  },
];

export default function ItemsPrototype() {
  const [activeKey, setActiveKey] = useState(CATEGORIES[0].key);
  const [owned, setOwned] = useState({});
  const [query, setQuery] = useState("");
  const [copiedId, setCopiedId] = useState(null);

  const active = CATEGORIES.find((c) => c.key === activeKey);
  const filteredItems = active.items.filter((it) => it.name.includes(query));

  const isTrackable = (item) => active.alwaysTrackable || item.obtain.type === "code";
  const trackableItems = active.items.filter(isTrackable);
  const ownedCount = trackableItems.filter((it) => owned[it.id]).length;

  const toggleOwned = (id) => setOwned((prev) => ({ ...prev, [id]: !prev[id] }));

  const copyCode = async (id, code) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch (e) {}
  };

  return (
    <div style={{ maxWidth: 820, margin: "0 auto", padding: 20, fontFamily: BODY_FONT }}>
      <h2 style={{ marginBottom: 4, fontFamily: PIXEL_FONT, fontSize: 16, color: OUTLINE }}>道具與兌換碼一覽</h2>
      <p style={{ color: "#8a90bf", fontSize: 13, marginTop: 0 }}>
        只要是兌換碼取得的道具都能打勾記錄；{active.label}
        {active.alwaysTrackable ? "屬於永久道具，全部都能打勾" : "的商店購買品項不記錄"}
      </p>

      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        {CATEGORIES.map((c) => (
          <button
            key={c.key}
            onClick={() => {
              setActiveKey(c.key);
              setQuery("");
            }}
            style={pixelTabStyle(activeKey === c.key)}
          >
            {c.label}
          </button>
        ))}
      </div>

      {trackableItems.length > 0 && (
        <p style={{ fontSize: 13, color: "#8a90bf" }}>
          已取得 {ownedCount} / {trackableItems.length}
        </p>
      )}

      <input
        type="text"
        placeholder={`搜尋${active.label}名稱...`}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        style={{ width: "100%", padding: 10, marginBottom: 14, border: `2px solid ${OUTLINE}`, boxSizing: "border-box", fontFamily: BODY_FONT, fontSize: 14 }}
      />

      <div style={{ overflowX: "auto", border: `3px solid ${OUTLINE}` }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: OUTLINE }}>
              <th style={{ padding: 8 }}></th>
              <th style={{ padding: 8, textAlign: "left", color: "#fff", fontFamily: PIXEL_FONT, fontSize: 10 }}>圖片</th>
              <th style={{ padding: 8, textAlign: "left", color: "#fff", fontFamily: PIXEL_FONT, fontSize: 10 }}>名稱</th>
              {active.fieldOrder.map((f) => (
                <th key={f} style={{ padding: 8, textAlign: "left", whiteSpace: "nowrap", color: "#fff", fontFamily: PIXEL_FONT, fontSize: 10 }}>
                  {f}
                </th>
              ))}
              <th style={{ padding: 8, textAlign: "left", whiteSpace: "nowrap", color: "#fff", fontFamily: PIXEL_FONT, fontSize: 10 }}>獲取</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.map((it) => {
              const trackable = isTrackable(it);
              return (
                <tr key={it.id} style={{ opacity: trackable && owned[it.id] ? 0.5 : 1, borderBottom: "2px solid #e0e3f5" }}>
                  <td style={{ padding: 8 }}>
                    {trackable && (
                      <button
                        onClick={() => toggleOwned(it.id)}
                        style={{ ...pixelCheckboxStyle(!!owned[it.id]), width: 26, height: 26 }}
                        aria-label="已取得"
                      >
                        {owned[it.id] && <CheckboxMark />}
                      </button>
                    )}
                  </td>
                  <td style={{ padding: 8 }}>
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        background: "#f0f2fc",
                        border: "2px solid #c9cfec",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 10,
                        color: "#8a90bf",
                        clipPath: pixelClip(5),
                      }}
                    >
                      圖
                    </div>
                  </td>
                  <td style={{ padding: 8, fontWeight: 700, whiteSpace: "nowrap", color: OUTLINE }}>{it.name}</td>
                  {active.fieldOrder.map((f) => (
                    <td key={f} style={{ padding: 8, whiteSpace: "nowrap", color: "#5a6099" }}>
                      {it.fields[f]}
                    </td>
                  ))}
                  <td style={{ padding: 8, whiteSpace: "nowrap" }}>
                    {it.obtain.type === "code" ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ color: "#5a6099" }}>{it.obtain.value}</span>
                        <button
                          onClick={() => copyCode(it.id, it.obtain.value)}
                          style={{
                            fontSize: 10,
                            padding: "4px 10px",
                            border: `2px solid ${OUTLINE}`,
                            background: "#fff",
                            color: OUTLINE,
                            cursor: "pointer",
                            fontFamily: PIXEL_FONT,
                            clipPath: pixelClip(4),
                          }}
                        >
                          {copiedId === it.id ? "已複製" : "複製"}
                        </button>
                      </div>
                    ) : (
                      <span style={{ color: "#5a6099" }}>{it.obtain.value}</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filteredItems.length === 0 && <p style={{ color: "#8a90bf", fontSize: 14, padding: 8 }}>找不到符合的道具</p>}
      </div>
    </div>
  );
}
