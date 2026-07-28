import React, { useState, useEffect, useCallback } from "react";
import { pixelButtonStyle, ButtonShine, pixelTabStyle, pixelClip, OUTLINE, PIXEL_FONT, BODY_FONT } from "./pixel-ui";
import { supabase } from "./supabaseClient";

// 後台管理頁：只有登入的管理者才能看到編輯介面（沒登入就只會看到登入表單）。
// 三個分頁（角色圖鑑／道具與兌換碼／活動與官方情報）分別對應各自的資料表，
// 每個分頁都是「上面一個新增/編輯表單＋下面一份清單（可以點編輯/刪除）」的固定模式。
//
// 目前這版先不支援：角色的「進化路徑」編輯、活動簡介裡的「可點擊連結」編輯，
// 這兩個欄位結構比較複雜，需要的話請直接告訴我，我幫你用 SQL 更新，之後有需要也可以再幫你加上表單。

const inputStyle = {
  width: "100%",
  padding: 10,
  marginBottom: 8,
  border: `2px solid ${OUTLINE}`,
  boxSizing: "border-box",
  fontFamily: BODY_FONT,
  fontSize: 14,
};

const labelStyle = { fontSize: 12, color: "#5a6099", display: "block", marginBottom: 4 };

const rowItemStyle = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  border: `2px solid ${OUTLINE}`,
  padding: 10,
  clipPath: pixelClip(6),
  background: "#fff",
};

const smallBtnStyle = {
  fontSize: 12,
  padding: "6px 12px",
  border: `2px solid ${OUTLINE}`,
  background: "#fff",
  color: OUTLINE,
  cursor: "pointer",
  clipPath: pixelClip(4),
  fontFamily: BODY_FONT,
  flexShrink: 0,
};

const smallDangerBtnStyle = { ...smallBtnStyle, border: "2px solid #e0428a", color: "#e0428a" };

// 管理者登入表單（跟討論區的登入視窗用同一組 Supabase 帳號，登入狀態是共用的）
function LoginPane() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError("");
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (error) {
      setError("登入失敗，請確認帳號密碼是否正確");
      return;
    }
    setEmail("");
    setPassword("");
  };

  return (
    <div style={{ border: `3px solid ${OUTLINE}`, padding: 16, clipPath: pixelClip(8), background: "#fff", maxWidth: 320 }}>
      <input placeholder="管理者信箱" value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} />
      <input type="password" placeholder="密碼" value={password} onChange={(e) => setPassword(e.target.value)} style={inputStyle} />
      {error && <p style={{ color: "#e0428a", fontSize: 12, margin: "0 0 8px", fontWeight: 700 }}>{error}</p>}
      <button onClick={handleLogin} disabled={loading} style={{ ...pixelButtonStyle("primary", "normal"), width: "100%" }}>
        <ButtonShine />
        {loading ? "登入中..." : "登入"}
      </button>
    </div>
  );
}

