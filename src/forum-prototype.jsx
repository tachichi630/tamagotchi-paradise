import React, { useState, useEffect, useCallback } from "react";
import { pixelButtonStyle, ButtonShine, pixelTabStyle, pixelClip, pixelFabStyle, FabShine, pixelBadgeStyle, OUTLINE, PIXEL_FONT, BODY_FONT } from "./pixel-ui";
import { supabase } from "./supabaseClient";
import { useAuth } from "./auth-context";

// 討論區現在改成「會員限定」發文／留言：沒登入只能瀏覽，發文、留言、回覆都需要先用網站右上角
// 的「登入 / 註冊」登入會員帳號。文章、留言上顯示的名字是登入帳號的暱稱（profiles.display_name），
// 不再讓使用者自己臨時輸入暱稱。
//
// 是否為管理者（可以置頂）不再是這個檔案自己管理，而是共用 auth-context.jsx 裡的 isAdmin，
// 跟頂部導覽列、後台管理用的是同一份登入狀態。

// 圖片上傳（無論是文章本身還是留言）目前用瀏覽器內建的「檔案挑選＋本機預覽」方式（URL.createObjectURL），
// 不需要後端伺服器就能示範上傳、預覽、移除的完整互動。

// 這個元件是設計來放進網站骨架（site-shell-prototype.jsx）的 <main> 主內容區裡的，
// 骨架本身已經有全站共用的頂部導覽列，所以這裡的頁面標題（h2「討論區」）只是內容區自己的標題。

// 看板列表跟文章／留言現在都改成從 Supabase 資料庫讀取（見下面 loadData），
// 不再寫死在程式碼裡 —— 這樣所有訪客看到的才是「同一份」真實資料，
// 你在後台置頂、刪文的結果，其他人重新整理後也會看到。
// 資料庫欄位名稱跟這裡畫面用的欄位名稱稍微不同（例如資料庫是 board_key／description，
// 畫面沿用原本習慣的 boardKey／desc），loadData 讀出來後會轉換成畫面熟悉的格式，
// 所以下面所有畫面元件（BoardTabs、PostListItem…）完全不用改。

// 表情反應的分類。icon 之後會換成你自己畫的表情圖示（現在先用文字標籤佔位，用小圓框示意「圖示放這裡」）。
const REACTION_TYPES = [
  { key: "like", label: "讚" },
  { key: "love", label: "愛心" },
  { key: "haha", label: "哈哈" },
  { key: "helpful", label: "有幫助" },
];

function totalReactions(reactions) {
  return Object.values(reactions || {}).reduce((sum, n) => sum + n, 0);
}

const inputStyle = {
  width: "100%",
  padding: 10,
  marginBottom: 8,
  border: `2px solid ${OUTLINE}`,
  boxSizing: "border-box",
  fontFamily: BODY_FONT,
  fontSize: 14,
};

function formatDate(iso) {
  const d = new Date(iso);
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
}

// 共用的圖片挑選元件：還沒選圖片時顯示「新增圖片」按鈕，選了之後顯示預覽圖＋移除按鈕。
function ImageField({ imageUrl, onSelect, onRemove }) {
  if (imageUrl) {
    return (
      <div style={{ position: "relative", marginBottom: 8, display: "inline-block" }}>
        <img src={imageUrl} alt="預覽" style={{ maxWidth: 200, maxHeight: 160, display: "block", border: "2px solid #c9cfec" }} />
        <button
          onClick={onRemove}
          style={{ position: "absolute", top: 4, right: 4, border: "none", background: "rgba(38,43,82,0.75)", color: "#fff", fontSize: 11, padding: "2px 6px", cursor: "pointer" }}
        >
          移除
        </button>
      </div>
    );
  }
  return (
    <label style={{ display: "inline-block", fontSize: 12, padding: "6px 12px", border: "2px dashed #c9cfec", color: "#8a90bf", cursor: "pointer", marginBottom: 8, fontFamily: BODY_FONT }}>
      📷 新增圖片（選填）
      <input type="file" accept="image/*" onChange={onSelect} style={{ display: "none" }} />
    </label>
  );
}

