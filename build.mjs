// 春豬工作室官網建置腳本：讀取 content/*.json，輸出靜態網站到 dist/
// 無任何 npm 相依套件。用法：node build.mjs（GitHub Actions 會自動執行）
import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";

const root = dirname(new URL(import.meta.url).pathname);
const read = (f) => JSON.parse(readFileSync(join(root, "content", f), "utf8"));
const site = read("site.json");
const { kits, tools, materialNote } = read("kits.json");
const tutorials = read("tutorials.json");

const BASE = (process.env.BASE_PATH || "").replace(/\/$/, "");
const SITE_URL = (process.env.SITE_URL || site.siteUrl || "").replace(/\/$/, "");
const out = join(root, "dist");
const VERSION = Date.now().toString(36);

// 後台上傳的圖片路徑是 /assets/uploads/...，在 GitHub Pages 專案網址下要加上子路徑
const fixImg = (p) => (p && p.startsWith("/") ? BASE + p : p);
site.home.heroImage = fixImg(site.home.heroImage);
kits.forEach((k) => k.variants.forEach((v) => (v.image = fixImg(v.image))));
tools.forEach((t) => (t.image = fixImg(t.image)));

const esc = (s = "") => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const url = (p) => `${BASE}${p}`;
const money = (n) => `NT$${Number(n).toLocaleString("en-US")}`;
const stars = (n) => `<span class="stars" aria-label="難度 ${n} 顆星">${"★".repeat(n)}</span>`;
const minPrice = (k) => Math.min(...k.variants.map((v) => v.price));
const ext = (href, text, cls = "", attrs = "") => `<a href="${esc(href)}" target="_blank" rel="noopener noreferrer"${cls ? ` class="${cls}"` : ""} ${attrs}>${text}<span class="visually-hidden">（另開新視窗）</span></a>`;

const nav = [
  ["材料包", "/kits/"], ["客製材料包", "/custom/"], ["教學與協助", "/support/"],
  ["作品集", "/works/"], ["關於春豬", "/about/"], ["聯絡", "/contact/"],
];

function breadcrumbs(items) {
  const list = [{ name: "首頁", path: "/" }, ...items];
  const html = `<nav class="crumbs" aria-label="麵包屑"><ol>${list.map((it, i) => `<li>${i === list.length - 1 ? `<span aria-current="page">${esc(it.name)}</span>` : `<a href="${url(it.path)}">${esc(it.name)}</a>`}</li>`).join("")}</ol></nav>`;
  const ld = { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: list.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, ...(SITE_URL ? { item: SITE_URL + url(it.path) } : {}) })) };
  return { html, ld };
}

function layout({ path, title, description, body, ld = [], bodyClass = "", image }) {
  const fullTitle = path === "/" ? `${site.siteName}｜皮革材料包與客製材料包` : `${title}｜${site.siteName}`;
  const canonical = SITE_URL ? SITE_URL + url(path) : "";
  const ogImage = image || site.home.heroImage;
  const ga = site.ga4Id ? `<script async src="https://www.googletagmanager.com/gtag/js?id=${esc(site.ga4Id)}"></script><script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${esc(site.ga4Id)}',{anonymize_ip:true});</script>` : "";
  return `<!doctype html>
<html lang="zh-Hant-TW">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(fullTitle)}</title>
<meta name="description" content="${esc(description)}">
${canonical ? `<link rel="canonical" href="${esc(canonical)}">` : ""}
<meta property="og:type" content="website">
<meta property="og:site_name" content="${esc(site.siteName)}">
<meta property="og:title" content="${esc(fullTitle)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:image" content="${esc(ogImage)}">
${canonical ? `<meta property="og:url" content="${esc(canonical)}">` : ""}
<meta property="og:locale" content="zh_TW">
<meta name="twitter:card" content="summary_large_image">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;600;700&family=Noto+Serif+TC:wght@600;700&display=swap">
<link rel="stylesheet" href="${url("/assets/style.css")}?v=${VERSION}">
<style>.visually-hidden{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}</style>
${ld.map((d) => `<script type="application/ld+json">${JSON.stringify(d)}</script>`).join("\n")}
${ga}
</head>
<body class="${bodyClass}">
<a class="skip" href="#main">跳到主要內容</a>
<header class="site-header">
  <div class="wrap">
    <a class="brand" href="${url("/")}">春豬工作室<small>HARUI STUDIO</small></a>
    <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="site-nav">選單</button>
    <nav class="nav" id="site-nav" aria-label="主要導覽"><ul>${nav.map(([l, p]) => `<li><a href="${url(p)}"${path.startsWith(p) ? ' aria-current="page"' : ""}>${l}</a></li>`).join("")}</ul></nav>
  </div>
</header>
<main id="main">
${body}
</main>
<footer class="site-footer">
  <div class="wrap">
    <div class="cols">
      <div>
        <p class="brand">${esc(site.shortName)}</p>
        <p class="small" style="margin-top:8px">本站商品為皮革材料包，收到後需自行縫製完成。購買於春豬現有的購物頁完成。</p>
      </div>
      <div>
        <ul>
          <li><a href="${url("/classes/")}">課程資訊</a></li>
          <li><a href="${url("/works/")}">作品集</a></li>
          <li><a href="tel:${esc(site.contact.phoneHref)}" data-track="contact" data-channel="phone">${esc(site.contact.phone)}</a></li>
          <li><a href="mailto:${esc(site.contact.email)}" data-track="contact" data-channel="email">${esc(site.contact.email)}</a></li>
        </ul>
      </div>
      <div>
        <ul>
          <li>${ext(site.contact.facebook, "Facebook", "", 'data-track="contact" data-channel="facebook"')}</li>
          <li>${ext(site.contact.instagram, "Instagram", "", 'data-track="contact" data-channel="instagram"')}</li>
        </ul>
        <p class="small" style="margin-top:12px">${site.policies.shopping || site.policies.privacy ? "" : "購物須知與隱私權政策整理中，如有疑問請直接聯絡我們。"}</p>
      </div>
    </div>
    <p class="copyright">© ${new Date().getFullYear()} ${esc(site.siteName)}</p>
  </div>
</footer>
<script>window.HARUI=${JSON.stringify({ endpoint: site.inquiryEndpoint, ga: Boolean(site.ga4Id), base: BASE })};</script>
<script src="${url("/assets/main.js")}?v=${VERSION}" defer></script>
</body>
</html>`;
}

