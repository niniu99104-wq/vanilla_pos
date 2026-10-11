/**
 * Vanilla POS 前端設定 —— 只需要改這一個值。
 *
 * API_URL  Apps Script「網頁應用程式」的網址（結尾是 /exec）
 *
 * 這個網址不是密碼，可以放在公開的 GitHub 專案裡；沒有登入就讀寫不了任何資料。
 * 留空 = 示範模式：使用內建的假商品，不會讀寫您的試算表。
 */
export const CONFIG = {
  API_URL: 'https://script.google.com/macros/s/AKfycbx3gBcfdN3jRABWp2z12uVWH-8qUJAvfAGwyG2kMjKbnfvjYh8s1q6YdgIjUKNp58tL/exec'
};
