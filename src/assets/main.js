(function () {
  "use strict";
  var cfg = window.HARUI || {};

  // GA4：只在店家設定追蹤碼後才送事件；不含任何個資或表單內容
  function track(name, params) {
    if (cfg.ga && typeof window.gtag === "function") window.gtag("event", name, params || {});
  }

  // 手機選單
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.getElementById("site-nav");
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", String(open));
      toggle.textContent = open ? "關閉" : "選單";
    });
  }

  // 點擊追蹤
  document.addEventListener("click", function (e) {
    var a = e.target.closest("[data-track]");
    if (!a) return;
    var kind = a.getAttribute("data-track");
    if (kind === "buy") track("click_buy_external", { item: a.getAttribute("data-item") || "" });
    if (kind === "contact") track("click_contact", { channel: a.getAttribute("data-channel") || "" });
    if (kind === "tutorial") track("click_tutorial", { page: location.pathname });
  });

  // 材料包篩選
  var filters = document.getElementById("kit-filters");
  if (filters) {
    var apply = function () {
      var f = new FormData(filters), shown = 0;
      document.querySelectorAll("[data-kit]").forEach(function (card) {
        var ok = (!f.get("type") || card.dataset.type === f.get("type")) &&
          (!f.get("punched") || card.dataset.punched.split(" ").indexOf(f.get("punched")) > -1) &&
          (!f.get("color") || card.dataset.color.split(" ").indexOf(f.get("color")) > -1) &&
          (!f.get("difficulty") || card.dataset.difficulty === f.get("difficulty"));
        card.hidden = !ok; if (ok) shown++;
      });
      document.getElementById("kit-empty").hidden = shown > 0;
    };
    filters.addEventListener("change", apply);
  }

  // 材料包詳情：版本切換
  var detail = document.querySelector("[data-detail]");
  if (detail) {
    var variants = JSON.parse(detail.getAttribute("data-variants"));
    track("view_kit", { item: detail.getAttribute("data-kit-name") });
    var setVariant = function (i) {
      var v = variants[i];
      var img = document.getElementById("v-image");
      img.src = v.image; img.alt = detail.getAttribute("data-kit-name") + "（" + v.name + "）";
      document.getElementById("v-price").textContent = v.price;
      document.getElementById("v-tool").textContent = v.toolTip;
      document.getElementById("v-contents").innerHTML = v.contents.map(function (c) { var li = document.createElement("li"); li.textContent = c; return li.outerHTML; }).join("");
      var ask = (cfg.base || "") + "/custom/?ref=" + encodeURIComponent(v.ref);
      ["v-buy", "m-buy"].forEach(function (id) { var a = document.getElementById(id); if (a) { a.href = v.buyUrl; a.setAttribute("data-item", v.ref); } });
      ["v-ask", "m-ask"].forEach(function (id) { var a = document.getElementById(id); if (a) a.href = ask; });
      document.querySelectorAll(".variant").forEach(function (b) { b.setAttribute("aria-pressed", String(Number(b.dataset.index) === i)); });
    };
    document.querySelectorAll(".variant").forEach(function (b) {
      b.addEventListener("click", function () { setVariant(Number(b.dataset.index)); });
    });
  }

  // 教學搜尋
  var tq = document.getElementById("tut-q");
  if (tq) {
    var runTut = function () {
      var q = tq.value.trim().toLowerCase().replace(/\s+/g, ""), shown = 0;
      document.querySelectorAll("[data-tut]").forEach(function (el) {
        var ok = !q || el.dataset.search.replace(/\s+/g, "").indexOf(q) > -1;
        el.hidden = !ok; if (ok) shown++;
      });
      document.getElementById("tut-empty").hidden = shown > 0;
    };
    var pre = new URLSearchParams(location.search).get("q");
    if (pre) tq.value = pre;
    tq.addEventListener("input", runTut); runTut();
  }

  // 客製詢問表單
  var form = document.getElementById("inquiry");
  if (!form) return;
  var ref = new URLSearchParams(location.search).get("ref");
  if (ref) form.reference.value = ref.slice(0, 200);
  var today = new Date(); today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
  var todayStr = today.toISOString().slice(0, 10);
  form.desiredDate.min = todayStr;

  var started = false;
  form.addEventListener("input", function () { if (!started) { started = true; track("custom_form_start", {}); } });

  var MAX_FILES = 3, MAX_SIZE = 3 * 1024 * 1024, TYPES = ["image/jpeg", "image/png", "image/webp"];
  var thumbs = document.getElementById("thumbs");
  form.images.addEventListener("change", function () {
    thumbs.innerHTML = "";
    Array.prototype.slice.call(form.images.files, 0, MAX_FILES).forEach(function (f) {
      if (TYPES.indexOf(f.type) < 0) return;
      var img = document.createElement("img"); img.alt = f.name; img.src = URL.createObjectURL(f); thumbs.appendChild(img);
    });
    validateField("images");
  });

  function fieldBox(name) {
    var el = form.querySelector('[name="' + name + '"]');
    return el ? el.closest(".field") : null;
  }
  function setErr(name, msg) {
    var box = fieldBox(name); if (!box) return;
    box.classList.toggle("invalid", Boolean(msg));
    var p = box.querySelector(".error"); if (p) p.textContent = msg || "";
  }
  var phoneRe = /^(09\d{8}|0[2-8]\d{7,8}|\+8869\d{8}|\+886[2-8]\d{7,8})$/;
  var emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  function clean(v) { return String(v || "").trim(); }
  function phoneVal() { return clean(form.phone.value).replace(/[\s()-]/g, ""); }

  function validateField(name) {
    var msg = "";
    var email = clean(form.email.value), phone = phoneVal();
    switch (name) {
      case "name": if (!clean(form.name.value)) msg = "請填寫姓名"; break;
      case "email":
        if (email && !emailRe.test(email)) msg = "Email 格式不正確";
        else if (!email && !phone) msg = "Email 與電話至少填一項";
        break;
      case "phone":
        if (phone && !phoneRe.test(phone)) msg = "請填台灣電話，例如 0912345678 或 0223216931";
        break;
      case "preferred":
        var pref = form.querySelector('[name="preferred"]:checked');
        if (!pref) msg = "請選擇聯絡方式";
        else if (pref.value === "Email" && !email) msg = "選擇以 Email 聯絡時，請填寫 Email";
        else if (pref.value === "電話" && !phone) msg = "選擇以電話聯絡時，請填寫電話";
        break;
      case "reference": if (!clean(form.reference.value)) msg = "請填寫參考款式或編號"; break;
      case "changes": if (clean(form.changes.value).length < 10) msg = "請至少寫 10 個字，說明想調整的地方"; break;
      case "experience": if (!form.querySelector('[name="experience"]:checked')) msg = "請選擇手作經驗"; break;
      case "desiredDate": if (form.desiredDate.value && form.desiredDate.value < todayStr) msg = "期望日期不能早於今天"; break;
      case "images":
        var files = Array.prototype.slice.call(form.images.files);
        if (files.length > MAX_FILES) msg = "最多上傳 3 張圖片";
        else if (files.some(function (f) { return TYPES.indexOf(f.type) < 0; })) msg = "只接受 JPG、PNG 或 WebP 圖片";
        else if (files.some(function (f) { return f.size > MAX_SIZE; })) msg = "每張圖片需在 3MB 以內";
        break;
      case "consent": if (!form.consent.checked) msg = "請勾選同意，店家才能回覆你"; break;
    }
    setErr(name, msg);
    return !msg;
  }
  var names = ["name", "email", "phone", "preferred", "reference", "changes", "experience", "desiredDate", "images", "consent"];
  form.addEventListener("focusout", function (e) { if (e.target.name && names.indexOf(e.target.name) > -1) validateField(e.target.name); });
  form.addEventListener("change", function (e) { if (e.target.type === "radio" || e.target.type === "checkbox") validateField(e.target.name); });

  function readFile(f) {
    return new Promise(function (res, rej) {
      var r = new FileReader();
      r.onload = function () { res({ name: f.name, type: f.type, data: String(r.result).split(",")[1] }); };
      r.onerror = rej; r.readAsDataURL(f);
    });
  }

  var status = document.getElementById("form-status");
  var btn = document.getElementById("submit-btn");
  function show(kind, html) { status.hidden = false; status.className = "status " + kind; status.innerHTML = html; }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    status.hidden = true;
    var ok = names.map(validateField).every(Boolean);
    if (!ok) {
      var first = form.querySelector(".field.invalid input, .field.invalid textarea");
      if (first) first.focus();
      show("fail", "還有欄位需要修正，請看紅字提示。");
      return;
    }
    if (form.website.value) return; // 機器人陷阱
    if (!cfg.endpoint) {
      show("fail", "<strong>預覽版尚未接通：</strong>這份詢問<strong>沒有</strong>送到店家。請改以 Email 或電話聯絡春豬工作室。");
      return;
    }
    btn.disabled = true; btn.textContent = "送出中…";
    Promise.all(Array.prototype.slice.call(form.images.files).map(readFile)).then(function (images) {
      var payload = {
        name: clean(form.name.value), email: clean(form.email.value), phone: phoneVal(),
        preferred: form.querySelector('[name="preferred"]:checked').value,
        reference: clean(form.reference.value), changes: clean(form.changes.value),
        experience: form.querySelector('[name="experience"]:checked').value,
        tools: Array.prototype.map.call(form.querySelectorAll('[name="tools"]:checked'), function (c) { return c.value; }),
        desiredDate: form.desiredDate.value, notes: clean(form.notes.value), consent: true,
        page: location.href, images: images
      };
      return fetch(cfg.endpoint, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(payload) });
    }).then(function (r) { return r.json(); }).then(function (data) {
      if (!data || data.ok !== true) throw new Error((data && data.error) || "save failed");
      track("custom_form_submit", {});
      form.reset(); thumbs.innerHTML = "";
      show("ok", "<strong>詢問已送出。</strong>編號 " + String(data.id).replace(/[^\w-]/g, "") + "。這不是訂單，春豬工作室確認後會依你留的聯絡方式回覆。");
    }).catch(function () {
      show("fail", "<strong>送出失敗，資料沒有送到店家。</strong>請稍後再按一次「送出詢問」，或直接以 Email／電話聯絡我們。你填的內容仍保留在表單中。");
    }).then(function () { btn.disabled = false; btn.textContent = "送出詢問"; });
  });
})();