function kitCard(k) {
  return `<article class="card" data-kit data-type="${esc(k.type)}" data-difficulty="${k.difficulty}" data-punched="${[...new Set(k.variants.map((v) => (v.punched ? "yes" : "no")))].join(" ")}" data-color="${[...new Set(k.variants.map((v) => v.color))].join(" ")}">
  <a href="${url(`/kits/${k.slug}/`)}" tabindex="-1" aria-hidden="true"><img src="${esc(k.variants[0].image)}" alt="" loading="lazy" width="720" height="480"></a>
  <div class="card-body">
    <div class="badges"><span class="badge badge-strong">材料包</span><span class="badge">需自行縫製</span>${k.variants.some((v) => v.punched) ? '<span class="badge">有打洞版</span>' : ""}${k.variants.some((v) => !v.punched) ? '<span class="badge">無打洞版</span>' : ""}</div>
    <p class="small muted">${esc(k.styleNo)}・${esc(k.type)}</p>
    <h3><a href="${url(`/kits/${k.slug}/`)}">${esc(k.name)}</a></h3>
    <div class="card-foot"><div><p class="price">${money(minPrice(k))}${k.variants.length > 1 ? " 起" : ""}</p><p class="small muted">店家標示難度 ${stars(k.difficulty)}</p></div><a href="${url(`/kits/${k.slug}/`)}" class="small">看詳情 →</a></div>
  </div>
</article>`;
}

function toolCard(t) {
  return `<article class="card"><img src="${esc(t.image)}" alt="${esc(t.name)}" loading="lazy" width="720" height="480"><div class="card-body"><div class="badges"><span class="badge">工具組</span></div><h3>${esc(t.name)}</h3><p class="price" style="margin-top:6px">${money(t.price)}</p><p class="small muted" style="margin-top:10px">${esc(t.contents)}</p><p class="small" style="margin-top:8px">${esc(t.forWho)}</p><div class="btn-row" style="margin-top:16px">${ext(t.buyUrl, "前往購買", "btn btn-ghost", `data-track="buy" data-item="${esc(t.name)}"`)}</div></div></article>`;
}

const storeLd = { "@context": "https://schema.org", "@type": "Store", name: site.siteName, address: { "@type": "PostalAddress", streetAddress: "青田街12巷12-2號1樓", addressLocality: "大安區", addressRegion: "台北市", addressCountry: "TW" }, telephone: "+886-2-2321-6931", email: site.contact.email, sameAs: [site.contact.facebook, site.contact.instagram], ...(SITE_URL ? { url: SITE_URL + url("/") } : {}) };
const productLd = (k) => k.variants.map((v) => ({ "@context": "https://schema.org", "@type": "Product", name: `${k.name}（${v.name}）`, sku: `${k.styleNo} ${v.name}`, image: v.image, material: k.material, brand: { "@type": "Brand", name: site.siteName }, offers: { "@type": "Offer", price: v.price, priceCurrency: "TWD", url: v.buyUrl } }));