// 圖片上傳共用元件：選檔案 → 上傳到 Supabase Storage 的 images 這個 bucket → 拿到公開網址存起來。
// folder 參數只是拿來把不同種類的圖片分開放資料夾（characters/items/events），方便你之後在
// Supabase 後台的 Storage 頁面找檔案，不影響功能。
function ImageUploadField({ value, onChange, folder }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    setError("");
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${folder}/${Date.now()}-${safeName}`;
    const { error: upErr } = await supabase.storage.from("images").upload(path, file);
    if (upErr) {
      setError("上傳失敗：" + upErr.message);
      setUploading(false);
      return;
    }
    const { data } = supabase.storage.from("images").getPublicUrl(path);
    onChange(data.publicUrl);
    setUploading(false);
  };

  return (
    <div style={{ marginBottom: 8 }}>
      {value && <img src={value} alt="預覽" style={{ maxWidth: 160, maxHeight: 120, display: "block", marginBottom: 6, border: "2px solid #c9cfec" }} />}
      <label style={{ display: "inline-block", fontSize: 12, padding: "6px 12px", border: "2px dashed #c9cfec", color: "#8a90bf", cursor: uploading ? "default" : "pointer", fontFamily: BODY_FONT }}>
        {uploading ? "上傳中..." : value ? "更換圖片" : "📷 上傳圖片"}
        <input type="file" accept="image/*" onChange={handleFile} style={{ display: "none" }} disabled={uploading} />
      </label>
      {value && !uploading && (
        <button type="button" onClick={() => onChange(null)} style={{ marginLeft: 8, fontSize: 12, background: "none", border: "none", color: "#e0428a", cursor: "pointer" }}>
          移除
        </button>
      )}
      {error && <p style={{ color: "#e0428a", fontSize: 12, margin: "4px 0 0" }}>{error}</p>}
    </div>
  );
}

function StepControls({ index, total, onMove, onRemove }) {
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
      <button type="button" disabled={index === 0} onClick={() => onMove(index, -1)} style={{ border: "none", background: "none", cursor: index === 0 ? "default" : "pointer", color: index === 0 ? "#d8dbf0" : OUTLINE, fontSize: 14, padding: 0 }}>
        ↑
      </button>
      <button
        type="button"
        disabled={index === total - 1}
        onClick={() => onMove(index, 1)}
        style={{ border: "none", background: "none", cursor: index === total - 1 ? "default" : "pointer", color: index === total - 1 ? "#d8dbf0" : OUTLINE, fontSize: 14, padding: 0 }}
      >
        ↓
      </button>
      <button type="button" onClick={() => onRemove(index)} style={{ border: "none", background: "none", cursor: "pointer", color: "#e0428a", fontSize: 12, fontWeight: 700, padding: 0 }}>
        刪除
      </button>
    </div>
  );
}

// 進化路徑編輯器：一格一格新增「階段」（名稱＋圖片，圖片跟角色圖鑑頁顯示的一樣大小）
// 或「進化條件」（一組條件，可以加好幾項），可以用上下箭頭調整順序。
// 存檔時整段會變成 evolution_path 這個 jsonb 陣列，跟畫面顯示邏輯完全對得上，不用額外轉換。
function EvolutionPathEditor({ steps, onChange }) {
  const updateStep = (i, newStep) => onChange(steps.map((s, idx) => (idx === i ? newStep : s)));
  const removeStep = (i) => onChange(steps.filter((_, idx) => idx !== i));
  const moveStep = (i, dir) => {
    const j = i + dir;
    if (j < 0 || j >= steps.length) return;
    const next = [...steps];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  const addStage = () => onChange([...steps, { type: "stage", name: "", image: null }]);
  const addConditions = () => onChange([...steps, { type: "conditions", items: [{ name: "", op: "=", count: 0, image: null }] }]);

  return (
    <div style={{ marginBottom: 8 }}>
      <label style={labelStyle}>進化路徑</label>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 10 }}>
        {steps.map((step, i) =>
          step.type === "stage" ? (
            <div key={i} style={{ border: "2px solid #c9cfec", padding: 10, background: "#fff" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <span style={{ fontSize: 11, color: "#8a90bf", fontWeight: 700 }}>階段 #{i + 1}</span>
                <StepControls index={i} total={steps.length} onMove={moveStep} onRemove={removeStep} />
              </div>
              <input placeholder="階段名稱（例如：幼兒階段）" value={step.name} onChange={(e) => updateStep(i, { ...step, name: e.target.value })} style={inputStyle} />
              <ImageUploadField value={step.image} onChange={(url) => updateStep(i, { ...step, image: url })} folder="evolution" />
            </div>
          ) : (
            <div key={i} style={{ border: "2px solid #c9cfec", padding: 10, background: "#f7f8fd" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <span style={{ fontSize: 11, color: "#8a90bf", fontWeight: 700 }}>進化條件</span>
                <StepControls index={i} total={steps.length} onMove={moveStep} onRemove={removeStep} />
              </div>
              {step.items.map((cond, j) => (
                <div key={j} style={{ border: "2px solid #e0e3f5", background: "#fff", padding: 8, marginBottom: 6 }}>
                  <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 6 }}>
                    <input
                      placeholder="條件名稱"
                      value={cond.name}
                      onChange={(e) => {
                        const items = step.items.map((c, k) => (k === j ? { ...c, name: e.target.value } : c));
                        updateStep(i, { ...step, items });
                      }}
                      style={{ ...inputStyle, marginBottom: 0, flex: 2 }}
                    />
                    <select
                      value={cond.op}
                      onChange={(e) => {
                        const items = step.items.map((c, k) => (k === j ? { ...c, op: e.target.value } : c));
                        updateStep(i, { ...step, items });
                      }}
                      style={{ ...inputStyle, marginBottom: 0, flex: "0 0 66px" }}
                    >
                      <option value="=">=</option>
                      <option value=">">&gt;</option>
                      <option value="<">&lt;</option>
                      <option value=">=">&gt;=</option>
                      <option value="<=">&lt;=</option>
                    </select>
                    <input
                      placeholder="數值"
                      value={cond.count}
                      onChange={(e) => {
                        const items = step.items.map((c, k) => (k === j ? { ...c, count: e.target.value } : c));
                        updateStep(i, { ...step, items });
                      }}
                      style={{ ...inputStyle, marginBottom: 0, flex: 1 }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const items = step.items.filter((_, k) => k !== j);
                        updateStep(i, { ...step, items });
                      }}
                      style={{ border: "none", background: "none", color: "#e0428a", cursor: "pointer", fontSize: 16, flexShrink: 0, padding: 0 }}
                    >
                      ✕
                    </button>
                  </div>
                  <ImageUploadField
                    value={cond.image}
                    onChange={(url) => {
                      const items = step.items.map((c, k) => (k === j ? { ...c, image: url } : c));
                      updateStep(i, { ...step, items });
                    }}
                    folder="evolution"
                  />
                </div>
              ))}
              <button
                type="button"
                onClick={() => updateStep(i, { ...step, items: [...step.items, { name: "", op: "=", count: 0, image: null }] })}
                style={{ fontSize: 11, background: "none", border: "none", color: "#ff5fa2", cursor: "pointer", fontWeight: 700, padding: 0 }}
              >
                + 新增一項條件
              </button>
            </div>
          )
        )}
        {steps.length === 0 && <p style={{ color: "#a7abd6", fontSize: 12 }}>還沒有任何階段，從下面開始新增</p>}
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <button type="button" onClick={addStage} style={smallBtnStyle}>
          + 新增階段
        </button>
        <button type="button" onClick={addConditions} style={smallBtnStyle}>
          + 新增進化條件
        </button>
      </div>
    </div>
  );
}

// ---------- 角色圖鑑管理 ----------
function CharacterAdmin() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null); // null = 新增模式
  const [name, setName] = useState("");
  const [intro, setIntro] = useState("");
  const [imageUrl, setImageUrl] = useState(null);
  const [evolutionSteps, setEvolutionSteps] = useState([]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    const { data } = await supabase.from("characters").select("*").order("id");
    setList(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const resetForm = () => {
    setEditingId(null);
    setName("");
    setIntro("");
    setImageUrl(null);
    setEvolutionSteps([]);
  };

  const startEdit = (row) => {
    setEditingId(row.id);
    setName(row.name);
    setIntro(row.intro || "");
    setImageUrl(row.image_url);
    setEvolutionSteps(row.evolution_path || []);
  };

  const handleSave = async () => {
    if (!name.trim()) return setMsg("請輸入角色名稱");
    setSaving(true);
    setMsg("");
    const payload = { name: name.trim(), intro: intro.trim(), image_url: imageUrl, evolution_path: evolutionSteps };
    if (editingId) {
      const { error } = await supabase.from("characters").update(payload).eq("id", editingId);
      if (error) setMsg("儲存失敗：" + error.message);
    } else {
      const id = "c" + Date.now();
      const { error } = await supabase.from("characters").insert({ id, ...payload });
      if (error) setMsg("新增失敗：" + error.message);
    }
    setSaving(false);
    resetForm();
    await load();
  };

  const handleDelete = async (id) => {
    if (!window.confirm("確定要刪除這個角色嗎？")) return;
    await supabase.from("characters").delete().eq("id", id);
    await load();
  };

  if (loading) return <p style={{ color: "#8a90bf" }}>載入中...</p>;

  return (
    <div>
      <div style={{ border: `3px solid ${OUTLINE}`, padding: 14, marginBottom: 16, background: "#f7f8fd", clipPath: pixelClip(8) }}>
        <p style={{ margin: "0 0 8px", fontSize: 13, color: "#5a6099", fontWeight: 700 }}>{editingId ? "編輯角色" : "新增角色"}</p>
        <input placeholder="角色名稱" value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
        <textarea placeholder="簡介" value={intro} onChange={(e) => setIntro(e.target.value)} rows={3} style={{ ...inputStyle, resize: "vertical" }} />
        <ImageUploadField value={imageUrl} onChange={setImageUrl} folder="characters" />
        <EvolutionPathEditor steps={evolutionSteps} onChange={setEvolutionSteps} />
        {msg && <p style={{ color: "#e0428a", fontSize: 12, fontWeight: 700 }}>{msg}</p>}
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={handleSave} disabled={saving} style={pixelButtonStyle("primary", "normal")}>
            <ButtonShine />
            {saving ? "儲存中..." : editingId ? "儲存修改" : "新增角色"}
          </button>
          {editingId && (
            <button onClick={resetForm} style={pixelButtonStyle("secondary", "normal")}>
              <ButtonShine />
              取消編輯
            </button>
          )}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {list.map((row) => (
          <div key={row.id} style={rowItemStyle}>
            {row.image_url && <img src={row.image_url} alt="" style={{ width: 40, height: 40, objectFit: "cover", flexShrink: 0 }} />}
            <div style={{ flex: 1, minWidth: 0 }}>
              <strong style={{ color: OUTLINE }}>{row.name}</strong>
              <p style={{ margin: "2px 0 0", fontSize: 12, color: "#8a90bf", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.intro}</p>
            </div>
            <button onClick={() => startEdit(row)} style={smallBtnStyle}>編輯</button>
            <button onClick={() => handleDelete(row.id)} style={smallDangerBtnStyle}>刪除</button>
          </div>
        ))}
        {list.length === 0 && <p style={{ color: "#8a90bf", fontSize: 13 }}>還沒有角色資料</p>}
      </div>
    </div>
  );
}

// 哪些欄位除了文字之外，還可以額外附一張圖片（例如「養成方向」讓大家直接看圖認出對應的寵物長相，
// 不用只靠記文字名稱）。之後如果還想讓其他欄位（例如「部位」）也能附圖，把欄位名稱加進這個陣列就好。
const IMAGE_CAPABLE_FIELDS = ["養成方向"];

// ---------- 道具與兌換碼管理 ----------
function ItemAdmin() {
  const [categories, setCategories] = useState([]);
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [categoryKey, setCategoryKey] = useState("");
  const [name, setName] = useState("");
  const [imageUrl, setImageUrl] = useState(null);
  const [fieldValues, setFieldValues] = useState({});
  const [obtainType, setObtainType] = useState("shop");
  const [obtainValue, setObtainValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    const [catRes, itemRes] = await Promise.all([
      supabase.from("categories").select("*").order("sort_order"),
      supabase.from("items").select("*").order("id"),
    ]);
    setCategories(catRes.data || []);
    setList(itemRes.data || []);
    setCategoryKey((prev) => prev || (catRes.data && catRes.data[0] && catRes.data[0].key) || "");
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const activeCategory = categories.find((c) => c.key === categoryKey);

  const resetForm = () => {
    setEditingId(null);
    setName("");
    setImageUrl(null);
    setFieldValues({});
    setObtainType("shop");
    setObtainValue("");
  };

  const startEdit = (row) => {
    setEditingId(row.id);
    setCategoryKey(row.category_key);
    setName(row.name);
    setImageUrl(row.image_url);
    setFieldValues(row.fields || {});
    setObtainType((row.obtain && row.obtain.type) || "shop");
    setObtainValue((row.obtain && row.obtain.value) || "");
  };

  const handleFieldChange = (key, value) => setFieldValues((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    if (!name.trim() || !categoryKey) return setMsg("請輸入名稱並選擇分類");
    setSaving(true);
    setMsg("");
    const payload = {
      category_key: categoryKey,
      name: name.trim(),
      image_url: imageUrl,
      fields: fieldValues,
      obtain: { type: obtainType, value: obtainValue.trim() },
    };
    if (editingId) {
      const { error } = await supabase.from("items").update(payload).eq("id", editingId);
      if (error) setMsg("儲存失敗：" + error.message);
    } else {
      const id = categoryKey.slice(0, 1) + Date.now();
      const { error } = await supabase.from("items").insert({ id, ...payload });
      if (error) setMsg("新增失敗：" + error.message);
    }
    setSaving(false);
    resetForm();
    await load();
  };

  const handleDelete = async (id) => {
    if (!window.confirm("確定要刪除這個道具嗎？")) return;
    await supabase.from("items").delete().eq("id", id);
    await load();
  };

  if (loading) return <p style={{ color: "#8a90bf" }}>載入中...</p>;

  return (
    <div>
      <div style={{ border: `3px solid ${OUTLINE}`, padding: 14, marginBottom: 16, background: "#f7f8fd", clipPath: pixelClip(8) }}>
        <p style={{ margin: "0 0 8px", fontSize: 13, color: "#5a6099", fontWeight: 700 }}>{editingId ? "編輯道具" : "新增道具"}</p>

        <label style={labelStyle}>分類</label>
        <select
          value={categoryKey}
          onChange={(e) => {
            setCategoryKey(e.target.value);
            setFieldValues({});
          }}
          style={inputStyle}
        >
          {categories.map((c) => (
            <option key={c.key} value={c.key}>
              {c.label}
            </option>
          ))}
        </select>

        <input placeholder="道具名稱" value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
        <ImageUploadField value={imageUrl} onChange={setImageUrl} folder="items" />

        {activeCategory &&
          activeCategory.field_order.map((f) => {
            if (IMAGE_CAPABLE_FIELDS.includes(f)) {
              const current = fieldValues[f];
              const currentObj = current && typeof current === "object" ? current : { text: current || "", image: null };
              return (
                <div key={f} style={{ border: "2px solid #e0e3f5", background: "#fff", padding: 8, marginBottom: 8 }}>
                  <input
                    placeholder={f}
                    value={currentObj.text}
                    onChange={(e) => handleFieldChange(f, { ...currentObj, text: e.target.value })}
                    style={{ ...inputStyle, marginBottom: 6 }}
                  />
                  <ImageUploadField value={currentObj.image} onChange={(url) => handleFieldChange(f, { ...currentObj, image: url })} folder="items" />
                </div>
              );
            }
            return <input key={f} placeholder={f} value={fieldValues[f] || ""} onChange={(e) => handleFieldChange(f, e.target.value)} style={inputStyle} />;
          })}

        <label style={labelStyle}>取得方式</label>
        <div style={{ display: "flex", gap: 14, marginBottom: 8 }}>
          <label style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 4, color: OUTLINE }}>
            <input type="radio" checked={obtainType === "shop"} onChange={() => setObtainType("shop")} /> 商店
          </label>
          <label style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 4, color: OUTLINE }}>
            <input type="radio" checked={obtainType === "code"} onChange={() => setObtainType("code")} /> 兌換碼
          </label>
        </div>
        <input placeholder={obtainType === "code" ? "兌換碼" : "取得地點"} value={obtainValue} onChange={(e) => setObtainValue(e.target.value)} style={inputStyle} />

        {msg && <p style={{ color: "#e0428a", fontSize: 12, fontWeight: 700 }}>{msg}</p>}
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={handleSave} disabled={saving} style={pixelButtonStyle("primary", "normal")}>
            <ButtonShine />
            {saving ? "儲存中..." : editingId ? "儲存修改" : "新增道具"}
          </button>
          {editingId && (
            <button onClick={resetForm} style={pixelButtonStyle("secondary", "normal")}>
              <ButtonShine />
              取消編輯
            </button>
          )}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {list.map((row) => (
          <div key={row.id} style={rowItemStyle}>
            {row.image_url && <img src={row.image_url} alt="" style={{ width: 36, height: 36, objectFit: "cover", flexShrink: 0 }} />}
            <div style={{ flex: 1, minWidth: 0 }}>
              <strong style={{ color: OUTLINE }}>{row.name}</strong>
              <span style={{ marginLeft: 8, fontSize: 11, color: "#a7abd6" }}>
                {(categories.find((c) => c.key === row.category_key) || {}).label}
              </span>
            </div>
            <button onClick={() => startEdit(row)} style={smallBtnStyle}>編輯</button>
            <button onClick={() => handleDelete(row.id)} style={smallDangerBtnStyle}>刪除</button>
          </div>
        ))}
        {list.length === 0 && <p style={{ color: "#8a90bf", fontSize: 13 }}>還沒有道具資料</p>}
      </div>
    </div>
  );
}

// ---------- 活動與官方情報管理 ----------
function EventAdmin() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [type, setType] = useState("event");
  const [title, setTitle] = useState("");
  const [imageUrl, setImageUrl] = useState(null);
  const [intro, setIntro] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [publishedAt, setPublishedAt] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    const { data } = await supabase.from("events").select("*").order("id");
    setList(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const resetForm = () => {
    setEditingId(null);
    setType("event");
    setTitle("");
    setImageUrl(null);
    setIntro("");
    setStartDate("");
    setEndDate("");
    setPublishedAt("");
  };

  // intro 存在資料庫裡可能是純文字，也可能是文字＋連結混合的陣列（用 SQL 加的那種）。
  // 這個後台表單只處理純文字，如果編輯到一篇原本有連結的內容，連結片段會被還原成純文字顯示，
  // 儲存後那則內容的連結就會不見 —— 有連結需求的內容，建議先跟我說一聲用 SQL 處理，不要透過這個表單編輯。
  const introToText = (value) => {
    if (typeof value === "string") return value;
    if (Array.isArray(value)) return value.map((seg) => (typeof seg === "string" ? seg : seg.text)).join("");
    return "";
  };

  const startEdit = (row) => {
    setEditingId(row.id);
    setType(row.type);
    setTitle(row.title);
    setImageUrl(row.image_url);
    setIntro(introToText(row.intro));
    setStartDate(row.start_date ? row.start_date.slice(0, 10) : "");
    setEndDate(row.end_date ? row.end_date.slice(0, 10) : "");
    setPublishedAt(row.published_at ? row.published_at.slice(0, 10) : "");
  };

  const handleSave = async () => {
    if (!title.trim()) return setMsg("請輸入標題");
    setSaving(true);
    setMsg("");
    const payload = {
      type,
      title: title.trim(),
      image_url: imageUrl,
      intro: intro.trim(),
      start_date: type === "event" && startDate ? startDate : null,
      end_date: type === "event" && endDate ? endDate : null,
      published_at: type === "news" ? publishedAt || new Date().toISOString().slice(0, 10) : null,
    };
    if (editingId) {
      const { error } = await supabase.from("events").update(payload).eq("id", editingId);
      if (error) setMsg("儲存失敗：" + error.message);
    } else {
      const id = (type === "news" ? "n" : "e") + Date.now();
      const { error } = await supabase.from("events").insert({ id, ...payload });
      if (error) setMsg("新增失敗：" + error.message);
    }
    setSaving(false);
    resetForm();
    await load();
  };

  const handleDelete = async (id) => {
    if (!window.confirm("確定要刪除嗎？")) return;
    await supabase.from("events").delete().eq("id", id);
    await load();
  };

  if (loading) return <p style={{ color: "#8a90bf" }}>載入中...</p>;

  return (
    <div>
      <div style={{ border: `3px solid ${OUTLINE}`, padding: 14, marginBottom: 16, background: "#f7f8fd", clipPath: pixelClip(8) }}>
        <p style={{ margin: "0 0 8px", fontSize: 13, color: "#5a6099", fontWeight: 700 }}>{editingId ? "編輯項目" : "新增項目"}</p>

        <div style={{ display: "flex", gap: 14, marginBottom: 8 }}>
          <label style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 4, color: OUTLINE }}>
            <input type="radio" checked={type === "event"} onChange={() => setType("event")} /> 活動
          </label>
          <label style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 4, color: OUTLINE }}>
            <input type="radio" checked={type === "news"} onChange={() => setType("news")} /> 官方情報
          </label>
        </div>

        <input placeholder="標題" value={title} onChange={(e) => setTitle(e.target.value)} style={inputStyle} />
        <textarea placeholder="內容簡介（純文字）" value={intro} onChange={(e) => setIntro(e.target.value)} rows={3} style={{ ...inputStyle, resize: "vertical" }} />
        <ImageUploadField value={imageUrl} onChange={setImageUrl} folder="events" />

        {type === "event" ? (
          <>
            <label style={labelStyle}>開始日期（留空＝長期開放）</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={inputStyle} />
            <label style={labelStyle}>結束日期（留空＝沒有結束時間）</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={inputStyle} />
          </>
        ) : (
          <>
            <label style={labelStyle}>發布日期</label>
            <input type="date" value={publishedAt} onChange={(e) => setPublishedAt(e.target.value)} style={inputStyle} />
          </>
        )}

        <p style={{ fontSize: 11, color: "#a7abd6", margin: "8px 0 0" }}>提醒：這裡只能輸入純文字，如果想在內容裡插入可點擊連結，跟我說一聲，我用 SQL 幫你加。</p>

        {msg && <p style={{ color: "#e0428a", fontSize: 12, fontWeight: 700, marginTop: 8 }}>{msg}</p>}
        <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
          <button onClick={handleSave} disabled={saving} style={pixelButtonStyle("primary", "normal")}>
            <ButtonShine />
            {saving ? "儲存中..." : editingId ? "儲存修改" : "新增項目"}
          </button>
          {editingId && (
            <button onClick={resetForm} style={pixelButtonStyle("secondary", "normal")}>
              <ButtonShine />
              取消編輯
            </button>
          )}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {list.map((row) => (
          <div key={row.id} style={rowItemStyle}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <strong style={{ color: OUTLINE }}>{row.title}</strong>
              <span style={{ marginLeft: 8, fontSize: 11, color: "#a7abd6" }}>{row.type === "news" ? "官方情報" : "活動"}</span>
            </div>
            <button onClick={() => startEdit(row)} style={smallBtnStyle}>編輯</button>
            <button onClick={() => handleDelete(row.id)} style={smallDangerBtnStyle}>刪除</button>
          </div>
        ))}
        {list.length === 0 && <p style={{ color: "#8a90bf", fontSize: 13 }}>還沒有資料</p>}
      </div>
    </div>
  );
}

export default function AdminPanel() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [checking, setChecking] = useState(true);
  const [tab, setTab] = useState("characters");

  // 登入狀態跟討論區共用同一組 Supabase Auth session，在任何一個地方登入，
  // 兩邊都會同步變成「已登入」，不用分開登入兩次。
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setIsAdmin(!!data.session);
      setChecking(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAdmin(!!session);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (checking) {
    return (
      <div style={{ maxWidth: 680, margin: "0 auto", padding: 20, fontFamily: BODY_FONT }}>
        <p style={{ color: "#8a90bf" }}>載入中...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: 20, fontFamily: BODY_FONT }}>
      <h2 style={{ marginBottom: 4, fontFamily: PIXEL_FONT, fontSize: 16, color: OUTLINE }}>後台管理</h2>
      <p style={{ color: "#8a90bf", fontSize: 13, marginTop: 0, marginBottom: 16 }}>只有登入的管理者能新增/編輯/刪除內容</p>

      {!isAdmin ? (
        <LoginPane />
      ) : (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button onClick={() => setTab("characters")} style={pixelTabStyle(tab === "characters")}>
                角色圖鑑
              </button>
              <button onClick={() => setTab("items")} style={pixelTabStyle(tab === "items")}>
                道具與兌換碼
              </button>
              <button onClick={() => setTab("events")} style={pixelTabStyle(tab === "events")}>
                活動與官方情報
              </button>
            </div>
            <button onClick={handleLogout} style={{ fontSize: 11, background: "none", border: "none", color: "#4ecb5f", cursor: "pointer", fontWeight: 700 }}>
              ✅ 已登入（點擊登出）
            </button>
          </div>

          {tab === "characters" && <CharacterAdmin />}
          {tab === "items" && <ItemAdmin />}
          {tab === "events" && <EventAdmin />}
        </>
      )}
    </div>
  );
}
