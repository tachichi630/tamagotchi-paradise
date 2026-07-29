import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { supabase } from "./supabaseClient";

// 全站共用的登入狀態：這個 Context 讓每個頁面（導覽列、討論區、後台管理...）
// 都能知道「現在有沒有人登入」「登入的人是不是管理者」，不用每個檔案各自重複問一次 Supabase。
//
// isAdmin 的判斷方式：登入後去 profiles 表讀這個帳號的 is_admin 欄位。這個欄位只有你
// （透過 Supabase 後台的 SQL Editor）能設定，一般訪客自己註冊帳號，is_admin 一定是 false，
// 網站上沒有任何操作可以讓人把自己變成管理者（資料庫的規則也會擋掉，不只是前端藏起來而已）。
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined); // undefined = 還在檢查登入狀態中
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);

  const loadProfile = useCallback(async (userId) => {
    if (!userId) {
      setProfile(null);
      return;
    }
    setProfileLoading(true);
    const { data } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
    setProfile(data || null);
    setProfileLoading(false);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      loadProfile(data.session && data.session.user.id);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      loadProfile(newSession && newSession.user.id);
    });
    return () => listener.subscription.unsubscribe();
  }, [loadProfile]);

  // 註冊：建立帳號＋建立對應的 profiles 資料列（存暱稱）。is_admin 一律從 false 開始，
  // 前端這裡完全沒有欄位可以指定成 true，資料庫那邊的規則也只允許插入 is_admin=false 的資料列。
  const signUp = async (email, password, displayName) => {
    const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
    if (error) return { error };
    if (data.user) {
      const { error: profileError } = await supabase.from("profiles").insert({ id: data.user.id, display_name: displayName.trim(), is_admin: false });
      if (profileError) return { error: profileError };
      await loadProfile(data.user.id);
    }
    return { error: null };
  };

  const signIn = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const value = {
    session,
    user: session ? session.user : null,
    profile,
    isAdmin: !!(profile && profile.is_admin),
    loading: session === undefined || profileLoading,
    signUp,
    signIn,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