// 新手問題：答案全部取自來源資料
const starterQA = [
  ["我買到的是成品嗎？", "不是。本站商品為皮革材料包，內含皮片、針線與說明書，收到後需要自己縫製完成。"],
  ["新手適合嗎？", `店家標示：鑰匙圈材料包難度 ★，「適合初學者製作」；三角巧克力筆袋難度 ★★，「適合初學者嘗試挑戰」。`],
  ["需要另外準備工具嗎？", "有打洞版的皮片已打好洞，店家建議搭配簡易基礎工具套組（磨邊、保養用）。無打洞版需自行打洞，店家建議準備充足工具，可參考進階基礎工具套組。"],
  ["收到後怎麼開始？", "依包內說明書操作，說明書含穿針與縫製說明。卡關時可到「教學與協助」頁聯絡工作室。"],
];
const faqHtml = (items) => items.map(([q, a]) => `<details class="panel" style="padding:16px 20px"><summary style="cursor:pointer;font-weight:600">${esc(q)}</summary><p class="muted" style="margin-top:10px">${esc(a)}</p></details>`).join("");

const pages = {};

// 首頁
pages["/"] = layout({
  path: "/", title: site.siteName,
  description: "春豬工作室的皮革材料包：義大利牛皮皮片、針線與說明書，在家親手縫製；也可詢問客製材料包。",
  ld: [storeLd],
  body: `
<section class="hero">
  <img src="${esc(site.home.heroImage)}" alt="" width="1440" height="960" fetchpriority="high">
  <div class="wrap"><div class="hero-inner fade">
    <p class="eyebrow" style="color:#e9c9a0">春豬工作室 HARUI STUDIO</p>
    <h1>${esc(site.home.heroTitle)}</h1>
    <p class="text">${esc(site.home.heroText)}</p>
    <p class="note">${esc(site.home.heroNote)}</p>
    <div class="btn-row"><a class="btn btn-light" href="${url("/kits/")}">挑選材料包</a><a class="btn btn-ghost" style="color:#fff;border-color:#e9c9a0" href="${url("/custom/")}">詢問客製材料包</a></div>
  </div></div>
</section>

<section class="section"><div class="wrap">
  <p class="eyebrow">WHAT IS A KIT</p><h2>材料包是什麼？</h2>
  <div class="explain">
    <div><p class="num">01</p><h3>你會收到</h3><p class="muted" style="margin-top:8px">義大利牛皮皮片、針、線與說明書。部分版本拉鍊已先車縫裝好。</p></div>
    <div><p class="num">02</p><h3>你需要做</h3><p class="muted" style="margin-top:8px">依說明書一針一線縫製完成。選擇無打洞版，需要先自行打洞。</p></div>
    <div><p class="num">03</p><h3>工具怎麼準備</h3><p class="muted" style="margin-top:8px">有打洞版店家建議搭配簡易工具組；無打洞版建議準備進階工具組。<a href="#start">看新手問答</a></p></div>
  </div>
</div></section>

<section class="section section-alt"><div class="wrap">
  <div style="display:flex;justify-content:space-between;align-items:end;gap:16px;flex-wrap:wrap"><div><p class="eyebrow">KITS</p><h2>目前販售的材料包</h2></div><a href="${url("/kits/")}">全部材料包與工具組 →</a></div>
  <div class="grid grid-2" style="margin-top:24px">${kits.filter((k) => k.featured).map(kitCard).join("")}</div>
</div></section>

<section class="section"><div class="wrap">
  <p class="eyebrow">PUNCHED OR NOT</p><h2>筆袋要選有打洞，還是無打洞？</h2>
  <div class="table-scroll"><table class="compare">
    <thead><tr><th scope="col"></th><th scope="col">有打洞版</th><th scope="col">無打洞版</th></tr></thead>
    <tbody>
      <tr><th scope="row">價格</th><td>${money(1280)}</td><td>${money(980)}</td></tr>
      <tr><th scope="row">皮片</th><td>已打洞</td><td>未打洞，需自行打洞</td></tr>
      <tr><th scope="row">拉鍊</th><td>已車縫裝好</td><td>附拉鍊</td></tr>
      <tr><th scope="row">店家建議工具</th><td>簡易基礎工具套組</td><td>準備充足工具，參考進階基礎工具套組</td></tr>
    </tbody>
  </table></div>
</div></section>

<section class="section section-alt"><div class="wrap">
  <p class="eyebrow">HOW IT WORKS</p><h2>從下單到完成</h2>
  <ol class="steps four"><li>在購買頁選版本下單</li><li>收到材料包</li><li>依說明書縫製</li><li>卡關時到「教學與協助」找我們</li></ol>
</div></section>

<section class="section" id="start"><div class="wrap">
  <p class="eyebrow">BEFORE YOU START</p><h2>開始之前</h2>
  <div class="grid" style="margin-top:24px">${faqHtml(starterQA)}${faqHtml(site.faq.map((f) => [f.q, f.a]))}</div>
</div></section>

<section class="section section-alt"><div class="wrap grid grid-2">
  <div class="panel"><h3>客製材料包</h3><p class="muted">想換顏色或調整款式？先選參考款式、提出需求，由店家確認能否製作、價格與交期。</p><div class="btn-row" style="margin-top:18px"><a class="btn" href="${url("/custom/")}">詢問客製材料包</a></div></div>
  <div class="panel"><h3>教學與協助</h3><p class="muted">依材料包名稱或編號找教學方式；製作卡關也能從這裡聯絡工作室。</p><div class="btn-row" style="margin-top:18px"><a class="btn btn-ghost" href="${url("/support/")}" data-track="tutorial">前往教學與協助</a></div></div>
</div></section>

<section class="section"><div class="wrap" style="max-width:760px">
  <p class="eyebrow">ABOUT HARUI</p><h2>從日本革鞄工藝，到台北青田街</h2>
  <p class="lead">${esc(site.about.story)}</p>
  <p style="margin-top:16px"><a href="${url("/about/")}">認識春豬 →</a>　<a href="${url("/works/")}">看過往作品 →</a></p>
</div></section>

<section class="wrap" style="padding-block:28px;border-top:1px solid var(--line)">
  <p class="small muted"><strong>課程</strong>　${esc(site.classes.text)} <a href="${url("/classes/")}">課程資訊</a></p>
</section>`,
});