function ComposeForm({ board, onSubmit, onCancel }) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState(null);
  const [error, setError] = useState("");

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (file) setImageUrl(URL.createObjectURL(file));
  };

  const handleSubmit = () => {
    if (!title.trim() || !content.trim()) return setError("標題與內容都要填寫");
    onSubmit({ title: title.trim(), content: content.trim(), image: imageUrl });
    setTitle("");
    setContent("");
    setImageUrl(null);
    setError("");
  };

  return (
    <div style={{ border: `3px solid ${OUTLINE}`, padding: 14, marginBottom: 16, background: "#f7f8fd", clipPath: pixelClip(8) }}>
      <p style={{ margin: "0 0 8px", fontSize: 13, color: "#5a6099" }}>在「{board.label}」發表新文章</p>
      <input placeholder="標題" value={title} onChange={(e) => setTitle(e.target.value)} style={inputStyle} />
      <textarea placeholder="內容" value={content} onChange={(e) => setContent(e.target.value)} rows={4} style={{ ...inputStyle, resize: "vertical" }} />
      <div>
        <ImageField imageUrl={imageUrl} onSelect={handleFile} onRemove={() => setImageUrl(null)} />
      </div>
      {error && <p style={{ color: "#e0428a", fontSize: 12, margin: "0 0 8px", fontWeight: 700 }}>{error}</p>}
      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={handleSubmit} style={pixelButtonStyle("primary", "normal")}>
          <ButtonShine />
          送出
        </button>
        <button onClick={onCancel} style={pixelButtonStyle("secondary", "normal")}>
          <ButtonShine />
          取消
        </button>
      </div>
    </div>
  );
}

// 共用的留言表單，也拿來當「回覆」表單用。
function CommentForm({ onSubmit, placeholder = "留言內容", submitLabel = "送出留言" }) {
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState(null);
  const [error, setError] = useState("");

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (file) setImageUrl(URL.createObjectURL(file));
  };

  const handleSubmit = () => {
    if (!content.trim()) return setError("請輸入內容");
    onSubmit({ content: content.trim(), image: imageUrl });
    setContent("");
    setImageUrl(null);
    setError("");
  };

  return (
    <div>
      <textarea placeholder={placeholder} value={content} onChange={(e) => setContent(e.target.value)} rows={2} style={{ ...inputStyle, resize: "vertical" }} />
      <div>
        <ImageField imageUrl={imageUrl} onSelect={handleFile} onRemove={() => setImageUrl(null)} />
      </div>
      {error && <p style={{ color: "#e0428a", fontSize: 12, margin: "0 0 8px", fontWeight: 700 }}>{error}</p>}
      <button onClick={handleSubmit} style={pixelButtonStyle("primary", "normal")}>
        <ButtonShine />
        {submitLabel}
      </button>
    </div>
  );
}

// 版面分類籤：橫向排列在「討論區」標題下方，點一個分類，下面就顯示對應分類的文章。
function BoardTabs({ boards, activeKey, onSelect, postCount }) {
  return (
    <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
      {boards.map((b) => {
        const active = b.key === activeKey;
        return (
          <button key={b.key} onClick={() => onSelect(b.key)} style={pixelTabStyle(active)}>
            {b.label} ({postCount(b.key)})
          </button>
        );
      })}
    </div>
  );
}

