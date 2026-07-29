import React, { useState, useEffect } from "react";
import { pixelTabStyle, pixelCheckboxStyle, CheckboxMark, pixelClip, OUTLINE, PIXEL_FONT, BODY_FONT } from "./pixel-ui";
import { supabase } from "./supabaseClient";
import { useAuth } from "./auth-context";

// obtain.type: "shop"（商店取得，不用打勾追蹤，除非該分類本身是永久道具）
//              "code" （兌換碼取得，一律需要打勾追蹤是否已兌換）
// category.alwaysTrackable：這個分類的道具即使用商店取得，也要能打勾記錄「已取得」（例如永久裝飾）
//
// 分類（categories）與道具（items）現在都從 Supabase 讀取，不再寫死在程式碼裡，
// 之後要新增道具、調整價格，直接在資料庫改就好，不用再回來改程式碼。
// 「已取得」的打勾狀態：登入會員會存進 user_collections 表，綁在帳號上，跟角色圖鑑同一張表、
// 用 item_type = "item" 區分。未登入的訪客打勾只會暫存在這次瀏覽的畫面上。

export default function ItemsPrototype() {
  const { user } = useAuth();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [activeKey, setActiveKey] = useState(null);
  const [owned, setOwned] = useState({});
  const [query, setQuery] = useState("");
  const [copiedId, setCopiedId] = useState(null);

  // 登入才去讀這個帳號已取得過的道具；登出／未登入時清空（訪客用本機暫存，不查資料庫）
  useEffect(() => {
    if (!user) {
      setOwned({});
      return;
    }
    supabase
      .from("user_collections")
      .select("item_id")
      .eq("user_id", user.id)
      .eq("item_type", "item")
      .then(({ data, error }) => {
        if (!error) {
          const map = {};
          (data || []).forEach((row) => {
            map[row.item_id] = true;
          });
          setOwned(map);
        }
      });
  }, [user]);

  useEffect(() => {
    Promise.all([
      supabase.from("categories").select("*").order("sort_order"),
      supabase.from("items").select("*").order("id"),
    ]).then(([catRes, itemRes]) => {
      if (catRes.error || itemRes.error) {
        setLoadError((catRes.error || itemRes.error).message);
        setLoading(false);
        return;
      }
      const mapped = (catRes.data || []).map((c) => ({
        key: c.key,
        label: c.label,
        alwaysTrackable: c.always_trackable,
        fieldOrder: c.field_order || [],
        items: (itemRes.data || [])
          .filter((it) => it.category_key === c.key)
          .map((it) => ({ id: it.id, name: it.name, image: it.image_url, fields: it.fields || {}, obtain: it.obtain || {} })),
      }));
      setCategories(mapped);
      setActiveKey((prev) => prev || (mapped[0] && mapped[0].key) || null);
      setLoading(false);
    });
  }, []);

  const active = categories.find((c) => c.key === activeKey);

  if (loading) {
    return (
      <div style={{ maxWidth: 820, margin: "0 auto", padding: 20, fontFamily: BODY_FONT }}>
        <h2 style={{ marginBottom: 4, fontFamily: PIXEL_FONT, fontSize: 16, color: OUTLINE }}>道具與兌換碼一覽</h2>
        <p style={{ color: "#8a90bf", fontSize: 14 }}>載入中...</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div style={{ maxWidth: 820, margin: "0 auto", padding: 20, fontFamily: BODY_FONT }}>
        <h2 style={{ marginBottom: 4, fontFamily: PIXEL_FONT, fontSize: 16, color: OUTLINE }}>道具與兌換碼一覽</h2>
        <p style={{ color: "#e0428a", fontSize: 14 }}>資料讀取失敗：{loadError}</p>
      </div>
    );
  }

  if (!active) {
    return (
      <div style={{ maxWidth: 820, margin: "0 auto", padding: 20, fontFamily: BODY_FONT }}>
        <h2 style={{ marginBottom: 4, fontFamily: PIXEL_FONT, fontSize: 16, color: OUTLINE }}>道具與兌換碼一覽</h2>
        <p style={{ color: "#8a90bf", fontSize: 14 }}>目前還沒有分類資料</p>
      </div>
    );
  }

  const filteredItems = active.items.filter((it) => it.name.includes(query));

  const isTrackable = (item) => active.alwaysTrackable || item.obtain.type === "code";
  const trackableItems = active.items.filter(isTrackable);
  const ownedCount = trackableItems.filter((it) => owned[it.id]).length;

  const toggleOwned = async (id) => {
    const wasOwned = !!owned[id];
    setOwned((prev) => ({ ...prev, [id]: !wasOwned }));
    if (!user) return; // 訪客：只在畫面上暫存，不寫入資料庫
    if (wasOwned) {
      await supabase.from("user_collections").delete().eq("user_id", user.id).eq("item_type", "item").eq("item_id", String(id));
    } else {
      await supabase.from("user_collections").insert({ user_id: user.id, item_type: "item", item_id: String(id) });
    }
  };

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
        {categories.map((c) => (
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
          {!user && <span style={{ marginLeft: 8, fontSize: 12 }}>（訪客身分，打勾只會暫存這次瀏覽，登入才會永久保存）</span>}
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
                        overflow: "hidden",
                      }}
                    >
                      {it.image ? <img src={it.image} alt={it.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : "圖"}
                    </div>
                  </td>
                  <td style={{ padding: 8, fontWeight: 700, whiteSpace: "nowrap", color: OUTLINE }}>{it.name}</td>
                  {active.fieldOrder.map((f) => {
                    const value = it.fields[f];
                    const isImageField = value && typeof value === "object";
                    return (
                      <td key={f} style={{ padding: 8, whiteSpace: "nowrap", color: "#5a6099" }}>
                        {isImageField ? (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                            {value.image && (
                              <img src={value.image} alt="" style={{ width: 22, height: 22, objectFit: "cover", flexShrink: 0, border: "1px solid #c9cfec" }} />
                            )}
                            {value.text}
                          </span>
                        ) : (
                          value
                        )}
                      </td>
                    );
                  })}
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