// 材料包列表
{
  const bc = breadcrumbs([{ name: "材料包", path: "/kits/" }]);
  pages["/kits/"] = layout({
    path: "/kits/", title: "皮革材料包",
    description: "春豬工作室目前販售的皮革材料包與工具組，可依類型、打洞、顏色與難度篩選。",
    ld: [bc.ld, ...kits.flatMap(productLd)],
    body: `<div class="wrap section">${bc.html}
<p class="eyebrow">DIY LEATHER KITS</p><h1>皮革材料包</h1>
<p class="lead">以下皆為材料包，不是成品。收到後依說明書自行縫製完成；購買在春豬現有的購物頁進行。</p>
<form class="filters" id="kit-filters" aria-label="篩選材料包">
  <label>作品類型<select name="type"><option value="">全部</option>${[...new Set(kits.map((k) => k.type))].map((t) => `<option>${esc(t)}</option>`).join("")}</select></label>
  <label>是否已打洞<select name="punched"><option value="">全部</option><option value="yes">有打洞</option><option value="no">無打洞</option></select></label>
  <label>顏色<select name="color"><option value="">全部</option>${[...new Set(kits.flatMap((k) => k.variants.map((v) => v.color)))].map((c) => `<option>${esc(c)}</option>`).join("")}</select></label>
  <label>店家標示難度<select name="difficulty"><option value="">全部</option>${[...new Set(kits.map((k) => k.difficulty))].sort().map((d) => `<option value="${d}">${"★".repeat(d)}</option>`).join("")}</select></label>
</form>
<div class="grid grid-2" id="kit-list">${kits.map(kitCard).join("")}</div>
<p class="empty" id="kit-empty" hidden>沒有符合條件的材料包，請調整篩選。</p>
<section style="margin-top:64px" id="tools"><p class="eyebrow">TOOLS</p><h2>工具組</h2><p class="lead">工具組另外販售，不含在材料包內。</p><div class="grid grid-2" style="margin-top:24px">${tools.map(toolCard).join("")}</div></section>
</div>`,
  });
}

