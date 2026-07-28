import { createClient } from "@supabase/supabase-js";

// 這組網址跟金鑰是 Supabase 的「公開金鑰」，設計上就是給瀏覽器直接使用的，
// 不是密碼，放在前端程式碼裡是安全、正常的做法。
// 之後如果換了 Supabase 專案，只要改這兩個值就好，其他程式碼都不用動。
const SUPABASE_URL = "https://ehbnscczcewbsxiznbha.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_qDaQ052OpKYhjiFGWyOhsA_0-H-2puG";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
