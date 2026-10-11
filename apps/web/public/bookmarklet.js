/* Geki Arena スコア提出ブックマークレット本体(bookmarklet.v1)。ongeki-net.com 上で実行される。 */
(function () {
  "use strict";

  var script = document.currentScript;
  if (!script || !script.src) return;
  var SITE_ORIGIN = new URL(script.src).origin;
  var NET_BASE = "https://ongeki-net.com/ongeki-mobile/";
  var SCHEMA = "bookmarklet.v1";
  var DETAIL_CONCURRENCY = 2;
  var READY_TIMEOUT_MS = 15000;
  var OVERLAY_ID = "geki-arena-overlay";

  var DIFFICULTY_BY_FILE = {
    "diff_basic.png": "BASIC",
    "diff_advanced.png": "ADVANCED",
    "diff_expert.png": "EXPERT",
    "diff_master.png": "MASTER",
    "diff_lunatic.png": "LUNATIC",
  };

  var SINGULARITY_BY_JACKET = {
    "https://ongeki-net.com/ongeki-mobile/img/music/9cc53da5e1896b30.png": "Singularity - ETIA.「Arcaea」",
    "https://ongeki-net.com/ongeki-mobile/img/music/19bdf34c7aed1ee0.png": "Singularity - SEGA SOUND STAFF「セガNET麻雀 MJ」",
    "https://ongeki-net.com/ongeki-mobile/img/music/ac5cab7a8a61d825.png": "Singularity - technoplanet",
  };

  // ---- UI ----
  var old = document.getElementById(OVERLAY_ID);
  if (old) old.remove();

  var overlay = document.createElement("div");
  overlay.id = OVERLAY_ID;
  overlay.style.cssText =
    "position:fixed;inset:0;z-index:2147483647;background:rgba(0,0,0,.7);display:flex;align-items:center;justify-content:center;padding:16px;font-family:sans-serif";
  var panel = document.createElement("div");
  panel.style.cssText =
    "background:#fff;color:#111;border-radius:12px;padding:20px;width:100%;max-width:360px;box-sizing:border-box";
  overlay.appendChild(panel);
  document.body.appendChild(overlay);

  function clear() {
    while (panel.firstChild) panel.removeChild(panel.firstChild);
  }

  function addText(text, bold) {
    var p = document.createElement("p");
    p.textContent = text;
    p.style.cssText = "margin:0 0 12px;font-size:14px;line-height:1.5;" + (bold ? "font-weight:bold;font-size:16px;" : "");
    panel.appendChild(p);
  }

  function addButton(label, onClick, secondary) {
    var b = document.createElement("button");
    b.type = "button";
    b.textContent = label;
    b.style.cssText =
      "display:block;width:100%;min-height:44px;margin-top:8px;border-radius:8px;font-size:14px;cursor:pointer;border:1px solid #888;" +
      (secondary ? "background:#fff;color:#111;" : "background:#c2185b;color:#fff;border-color:#c2185b;");
    b.addEventListener("click", onClick);
    panel.appendChild(b);
  }

  function close() {
    overlay.remove();
  }

  function showMessage(title, message) {
    clear();
    addText(title, true);
    addText(message);
    addButton("閉じる", close, true);
  }

  function setProgress(message) {
    clear();
    addText("Geki Arena", true);
    addText(message);
  }

  function showError(message) {
    showMessage("処理を中断しました", message);
  }

  // ---- 取得 ----
  function toNumber(text) {
    var n = parseInt(String(text).replace(/,/g, "").trim(), 10);
    if (isNaN(n)) throw new Error("数値の取得に失敗しました");
    return n;
  }

  function toIsoJst(text) {
    var m = /^(\d{4})\/(\d{2})\/(\d{2})\s+(\d{1,2}):(\d{2})/.exec(text.trim());
    if (!m) throw new Error("プレイ日時の形式が不正です");
    return m[1] + "-" + m[2] + "-" + m[3] + "T" + ("0" + m[4]).slice(-2) + ":" + m[5] + ":00+09:00";
  }

  function fetchDocument(path) {
    return fetch(NET_BASE + path, { credentials: "include" }).then(function (res) {
      if (!res.ok) throw new Error("オンゲキNETからの取得に失敗しました(" + res.status + ")");
      return res.text().then(function (html) {
        return new DOMParser().parseFromString(html, "text/html");
      });
    });
  }

  function textOf(root, selector) {
    var el = root.querySelector(selector);
    if (!el) throw new Error("ページ構造が想定と異なります(" + selector + ")");
    return el.textContent;
  }

  /** 履歴ブロック(div.m_10)から一覧・詳細共通の属性を取得する。 */
  function parseBasic(block) {
    var diffImg = block.querySelector("img");
    var diffFile = diffImg ? new URL(diffImg.src, NET_BASE).pathname.split("/").pop() : "";
    var difficulty = DIFFICULTY_BY_FILE[diffFile];
    if (!difficulty) throw new Error("難易度の判別に失敗しました");

    var jacket = block.querySelector("img.m_5.f_l");
    if (!jacket) throw new Error("ジャケット画像の取得に失敗しました");
    var jacketImageUrl = new URL(jacket.getAttribute("src"), NET_BASE).href;

    var title = textOf(block, "div.m_5.l_h_10.break").trim();
    if (SINGULARITY_BY_JACKET[jacketImageUrl]) title = SINGULARITY_BY_JACKET[jacketImageUrl];

    return {
      title: title,
      difficulty: difficulty,
      playDateTime: toIsoJst(textOf(block, "span.f_r.f_12.h_10")),
      // 記録更新時はクラス名が technical_score_block_new になる
      technicalScore: toNumber(textOf(block, "td[class^='technical_score_block'] .f_20")),
      jacketImageUrl: jacketImageUrl,
    };
  }

  function fetchPlaylog() {
    return fetchDocument("record/playlog/").then(function (doc) {
      var blocks = Array.prototype.slice.call(doc.querySelectorAll("div.m_10")).filter(function (b) {
        return b.querySelector("form input[name='idx']");
      });
      if (blocks.length === 0) {
        var e = new Error("プレイ履歴を取得できませんでした。オンゲキNETにログインしているか確認してください。");
        e.notLoggedIn = true;
        throw e;
      }
      return blocks.map(function (block) {
        var play = parseBasic(block);
        play.idx = block.querySelector("form input[name='idx']").value;
        return play;
      });
    });
  }

  function parseBell(text) {
    var parts = text.split("/");
    if (parts.length !== 2) throw new Error("BELL数の形式が不正です");
    return { obtained: toNumber(parts[0]), total: toNumber(parts[1]) };
  }

  function fetchDetail(idx) {
    return fetchDocument("record/playlogDetail/?idx=" + encodeURIComponent(idx)).then(function (doc) {
      var area = doc.querySelector("div.m_10.t_r.f_12");
      var table = area && area.querySelector("table.score_detail_table");
      if (!table) throw new Error("ページ構造が想定と異なります(score_detail_table)");
      var firstCell = table.querySelector("tr td");
      if (!firstCell) throw new Error("最大コンボ数の取得に失敗しました");
      return {
        maxCombo: toNumber(firstCell.textContent),
        criticalBreak: toNumber(textOf(table, "tr.score_critical_break td")),
        break: toNumber(textOf(table, "tr.score_break td")),
        hit: toNumber(textOf(table, "tr.score_hit td")),
        miss: toNumber(textOf(table, "tr.score_miss td")),
        bell: parseBell(textOf(table, "tr.score_bell td")),
        damage: toNumber(textOf(table, "tr.score_damage td")),
      };
    });
  }

  /** 同時実行数を制限して詳細ページを取得する。 */
  function attachDetails(plays, onProgress) {
    var next = 0;
    var done = 0;
    function worker() {
      if (next >= plays.length) return Promise.resolve();
      var play = plays[next++];
      return fetchDetail(play.idx).then(function (detail) {
        play.detail = detail;
        onProgress(++done, plays.length);
        return worker();
      });
    }
    var workers = [];
    for (var i = 0; i < DETAIL_CONCURRENCY; i++) workers.push(worker());
    return Promise.all(workers).then(function () {
      return plays;
    });
  }

  function fetchCourseSongs() {
    return fetch(SITE_ORIGIN + "/api/courses/songs").then(function (res) {
      if (!res.ok) throw new Error("コース楽曲の取得に失敗しました(" + res.status + ")");
      return res.json().then(function (body) {
        return body.songs || [];
      });
    });
  }

  // ---- 送信 ----
  function send(payload) {
    setProgress("提出確認ページを開いています...");
    var target = window.open(SITE_ORIGIN + "/score-submissions/receive", "_blank");
    if (!target) {
      showError("ポップアップがブロックされました。許可して再実行してください。");
      return;
    }
    var timer = setTimeout(function () {
      window.removeEventListener("message", onMessage);
      showError("提出確認ページからの応答がありませんでした。再実行してください。");
    }, READY_TIMEOUT_MS);

    function onMessage(event) {
      if (event.origin !== SITE_ORIGIN || event.source !== target) return;
      if (!event.data || event.data.type !== "geki-arena:ready") return;
      clearTimeout(timer);
      window.removeEventListener("message", onMessage);
      target.postMessage(payload, SITE_ORIGIN);
      showMessage("送信しました", "開いたタブで提出内容を確認してください。");
    }
    window.addEventListener("message", onMessage);
  }

  function run(mode) {
    var job;
    if (mode === "course") {
      setProgress("コース楽曲を取得しています...");
      job = Promise.all([fetchCourseSongs(), fetchPlaylog()]).then(function (results) {
        var keys = {};
        results[0].forEach(function (s) {
          keys[s.title + "\u0000" + s.difficulty] = true;
        });
        var targets = results[1].filter(function (p) {
          return keys[p.title + "\u0000" + p.difficulty];
        });
        return attachDetails(targets, function (done, total) {
          setProgress("プレイ詳細を取得しています(" + done + "/" + total + ")");
        });
      });
    } else {
      setProgress("プレイ履歴を取得しています...");
      job = fetchPlaylog();
    }

    job
      .then(function (plays) {
        plays.forEach(function (p) {
          if (!p.detail) delete p.detail;
        });
        send({ schema: SCHEMA, mode: mode, plays: plays });
      })
      .catch(function (err) {
        showError(err && err.message ? err.message : "予期しないエラーが発生しました。");
      });
  }

  // ---- 開始 ----
  if (location.origin !== "https://ongeki-net.com" || location.pathname.indexOf("/ongeki-mobile/") !== 0) {
    showMessage("実行場所が違います", "オンゲキNET(ongeki-net.com)にログインした状態で実行してください。");
    return;
  }
  var path = location.pathname;
  if (path === "/ongeki-mobile/" || path.indexOf("/ongeki-mobile/aimeList/") === 0) {
    showMessage("ログインしてください", "オンゲキNETにログインしてから、もう一度実行してください。");
    return;
  }

  clear();
  addText("Geki Arena スコア提出", true);
  addText("提出するスコアの種類を選択してください。");
  addButton("大会・1v1", function () {
    run("tournament");
  });
  addButton("コース", function () {
    run("course");
  });
  addButton("キャンセル", close, true);
})();