// 材料包詳情
for (const k of kits) {
  const path = `/kits/${k.slug}/`;
  const bc = breadcrumbs([{ name: "材料包", path: "/kits/" }, { name: k.name, path }]);
  const v0 = k.variants[0];
  const ref = (v) => `${k.styleNo} ${k.name}（${v.name}）`;
  const opt = [
    ["尺寸", k.size], ["不包含", k.notIncluded], ["製作步驟", k.steps], ["是否需手作經驗", k.experience], ["交期", k.delivery], ["配送", k.shipping],
  ].filter(([, val]) => val);
  pages[path] = layout({
    path, title: k.name, bodyClass: "has-sticky", image: v0.image,
    description: `${k.name}（${k.styleNo}）：${k.material}皮革材料包，${money(minPrice(k))}${k.variants.length > 1 ? " 起" : ""}，附說明書，收到後自行縫製完成。`,
    ld: [bc.ld, ...productLd(k)],
    body: `<div class="wrap section">${bc.html}
<div class="detail" data-detail data-variants='${esc(JSON.stringify(k.variants.map((v) => ({ name: v.name, price: money(v.price), buyUrl: v.buyUrl, image: v.image, contents: v.contents, toolTip: v.toolTip, ref: ref(v) }))))}' data-kit-name="${esc(k.name)}">
  <div class="detail-photo"><img id="v-image" src="${esc(v0.image)}" alt="${esc(k.name)}（${esc(v0.name)}）" width="1440" height="960"></div>
  <div>
    <div class="badges"><span class="badge badge-strong">材料包</span><span class="badge">需自行縫製</span></div>
    <p class="small muted">${esc(k.styleNo)}・${esc(k.type)}</p>
    <h1 style="font-size:clamp(1.7rem,4vw,2.4rem)">${esc(k.name)}</h1>
    <p class="price" style="font-size:1.5rem;margin-top:10px;color:var(--leather)" id="v-price">${money(v0.price)}</p>
    ${k.variants.length > 1 ? `<div style="margin-top:20px"><p class="small" style="font-weight:600">選擇版本</p><div class="variants" role="group" aria-label="選擇版本">${k.variants.map((v, i) => `<button type="button" class="variant" data-index="${i}" aria-pressed="${i === 0}">${esc(v.name)}<br><span class="small">${money(v.price)}</span></button>`).join("")}</div></div>` : `<p class="small" style="margin-top:12px">版本：${esc(v0.name)}</p>`}
    <div class="btn-row desk-buy">
      <a class="btn" id="v-buy" href="${esc(v0.buyUrl)}" target="_blank" rel="noopener noreferrer" data-track="buy" data-item="${esc(ref(v0))}">前往購買</a>
      <a class="btn btn-ghost" id="v-ask" href="${url("/custom/")}?ref=${encodeURIComponent(ref(v0))}">詢問這款材料包</a>
    </div>
    <p class="small muted" style="margin-top:12px">「前往購買」會開啟春豬現有的購物頁，在那裡完成下單與付款。</p>
  </div>
</div>
<div class="facts">
  <section class="panel"><h3>包內包含</h3><ul class="check" id="v-contents">${v0.contents.map((c) => `<li>${esc(c)}</li>`).join("")}</ul>${k.notIncluded ? "" : '<p class="small muted" style="margin-top:12px">工具組不含在材料包內，需另外購買。</p>'}</section>
  <section class="panel"><h3>難度與教學</h3><p>店家標示難度 ${stars(k.difficulty)}</p><p class="small muted">${esc(k.difficultyNote)}</p><p style="margin-top:12px">${esc(k.teaching)}</p><p class="small" style="margin-top:8px"><a href="${url("/support/")}?q=${encodeURIComponent(k.styleNo)}" data-track="tutorial">查看教學與協助</a></p></section>
  <section class="panel"><h3>工具</h3><p id="v-tool">${esc(v0.toolTip)}</p><p class="small" style="margin-top:8px"><a href="${url("/kits/")}#tools">看工具組內容</a></p></section>
  ${opt.map(([label, val]) => `<section class="panel"><h3>${esc(label)}</h3><p>${esc(val)}</p></section>`).join("")}
</div>
<p class="mat-note">材質：${esc(k.material)}。${esc(materialNote)}</p>
</div>
<div class="sticky-buy"><a class="btn" id="m-buy" href="${esc(v0.buyUrl)}" target="_blank" rel="noopener noreferrer" data-track="buy" data-item="${esc(ref(v0))}">前往購買</a><a class="btn btn-ghost" id="m-ask" href="${url("/custom/")}?ref=${encodeURIComponent(ref(v0))}">詢問這款材料包</a></div>`,
  });
}

