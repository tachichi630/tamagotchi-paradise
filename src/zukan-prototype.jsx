import React, { useState, useEffect } from "react";
import { pixelCheckboxStyle, CheckboxMark, pixelBadgeStyle, pixelClip, OUTLINE, PIXEL_FONT, BODY_FONT } from "./pixel-ui";
import { supabase } from "./supabaseClient";
import { useAuth } from "./auth-context";

// 角色資料現在從 Supabase 的 characters 表讀取（見下面 useEffect），不再寫死在程式碼裡。
// 之後要新增角色、修改進化條件，只要去資料庫新增/編輯一列資料就好，不用再回來改程式碼、重新部署一次。
//
// 進化路徑（evolution_path）存成資料庫裡的 jsonb 欄位，格式跟以前一樣是陣列：
// { type: "stage", name, icon } 代表一個階段
// { type: "conditions", items: [{ name, op, count }] } 代表進化到下一階段需要的條件
//
// 「已收集」的打勾狀態：登入會員會存進 user_collections 表，綁在帳號上，換裝置、清瀏覽器資料都還在。
// 未登入的訪客打勾只會暫存在這次瀏覽的畫面上，重新整理或關掉分頁就會消失（不會寫進資料庫）。

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
                  overflow: "hidden",
                }}
              >
                {step.image ? <img src={step.image} alt={step.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : step.icon}
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
                  {it.image ? (
                    <img src={it.image} alt="" style={{ width: 14, height: 14, objectFit: "cover", display: "inline-block", flexShrink: 0 }} />
                  ) : (
                    <span style={{ width: 14, height: 14, background: "#c9cfec", display: "inline-block", flexShrink: 0 }} />
                  )}
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
  const { user } = useAuth();
  const [characters, setCharacters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [query, setQuery] = useState("");
  const [collected, setCollected] = useState({});
  const [openId, setOpenId] = useState(null);

  useEffect(() => {
    supabase
      .from("characters")
      .select("*")
      .order("id")
      .then(({ data, error }) => {
        if (error) {
          setLoadError(error.message);
        } else {
          setCharacters(
            (data || []).map((c) => ({
              id: c.id,
              name: c.name,
              intro: c.intro || "",
              image: c.image_url,
              evolutionPath: c.evolution_path || [],
            }))
          );
        }
        setLoading(false);
      });
  }, []);

  // 登入才去讀這個帳號收藏過的角色；登出／未登入時清空（訪客用本機暫存，不查資料庫）
  useEffect(() => {
    if (!user) {
      setCollected({});
      return;
    }
    supabase
      .from("user_collections")
      .select("item_id")
      .eq("user_id", user.id)
      .eq("item_type", "character")
      .then(({ data, error }) => {
        if (!error) {
          const map = {};
          (data || []).forEach((row) => {
            map[row.item_id] = true;
          });
          setCollected(map);
        }
      });
  }, [user]);

  const filtered = characters.filter((c) => c.name.includes(query) || c.intro.includes(query));

  const toggleCollected = async (id) => {
    const wasCollected = !!collected[id];
    setCollected((prev) => ({ ...prev, [id]: !wasCollected }));
    if (!user) return; // 訪客：只在畫面上暫存，不寫入資料庫
    if (wasCollected) {
      await supabase.from("user_collections").delete().eq("user_id", user.id).eq("item_type", "character").eq("item_id", String(id));
    } else {
      await supabase.from("user_collections").insert({ user_id: user.id, item_type: "character", item_id: String(id) });
    }
  };

  const collectedCount = Object.values(collected).filter(Boolean).length;

  if (loading) {
    return (
      <div style={{ maxWidth: 680, margin: "0 auto", padding: 20, fontFamily: BODY_FONT }}>
        <h2 style={{ marginBottom: 4, fontFamily: PIXEL_FONT, fontSize: 16, color: OUTLINE }}>角色圖鑑</h2>
        <p style={{ color: "#8a90bf", fontSize: 14 }}>載入中...</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div style={{ maxWidth: 680, margin: "0 auto", padding: 20, fontFamily: BODY_FONT }}>
        <h2 style={{ marginBottom: 4, fontFamily: PIXEL_FONT, fontSize: 16, color: OUTLINE }}>角色圖鑑</h2>
        <p style={{ color: "#e0428a", fontSize: 14 }}>資料讀取失敗：{loadError}</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: 20, fontFamily: BODY_FONT }}>
      <h2 style={{ marginBottom: 4, fontFamily: PIXEL_FONT, fontSize: 16, color: OUTLINE }}>角色圖鑑</h2>
      <p style={{ color: "#8a90bf", fontSize: 14, marginTop: 0 }}>
        已收集 {collectedCount} / {characters.length}
        {!user && <span style={{ marginLeft: 8, fontSize: 12 }}>（訪客身分，打勾只會暫存這次瀏覽，登入才會永久保存）</span>}
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
                  overflow: "hidden",
                }}
              >
                {c.image ? <img src={c.image} alt={c.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : "圖片"}
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