// 版規區塊：預設收合，點開才顯示完整規則列表。
function BoardRules({ rules }) {
  const [open, setOpen] = useState(false);
  if (!rules || rules.length === 0) return null;
  return (
    <div style={{ marginBottom: 12 }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{ fontSize: 12, background: "none", border: "none", color: "#ff5fa2", cursor: "pointer", padding: 0, fontWeight: 700 }}
      >
        {open ? "收合版規 ▲" : "查看版規 ▼"}
      </button>
      {open && (
        <div style={{ marginTop: 8, background: "#f7f8fd", border: "2px solid #e0e3f5", padding: 12 }}>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: "#5a6099", display: "flex", flexDirection: "column", gap: 4 }}>
            {rules.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// 文章列表裡的一列預覽，點擊（不管點標題或哪裡）都會整篇打開，進到 PostDetail。
// 置頂文章會在標題前面多一個「📌 置頂」徽章；管理者模式開啟時，右邊會多一顆置頂/取消置頂按鈕。
function PostListItem({ post, onOpen, isAdmin, onTogglePin }) {
  return (
    <div style={{ display: "flex", alignItems: "stretch", gap: 8 }}>
      <button
        onClick={onOpen}
        style={{ display: "block", flex: 1, minWidth: 0, textAlign: "left", border: `2px solid ${OUTLINE}`, padding: 12, background: post.pinned ? "#fff7e6" : "#fff", cursor: "pointer", clipPath: pixelClip(6), fontFamily: BODY_FONT }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
            {post.pinned && <span style={pixelBadgeStyle("yellow")}>📌 置頂</span>}
            <strong style={{ fontSize: 14, color: OUTLINE, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{post.title}</strong>
          </span>
          <span style={{ fontSize: 11, color: "#a7abd6", whiteSpace: "nowrap" }}>{formatDate(post.createdAt)}</span>
        </div>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: "#5a6099", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{post.content}</p>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
          <span style={{ fontSize: 12, color: "#8a90bf" }}>{post.author}</span>
          <span style={{ fontSize: 11, color: "#8a90bf", whiteSpace: "nowrap" }}>
            💬 {post.comments.length} ・ 表情 {totalReactions(post.reactions)}
          </span>
        </div>
      </button>

      {isAdmin && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onTogglePin(post.id);
          }}
          title={post.pinned ? "取消置頂" : "設為置頂"}
          style={{
            flexShrink: 0,
            width: 44,
            border: `2px solid ${OUTLINE}`,
            background: post.pinned ? "#ffc93c" : "#fff",
            cursor: "pointer",
            clipPath: pixelClip(6),
            fontSize: 16,
          }}
        >
          📌
        </button>
      )}
    </div>
  );
}

// 表情反應列：每個表情一顆按鈕，點一下＝加上這個表情，再點一次＝取消。
function ReactionBar({ reactions, myKeys, onToggle }) {
  return (
    <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
      {REACTION_TYPES.map((r) => {
        const active = myKeys.includes(r.key);
        const count = reactions[r.key] || 0;
        return (
          <button
            key={r.key}
            onClick={() => onToggle(r.key)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 12,
              padding: "6px 12px",
              border: active ? "2px solid #ff5fa2" : "2px solid #c9cfec",
              background: active ? "#ffe1ee" : "#fff",
              color: active ? "#e0428a" : "#8a90bf",
              cursor: "pointer",
              clipPath: pixelClip(5),
              fontFamily: BODY_FONT,
              fontWeight: active ? 700 : 400,
            }}
          >
            <span
              style={{
                width: 16,
                height: 16,
                borderRadius: "50%",
                background: active ? "#ff9dc4" : "#e0e3f5",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 9,
                color: active ? "#fff" : "#8a90bf",
                flexShrink: 0,
              }}
            >
              {r.label[0]}
            </span>
            {r.label}
            {count > 0 && <span>（{count}）</span>}
          </button>
        );
      })}
    </div>
  );
}

function CommentItem({ comment }) {
  return (
    <div style={{ background: "#f7f8fd", border: "2px solid #e0e3f5", padding: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
        <strong style={{ color: OUTLINE }}>{comment.author}</strong>
        <span style={{ color: "#a7abd6" }}>{formatDate(comment.createdAt)}</span>
      </div>
      <p style={{ margin: "4px 0 0", fontSize: 13, color: "#5a6099" }}>{comment.content}</p>
      {comment.image && <img src={comment.image} alt="" style={{ maxWidth: "100%", maxHeight: 200, marginTop: 6, display: "block", border: "2px solid #c9cfec" }} />}
    </div>
  );
}

function CommentThread({ comment, replies, user, replyOpen, onToggleReply, onReply }) {
  return (
    <div>
      <CommentItem comment={comment} />
      {replies.length > 0 && (
        <div style={{ marginLeft: 20, marginTop: 6, paddingLeft: 12, borderLeft: "3px solid #e0e3f5", display: "flex", flexDirection: "column", gap: 6 }}>
          {replies.map((r) => (
            <CommentItem key={r.id} comment={r} />
          ))}
        </div>
      )}
      {user ? (
        <>
          <button onClick={onToggleReply} style={{ marginLeft: 20, marginTop: 4, fontSize: 11, background: "none", border: "none", color: "#ff5fa2", cursor: "pointer", padding: 0, fontWeight: 700 }}>
            {replyOpen ? "取消回覆" : "回覆"}
          </button>
          {replyOpen && (
            <div style={{ marginLeft: 20, marginTop: 6 }}>
              <CommentForm onSubmit={onReply} placeholder={`回覆給 ${comment.author}...`} submitLabel="送出回覆" />
            </div>
          )}
        </>
      ) : (
        <p style={{ marginLeft: 20, marginTop: 4, fontSize: 11, color: "#a7abd6" }}>登入後才能回覆</p>
      )}
    </div>
  );
}

// 點進單篇文章後的完整內容頁：文章本文 + 表情反應 + 完整留言區。管理者模式開啟時，標題旁多一顆置頂切換鈕。
function PostDetail({ post, user, onAddComment, myReactionKeys, onToggleReaction, onBack, isAdmin, onTogglePin }) {
  const [replyingTo, setReplyingTo] = useState(null);

  const topLevelComments = post.comments.filter((c) => !c.parentId);
  const repliesOf = (commentId) => post.comments.filter((c) => c.parentId === commentId);

  return (
    <div>
      <button onClick={onBack} style={{ ...pixelButtonStyle("secondary", "normal"), marginBottom: 14, padding: "10px 20px" }}>
        <ButtonShine />← 返回文章列表
      </button>

      <div style={{ border: `3px solid ${OUTLINE}`, padding: 16, clipPath: pixelClip(8), background: "#fff" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {post.pinned && <span style={pixelBadgeStyle("yellow")}>📌 置頂</span>}
            <h3 style={{ margin: 0, color: OUTLINE }}>{post.title}</h3>
          </span>
          <span style={{ fontSize: 12, color: "#a7abd6", whiteSpace: "nowrap" }}>{formatDate(post.createdAt)}</span>
        </div>
        <p style={{ margin: "8px 0 0", fontSize: 14, color: "#5a6099", whiteSpace: "pre-wrap" }}>{post.content}</p>
        {post.image && <img src={post.image} alt="" style={{ maxWidth: "100%", maxHeight: 360, marginTop: 10, display: "block", border: "2px solid #c9cfec" }} />}
        <p style={{ margin: "10px 0 0", fontSize: 12, color: "#8a90bf" }}>— {post.author}</p>

        {isAdmin && (
          <button onClick={() => onTogglePin(post.id)} style={{ ...pixelButtonStyle("secondary", "normal"), marginTop: 10, padding: "8px 16px", fontSize: 11 }}>
            <ButtonShine />
            {post.pinned ? "取消置頂" : "設為置頂"}
          </button>
        )}

        <ReactionBar reactions={post.reactions} myKeys={myReactionKeys} onToggle={onToggleReaction} />
      </div>

      <div style={{ marginTop: 20 }}>
        <h4 style={{ marginBottom: 10, color: OUTLINE }}>留言（{post.comments.length}）</h4>

        {topLevelComments.length === 0 ? (
          <p style={{ fontSize: 13, color: "#8a90bf" }}>還沒有留言，來當第一個回覆的人吧</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 14 }}>
            {topLevelComments.map((c) => (
              <CommentThread
                key={c.id}
                comment={c}
                replies={repliesOf(c.id)}
                user={user}
                replyOpen={replyingTo === c.id}
                onToggleReply={() => setReplyingTo(replyingTo === c.id ? null : c.id)}
                onReply={(data) => {
                  onAddComment(post.id, { ...data, parentId: c.id });
                  setReplyingTo(null);
                }}
              />
            ))}
          </div>
        )}

        {user ? (
          <CommentForm onSubmit={(data) => onAddComment(post.id, data)} />
        ) : (
          <p style={{ fontSize: 13, color: "#8a90bf" }}>登入後才能留言，請點右上角「登入 / 註冊」。</p>
        )}
      </div>
    </div>
  );
}

// 意見回饋是「私下回報給網站擁有者」的管道，不是公開版面，其他訪客看不到內容。
const SITE_OWNER_EMAIL = "a42969266@gmail.com";

function FeedbackButton({ open, onToggle, onClose }) {
  const [message, setMessage] = useState("");
  const [contact, setContact] = useState("");
  const [hover, setHover] = useState(false);

  const handleSend = () => {
    if (!message.trim()) return;
    const subject = encodeURIComponent("Tamagotchi Paradise 網站意見回饋");
    const body = encodeURIComponent(`${message}\n\n（聯絡方式：${contact || "未留"}）`);
    window.location.href = `mailto:${SITE_OWNER_EMAIL}?subject=${subject}&body=${body}`;
    setMessage("");
    setContact("");
    onClose();
  };

  return (
    <>
      <button
        onClick={onToggle}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        title="意見回饋"
        style={{ position: "fixed", right: 24, bottom: 24, ...pixelFabStyle(hover) }}
      >
        <FabShine />
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
          <path d="M4 4h16v12H9l-5 5V4z" stroke="#fff" strokeWidth="2.2" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div
          onClick={onClose}
          style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(38,43,82,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", border: `4px solid ${OUTLINE}`, clipPath: pixelClip(12), padding: 18, width: "min(360px, 90vw)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <strong style={{ color: OUTLINE }}>意見回饋</strong>
              <button onClick={onClose} style={{ border: "none", background: "none", fontSize: 18, cursor: "pointer", color: OUTLINE, lineHeight: 1 }}>
                ✕
              </button>
            </div>
            <p style={{ fontSize: 12, color: "#8a90bf", margin: "0 0 8px" }}>這裡是私下回報給網站管理者，其他人看不到。點送出後會開啟你的信箱寄出。</p>
            <textarea placeholder="想告訴我們的建議、問題或錯誤回報..." value={message} onChange={(e) => setMessage(e.target.value)} rows={4} style={{ ...inputStyle, resize: "vertical" }} />
            <input placeholder="聯絡方式（選填，方便回覆你）" value={contact} onChange={(e) => setContact(e.target.value)} style={inputStyle} />
            <button onClick={handleSend} style={{ ...pixelButtonStyle("primary", "normal"), width: "100%" }}>
              <ButtonShine />
              送出
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default function ForumPrototype() {
  const [boards, setBoards] = useState([]);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  // 進來預設先選第一個版，畫面才不會一開始是空的（跟一般網站左側選單的習慣一樣），
  // 但一開始資料庫還沒讀完，所以先給 null，等 loadData 抓到看板列表後再補上第一個。
  const [activeBoardKey, setActiveBoardKey] = useState(null);
  const [selectedPostId, setSelectedPostId] = useState(null);
  const [composing, setComposing] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [query, setQuery] = useState("");
  // 登入狀態、暱稱、是否為管理者，全部改成從共用的 auth-context 拿，不再由這個檔案自己管理。
  const { user, profile, isAdmin } = useAuth();
  // 記錄「這次瀏覽期間，我按過哪些文章的哪些表情」，格式是 "貼文id:表情key" 的集合。
  const [myReactions, setMyReactions] = useState(() => new Set());

  // 向 Supabase 重新抓一次看板、文章、留言，並組合成畫面原本熟悉的資料格式。
  // 每次新增文章／留言／表情／置頂之後都會重新呼叫這個函式，確保畫面顯示的是資料庫裡最新的真實資料。
  const loadData = useCallback(async () => {
    const [boardRes, postRes, commentRes] = await Promise.all([
      supabase.from("boards").select("*").order("id"),
      supabase.from("posts").select("*").order("created_at", { ascending: false }),
      supabase.from("comments").select("*").order("created_at", { ascending: true }),
    ]);

    if (boardRes.error || postRes.error || commentRes.error) {
      setLoadError((boardRes.error || postRes.error || commentRes.error).message);
      setLoading(false);
      return;
    }

    const mappedBoards = (boardRes.data || []).map((b) => ({ key: b.id, label: b.label, desc: b.description, rules: b.rules || [] }));
    const mappedPosts = (postRes.data || []).map((p) => ({
      id: p.id,
      boardKey: p.board_key,
      author: p.author,
      title: p.title,
      content: p.content,
      image: p.image,
      reactions: p.reactions || {},
      pinned: p.pinned,
      createdAt: p.created_at,
      comments: (commentRes.data || [])
        .filter((c) => c.post_id === p.id)
        .map((c) => ({ id: c.id, parentId: c.parent_id, author: c.author, content: c.content, image: c.image, createdAt: c.created_at })),
    }));

    setBoards(mappedBoards);
    setPosts(mappedPosts);
    setActiveBoardKey((prev) => prev || (mappedBoards[0] && mappedBoards[0].key) || null);
    setLoadError(null);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const activeBoard = boards.find((b) => b.key === activeBoardKey);
  const postCount = (key) => posts.filter((p) => p.boardKey === key).length;

  // 搜尋只比對「文章標題／內容」，目的是讓人發文前先搜尋有沒有人問過類似問題。
  // 排序：置頂的一律排最前面，其餘依發文時間新到舊排序。
  const boardPosts = posts
    .filter((p) => p.boardKey === activeBoardKey)
    .filter((p) => !query.trim() || p.title.includes(query.trim()) || p.content.includes(query.trim()))
    .sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

  const selectedPost = posts.find((p) => p.id === selectedPostId) || null;

  const selectBoard = (key) => {
    setActiveBoardKey(key);
    setSelectedPostId(null);
    setComposing(false);
    setQuery("");
  };

  // 以下四個動作都是「先寫進資料庫，再重新整批抓一次最新資料」的模式：
  // 寫法比較簡單、不容易出錯，缺點是每次操作後畫面會有一下下（通常不到一秒）的重新整理感，
  // 對這個網站的使用規模來說完全沒問題。

  const handleNewPost = async ({ title, content, image }) => {
    if (!user) return;
    const { error } = await supabase.from("posts").insert({
      board_key: activeBoardKey,
      user_id: user.id,
      author: (profile && profile.display_name) || "會員",
      title,
      content,
      image: image || null,
    });
    if (error) {
      window.alert("發文失敗，請稍後再試：" + error.message);
      return;
    }
    setComposing(false);
    await loadData();
  };

  const handleAddComment = async (postId, { content, image, parentId = null }) => {
    if (!user) return;
    const { error } = await supabase.from("comments").insert({
      post_id: postId,
      parent_id: parentId,
      user_id: user.id,
      author: (profile && profile.display_name) || "會員",
      content,
      image: image || null,
    });
    if (error) {
      window.alert("留言失敗，請稍後再試：" + error.message);
      return;
    }
    await loadData();
  };

  const handleToggleReaction = async (postId, key) => {
    const reactionId = `${postId}:${key}`;
    const hasReacted = myReactions.has(reactionId);
    const delta = hasReacted ? -1 : 1;

    // 表情反應是唯一「訪客也能寫入」的更新動作，所以不是直接改 posts 表（那個現在鎖住只有管理者能改），
    // 而是呼叫一個資料庫函式（toggle_reaction），它只被允許動 reactions 這一個欄位，
    // 這樣訪客可以按讚，但沒辦法透過同一個管道去偷改標題、內容或置頂狀態。
    const { error } = await supabase.rpc("toggle_reaction", { p_post_id: postId, p_key: key, p_delta: delta });
    if (error) return;

    setMyReactions((prev) => {
      const nextSet = new Set(prev);
      if (hasReacted) nextSet.delete(reactionId);
      else nextSet.add(reactionId);
      return nextSet;
    });
    await loadData();
  };

  const handleTogglePin = async (postId) => {
    const post = posts.find((p) => p.id === postId);
    if (!post) return;
    await supabase.from("posts").update({ pinned: !post.pinned }).eq("id", postId);
    await loadData();
  };

  const myReactionKeysFor = (postId) => REACTION_TYPES.filter((r) => myReactions.has(`${postId}:${r.key}`)).map((r) => r.key);

  if (loading) {
    return (
      <div style={{ fontFamily: BODY_FONT, padding: 20 }}>
        <h2 style={{ marginBottom: 4, fontFamily: PIXEL_FONT, fontSize: 16, color: OUTLINE }}>討論區</h2>
        <p style={{ color: "#8a90bf", fontSize: 14 }}>載入中...</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div style={{ fontFamily: BODY_FONT, padding: 20 }}>
        <h2 style={{ marginBottom: 4, fontFamily: PIXEL_FONT, fontSize: 16, color: OUTLINE }}>討論區</h2>
        <p style={{ color: "#e0428a", fontSize: 14 }}>資料讀取失敗：{loadError}</p>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: BODY_FONT, padding: 20 }}>
      {/* 頁面標題放在骨架的全站導覽列底下，跟其他頁面（圖鑑、道具、活動）的做法一致 */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ marginBottom: 4, fontFamily: PIXEL_FONT, fontSize: 16, color: OUTLINE }}>討論區</h2>
          <p style={{ color: "#8a90bf", fontSize: 13, marginTop: 0, marginBottom: 16 }}>登入會員才能發文與留言；每篇文章都屬於你選擇的版面</p>
        </div>
      </div>

      {!selectedPost && (
        <>
          {/* 版面分類籤：橫向排在標題下方，點一個分類，下面就顯示該分類的文章 */}
          <BoardTabs boards={boards} activeKey={activeBoardKey} onSelect={selectBoard} postCount={postCount} />

          {activeBoard && (
            <>
              <p style={{ color: "#5a6099", fontSize: 13, marginTop: 0 }}>{activeBoard.desc}</p>

              <BoardRules rules={activeBoard.rules} />

              <input
                placeholder="搜尋這個版的文章標題或內容關鍵字...（發文前可以先搜尋看看）"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                style={{ ...inputStyle, marginBottom: 12 }}
              />

              {user ? (
                <>
                  {!composing && (
                    <button onClick={() => setComposing(true)} style={{ ...pixelButtonStyle("primary", "normal"), marginBottom: 16 }}>
                      <ButtonShine />
                      發表新文章
                    </button>
                  )}
                  {composing && <ComposeForm board={activeBoard} onSubmit={handleNewPost} onCancel={() => setComposing(false)} />}
                </>
              ) : (
                <p style={{ color: "#8a90bf", fontSize: 13, marginBottom: 16 }}>登入後才能發表文章，請點右上角「登入 / 註冊」。</p>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {boardPosts.map((p) => (
                  <PostListItem key={p.id} post={p} onOpen={() => setSelectedPostId(p.id)} isAdmin={isAdmin} onTogglePin={handleTogglePin} />
                ))}
                {boardPosts.length === 0 &&
                  (query.trim() ? (
                    <p style={{ color: "#8a90bf", fontSize: 14 }}>找不到符合「{query.trim()}」的文章，要不要當第一個發文的人？</p>
                  ) : (
                    <p style={{ color: "#8a90bf", fontSize: 14 }}>這個版還沒有文章，來當第一個發文的人吧</p>
                  ))}
              </div>
            </>
          )}
        </>
      )}

      {selectedPost && (
        <PostDetail
          post={selectedPost}
          user={user}
          onAddComment={handleAddComment}
          myReactionKeys={myReactionKeysFor(selectedPost.id)}
          onToggleReaction={(key) => handleToggleReaction(selectedPost.id, key)}
          onBack={() => setSelectedPostId(null)}
          isAdmin={isAdmin}
          onTogglePin={handleTogglePin}
        />
      )}

      <FeedbackButton open={feedbackOpen} onToggle={() => setFeedbackOpen((v) => !v)} onClose={() => setFeedbackOpen(false)} />
    </div>
  );
}