// 客製材料包
{
  const bc = breadcrumbs([{ name: "客製材料包", path: "/custom/" }]);
  const refOptions = kits.flatMap((k) => k.variants.map((v) => `${k.styleNo} ${k.name}（${v.name}）`));
  pages["/custom/"] = layout({
    path: "/custom/", title: "客製材料包詢問",
    description: "從參考款式出發，提出客製皮革材料包需求；可否製作、價格與交期由春豬工作室確認後回覆。",
    ld: [bc.ld],
    body: `<div class="wrap section">${bc.html}
<p class="eyebrow">CUSTOM KIT</p><h1>客製材料包</h1>
<p class="lead">從一款參考款式開始，告訴我們你想調整的地方。店家確認後會回覆能否製作、價格與交期。</p>
<ol class="steps six"><li>選擇參考款式</li><li>提出需求</li><li>店家確認可行性與報價</li><li>確認訂單</li><li>製作與寄送</li><li>你自行完成</li></ol>
<div style="max-width:760px;margin:40px auto 0">
  <p class="notice"><strong>送出表單代表提出詢問，尚未完成下單。</strong>可否客製、價格與交期，都需由店家確認後回覆；網站不會自動報價。</p>
  ${site.inquiryEndpoint ? "" : '<p class="notice notice-warn" style="margin-top:12px" id="preview-warning">預覽版：表單尚未接上店家的收件系統，目前送出不會傳給店家。如需詢問，請直接以 Email 或電話聯絡。</p>'}
  <form class="inquiry panel" id="inquiry" novalidate>
    <div class="field"><label for="f-name">姓名<span class="req">必填</span></label><input id="f-name" name="name" type="text" autocomplete="name" maxlength="100" required><p class="error" aria-live="polite"></p></div>
    <div class="two">
      <div class="field"><label for="f-email">Email</label><input id="f-email" name="email" type="email" autocomplete="email" maxlength="255"><p class="error" aria-live="polite"></p></div>
      <div class="field"><label for="f-phone">電話</label><input id="f-phone" name="phone" type="tel" autocomplete="tel" maxlength="20" placeholder="0912345678"><p class="error" aria-live="polite"></p></div>
    </div>
    <p class="hint" style="margin-top:-12px">Email 與電話至少填一項。</p>
    <fieldset class="field" style="border:0;padding:0;margin:0"><legend class="label">偏好的聯絡方式<span class="req">必填</span></legend><div class="choices"><label><input type="radio" name="preferred" value="Email" checked>Email</label><label><input type="radio" name="preferred" value="電話">電話</label></div><p class="error" aria-live="polite"></p></fieldset>
    <div class="field"><label for="f-ref">參考款式或商品編號<span class="req">必填</span></label><input id="f-ref" name="reference" type="text" list="ref-list" maxlength="200" required placeholder="例：No.120 三角巧克力筆袋材料包"><datalist id="ref-list">${refOptions.map((r) => `<option value="${esc(r)}">`).join("")}</datalist><p class="hint">也可以填作品集裡的作品名稱。</p><p class="error" aria-live="polite"></p></div>
    <div class="field"><label for="f-changes">想調整的內容<span class="req">必填</span></label><textarea id="f-changes" name="changes" maxlength="2000" required placeholder="例如想換的顏色、尺寸、用途"></textarea><p class="hint">至少 10 個字。</p><p class="error" aria-live="polite"></p></div>
    <fieldset class="field" style="border:0;padding:0;margin:0"><legend class="label">手作經驗<span class="req">必填</span></legend><div class="choices">${["沒做過", "做過一兩件", "常做"].map((v) => `<label><input type="radio" name="experience" value="${v}">${v}</label>`).join("")}</div><p class="error" aria-live="polite"></p></fieldset>
    <fieldset class="field" style="border:0;padding:0;margin:0"><legend class="label">現有工具</legend><div class="choices">${["沒有工具", "簡易基礎工具套組", "進階基礎工具套組", "其他工具"].map((v) => `<label><input type="checkbox" name="tools" value="${v}">${v}</label>`).join("")}</div></fieldset>
    <div class="field"><label for="f-date">希望收到的日期（期望日期）</label><input id="f-date" name="desiredDate" type="date"><p class="hint">這只是你的期望，實際交期由店家確認。</p><p class="error" aria-live="polite"></p></div>
    <div class="field"><label for="f-images">參考圖片</label><input id="f-images" name="images" type="file" accept="image/jpeg,image/png,image/webp" multiple><p class="hint">選填，最多 3 張，每張 3MB 以內，JPG／PNG／WebP。</p><div class="thumbs" id="thumbs"></div><p class="error" aria-live="polite"></p></div>
    <div class="field"><label for="f-notes">其他說明</label><textarea id="f-notes" name="notes" maxlength="2000"></textarea></div>
    <div style="position:absolute;left:-9999px" aria-hidden="true"><label>請勿填寫<input type="text" name="website" tabindex="-1" autocomplete="off"></label></div>
    <div class="field"><div class="choices"><label><input type="checkbox" name="consent" value="yes" required>我同意春豬工作室以我提供的聯絡方式回覆這次詢問。</label></div><p class="error" aria-live="polite"></p></div>
    <button class="btn" type="submit" id="submit-btn">送出詢問</button>
    <div id="form-status" class="status" role="status" aria-live="polite" hidden></div>
  </form>
</div>
</div>`,
  });
}

