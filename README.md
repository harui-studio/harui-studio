# 春豬工作室 Harui Studio 官網

皮革材料包官網。使用 GitHub Pages 免費託管，不需要伺服器，也不需要資料庫。

| 功能 | 做法 |
|---|---|
| 網站 | `content/*.json` 內容 → `build.mjs` 產生靜態頁 → GitHub Actions 自動發布 |
| 購買 | 每個版本各自連到 Boostime 購買頁（booking.haruistudio.com） |
| 客製詢問表單 | 送到店家自己的 Google 試算表（Apps Script），圖片存雲端硬碟 |
| 內容後台 | `/admin/`（Decap CMS），可改首頁、材料包、價格、圖片、購買連結、教學連結、FAQ |
| 分析 | GA4（填入 ID 才會載入；事件不含個資） |

## 資料夾

```
content/        網站內容（後台編輯的就是這裡）
  site.json     首頁、品牌、聯絡、FAQ、條款、表單收件網址、GA4 ID
  kits.json     材料包、版本、價格、購買連結、工具組
  tutorials.json 教學與協助
src/assets/     樣式、程式、上傳的圖片
admin/          內容後台
apps-script/    客製表單收件程式（貼到 Google Apps Script）
build.mjs       產生網站（Node 20 以上，無任何套件依賴）
```

## 一、第一次上線（GitHub Pages）

1. 在 GitHub 建立新 repository，例如 `harui-studio`，把本資料夾全部推上去（分支 `main`）。
2. Repository → **Settings → Pages → Build and deployment → Source** 選 **GitHub Actions**。
3. 到 **Actions** 分頁，等「建置並發布網站」跑完（約 1 分鐘），網址會是
   `https://<帳號>.github.io/harui-studio/`。
4. 之後每次修改並推到 `main`（包含從後台儲存），網站都會自動重新發布。

本機預覽：`node build.mjs`，然後用任一靜態伺服器打開 `dist/`（例：`npx serve dist`）。

### 自訂網域（選用）
Settings → Pages → Custom domain 填入網域（例 `www.haruistudio.com`），並依 GitHub 指示設定 DNS。
設定後網址會變成根目錄，系統會自動調整連結，不需改程式。

## 二、啟用客製詢問表單（必做，否則表單不會收件）

照 `apps-script/README.md` 部署後，把得到的網址填到 `content/site.json` 的 `inquiryEndpoint`。

**還沒設定前，表單頁會顯示「預覽模式」提示，按送出會明確顯示「詢問沒有送出」，不會假裝已收到。**

## 三、啟用內容後台 `/admin/`

Decap CMS 用 GitHub 帳號登入，需要：

1. 修改 `admin/config.yml`：
   - `repo:` 改成實際的 `帳號/harui-studio`
   - `base_url:` 改成 OAuth 代理服務網址
2. 建立 OAuth 代理（GitHub Pages 本身無法處理登入）。免費做法擇一：
   - Cloudflare Workers：部署 [sterlingwes/decap-proxy](https://github.com/sterlingwes/decap-proxy) 之類的開源代理
   - 或改把網站放 Netlify，直接用 Netlify 內建 GitHub 登入（`base_url` 刪除即可）
3. 在 GitHub → Settings → Developer settings → OAuth Apps 建立一個 OAuth App，
   Callback URL 填代理服務提供的網址，把 Client ID / Secret 設到代理服務。
4. 店家的 GitHub 帳號需要是這個 repository 的協作者。

設定完成後，店家打開 `https://<網址>/admin/` 登入即可編輯。每次儲存都會留下版本紀錄，改錯可以還原。

> 沒有設定後台也可以直接在 GitHub 網頁上編輯 `content/*.json`，效果相同。

## 四、GA4（選用）

取得店家同意並建立 GA4 資源後，把評估 ID（`G-XXXXXXX`）填入 `site.json` 的 `ga4Id`。未填則完全不載入 Google 追蹤。

追蹤事件（皆不含姓名、Email、電話等個資）：

| 事件 | 意義 |
|---|---|
| `click_buy_external` | 點了「前往購買」——**購買意圖，不是成交** |
| `custom_form_submit` | 客製詢問成功送出——**詢問，不是訂單** |
| `click_tutorial` | 點了教學連結 |
| `click_contact` | 點了電話、Email、社群 |

若要對歐盟訪客或嚴格合規，建議另外加 Cookie 同意橫幅（目前未內建）。

## 五、內容規則

- 空白欄位（尺寸、交期、配送、營業時間、FAQ、條款）**不會顯示**，店家確認後再填即可出現。
- 「目前販售」只放 `kits.json` 內的材料包；歷史作品放在作品集連結，兩者分開。
- 價格以 Boostime 購買頁為準；修改價格時兩邊都要改。