// 教學與協助
{
  const bc = breadcrumbs([{ name: "教學與協助", path: "/support/" }]);
  const items = tutorials.items.map((t) => ({ t, k: kits.find((k) => k.slug === t.kitSlug) })).filter((x) => x.k);
  pages["/support/"] = layout({
    path: "/support/", title: "教學與協助",
    description: "依材料包名稱或編號查詢春豬工作室材料包的教學方式，製作卡關時的聯絡方式。",
    ld: [bc.ld],
    body: `<div class="wrap section">${bc.html}
<p class="eyebrow">SUPPORT</p><h1>教學與協助</h1>
<p class="lead">${esc(tutorials.intro)}</p>
<div class="field" style="max-width:520px;margin-top:24px"><label for="tut-q">輸入材料包名稱或編號</label><input id="tut-q" type="search" placeholder="例：筆袋、No.120"></div>
<div class="grid" style="margin-top:20px" id="tut-list">${items.map(({ t, k }) => `<article class="panel" data-tut data-search="${esc(`${k.name} ${k.styleNo} ${k.type}`.toLowerCase())}"><p class="small muted">${esc(k.styleNo)}</p><h2 style="font-size:1.25rem">${esc(k.name)}</h2><p style="margin-top:8px">${esc(t.method)}</p>${t.buyersOnly ? '<p class="small muted">更多教學僅提供給購買者，請聯絡店家取得。</p>' : t.links.length ? `<ul>${t.links.map((l) => `<li>${ext(l.url, esc(l.title), "", 'data-track="tutorial"')}</li>`).join("")}</ul>` : '<p class="small muted" style="margin-top:6px">網站圖文或影片教學整理中。</p>'}<p class="small" style="margin-top:8px"><a href="${url(`/kits/${k.slug}/`)}">材料包內容與工具建議</a></p></article>`).join("")}</div>
<p class="empty" id="tut-empty" hidden>找不到符合的材料包。可以改用編號搜尋，或直接聯絡我們。</p>
<section class="panel" style="margin-top:40px"><h2 style="font-size:1.4rem">製作卡關怎麼辦</h2><p class="muted" style="margin-top:8px">${esc(tutorials.helpText)}</p>
<div class="btn-row"><a class="btn" href="mailto:${esc(site.contact.email)}" data-track="contact" data-channel="email">寄 Email</a><a class="btn btn-ghost" href="tel:${esc(site.contact.phoneHref)}" data-track="contact" data-channel="phone">撥打 ${esc(site.contact.phone)}</a>${ext(site.contact.facebook, "Facebook 私訊", "btn btn-ghost", 'data-track="contact" data-channel="facebook"')}</div></section>
</div>`,
  });
}

// 作品集
{
  const bc = breadcrumbs([{ name: "作品集", path: "/works/" }]);
  pages["/works/"] = layout({
    path: "/works/", title: "作品集",
    description: "春豬工作室過往課程與訂製的皮革作品，作為風格與客製參考；作品展示，非現售商品。",
    ld: [bc.ld],
    body: `<div class="wrap section">${bc.html}
<p class="eyebrow">ARCHIVE</p><h1>作品集</h1>
<p class="lead">這裡收錄的是春豬過往課程與訂製作品，價格與款式可能已經變動，部分已絕版。</p>
<p class="notice" style="margin-top:20px"><strong>作品展示，非現售商品。</strong>目前可購買的材料包請見<a href="${url("/kits/")}">材料包</a>頁；想以某件作品為參考，可以<a href="${url("/custom/")}">詢問客製材料包</a>。</p>
<div class="grid grid-2" style="margin-top:28px">${site.works.map((w) => `<article class="panel"><h2 style="font-size:1.4rem">${esc(w.name)}</h2><p class="muted" style="margin-top:6px">${esc(w.note)}</p><div class="btn-row" style="margin-top:16px">${ext(w.url, "前往作品集", "btn btn-ghost")}</div></article>`).join("")}</div>
</div>`,
  });
}

// 關於
{
  const bc = breadcrumbs([{ name: "關於春豬", path: "/about/" }]);
  pages["/about/"] = layout({
    path: "/about/", title: "關於春豬",
    description: "春豬工作室由小鳥老師創立，在日本學習革鞄製作後回台，於台北青田街經營皮革工作室。",
    ld: [bc.ld, storeLd],
    body: `<div class="wrap section" style="max-width:820px">${bc.html}
<p class="eyebrow">ABOUT</p><h1>關於春豬工作室</h1>
<p class="lead" style="font-size:1.05rem">${esc(site.about.story)}</p>
<section class="panel" style="margin-top:32px"><h2 style="font-size:1.4rem">為什麼叫「春豬」</h2><p class="muted" style="margin-top:10px">${esc(site.about.nameOrigin)}</p></section>
<div class="btn-row"><a class="btn" href="${url("/kits/")}">看材料包</a><a class="btn btn-ghost" href="${url("/works/")}">看過往作品</a></div>
</div>`,
  });
}

// 課程
{
  const bc = breadcrumbs([{ name: "課程資訊", path: "/classes/" }]);
  pages["/classes/"] = layout({
    path: "/classes/", title: "課程資訊",
    description: "春豬工作室實體課程資訊。課程目前較少開設，以購買平台公告為準。",
    ld: [bc.ld],
    body: `<div class="wrap section" style="max-width:820px">${bc.html}
<p class="eyebrow">CLASSES</p><h1>課程資訊</h1>
<p class="lead">${esc(site.classes.text)}</p>
<div class="btn-row">${ext(site.classes.link, "查看開課行事曆", "btn")}<a class="btn btn-ghost" href="${url("/contact/")}">聯絡詢問</a></div>
</div>`,
  });
}

// 聯絡
{
  const bc = breadcrumbs([{ name: "聯絡", path: "/contact/" }]);
  const q = encodeURIComponent(site.contact.address);
  pages["/contact/"] = layout({
    path: "/contact/", title: "聯絡我們",
    description: `春豬工作室聯絡方式：${site.contact.address}，電話 ${site.contact.phone}，Email ${site.contact.email}。`,
    ld: [bc.ld, storeLd],
    body: `<div class="wrap section">${bc.html}
<p class="eyebrow">CONTACT</p><h1>聯絡春豬工作室</h1>
<div class="grid grid-2" style="margin-top:28px;align-items:start">
  <address class="panel">
    <p><strong>地址</strong><br>${esc(site.contact.address)}</p>
    <p><strong>電話</strong><br><a href="tel:${esc(site.contact.phoneHref)}" data-track="contact" data-channel="phone">${esc(site.contact.phone)}</a></p>
    <p><strong>Email</strong><br><a href="mailto:${esc(site.contact.email)}" data-track="contact" data-channel="email">${esc(site.contact.email)}</a></p>
    ${site.contact.hours ? `<p><strong>營業時間</strong><br>${esc(site.contact.hours)}</p>` : ""}
    <p><strong>社群</strong><br>${ext(site.contact.facebook, "Facebook", "", 'data-track="contact" data-channel="facebook"')}　${ext(site.contact.instagram, "Instagram", "", 'data-track="contact" data-channel="instagram"')}</p>
    <p class="small muted">想詢問客製材料包，請使用<a href="${url("/custom/")}">客製詢問表單</a>，資料會比較完整。</p>
  </address>
  <div class="map"><iframe title="春豬工作室位置地圖" src="https://maps.google.com/maps?q=${q}&hl=zh-TW&z=17&output=embed" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe><p class="small" style="margin-top:8px">${ext(`https://www.google.com/maps/search/?api=1&query=${q}`, "在 Google 地圖開啟")}</p></div>
</div>
</div>`,
  });
}

pages["/404.html"] = layout({ path: "/404", title: "找不到頁面", description: "找不到這個頁面。", body: `<div class="wrap section"><h1>找不到這個頁面</h1><p class="lead">頁面可能已移動。</p><div class="btn-row"><a class="btn" href="${url("/")}">回首頁</a><a class="btn btn-ghost" href="${url("/kits/")}">看材料包</a></div></div>` });

// 輸出
if (existsSync(out)) rmSync(out, { recursive: true });
for (const [p, html] of Object.entries(pages)) {
  const file = p.endsWith(".html") ? join(out, p) : join(out, p, "index.html");
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, html);
}
cpSync(join(root, "src/assets"), join(out, "assets"), { recursive: true });
cpSync(join(root, "admin"), join(out, "admin"), { recursive: true });
cpSync(join(root, "content"), join(out, "content"), { recursive: true });
writeFileSync(join(out, ".nojekyll"), "");
const routes = Object.keys(pages).filter((p) => !p.endsWith(".html"));
writeFileSync(join(out, "robots.txt"), `User-agent: *\nDisallow: ${url("/admin/")}\n${SITE_URL ? `Sitemap: ${SITE_URL}${url("/sitemap.xml")}\n` : ""}`);
if (SITE_URL) writeFileSync(join(out, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${routes.map((r) => `<url><loc>${SITE_URL}${url(r)}</loc></url>`).join("")}</urlset>\n`);
console.log(`Built ${Object.keys(pages).length} pages → dist/ (base "${BASE}")`);
