// ===== 메타(페이스북·인스타) 픽셀 =====
// ★ 픽셀 ID는 바로 아래 한 줄만 바꾸면 됩니다. (이벤트 관리자 → 데이터 세트의 숫자 ID)
// ★ 비워 두면('') 아무것도 하지 않습니다 — 메타 스크립트도 불러오지 않고, 어떤 요청도 나가지 않습니다.
var META_PIXEL_ID = '';

// 규칙 (2026-10-18)
// - 이름·전화·이메일 같은 개인정보는 절대 넘기지 않는다. 금액·상품 ID·주문번호만.
// - autoConfig 끔: 메타가 버튼 글자·폼 내용을 스스로 긁어 가지 않게.
// - 메인 사이트(salesscript)에도 같은 파일이 있음 — 두 사이트 ID를 같은 값으로 맞출 것.
// - 페이지에서 부를 때는 항상 window.AuraPixel && AuraPixel.track(...) 처럼 (파일이 없어도 오류 없게).
(function (w, d) {
  var id = String(META_PIXEL_ID || '').replace(/\D/g, '');
  var on = id.length >= 10;
  var loaded = false, waiters = [];

  function done() {
    loaded = true;
    var list = waiters; waiters = [];
    list.forEach(function (f) { try { f(); } catch (e) {} });
  }

  var api = {
    on: on,
    // 이벤트 보내기. eventId 를 주면 메타가 같은 ID 이벤트를 한 번으로 셈(주문번호 등)
    track: function (name, params, eventId) {
      if (!on || typeof w.fbq !== 'function') { return false; }
      if (eventId) { w.fbq('track', name, params || {}, { eventID: String(eventId) }); }
      else { w.fbq('track', name, params || {}); }
      return true;
    },
    // 같은 key 로는 이 브라우저에서 한 번만 (새로고침·뒤로가기 중복 방지)
    once: function (key, name, params, eventId) {
      if (!on) { return false; }
      var k = 'aura_px_once_' + key;
      try { if (w.localStorage.getItem(k)) { return false; } } catch (e) {}
      var ok = api.track(name, params, eventId);
      if (ok) { try { w.localStorage.setItem(k, String(Date.now())); } catch (e) {} }
      return ok;
    },
    // 페이지를 닫거나 이동하기 전에 이벤트가 나갈 시간을 줌. 픽셀이 꺼져 있으면 바로 실행
    whenSent: function (cb, maxMs) {
      var called = false;
      function go() { if (!called) { called = true; cb(); } }
      if (!on) { setTimeout(go, 0); return; }
      setTimeout(go, maxMs || 2000);
      var after = function () { setTimeout(go, 500); };
      if (loaded) { after(); } else { waiters.push(after); }
    }
  };
  w.AuraPixel = api;
  if (!on || w.fbq) { return; }

  // 메타 기본 코드와 같은 동작 (스크립트 불러오기 전까지 호출을 줄 세워 둠)
  var n = w.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
  if (!w._fbq) { w._fbq = n; }
  n.push = n; n.loaded = true; n.version = '2.0'; n.queue = [];
  var s = d.createElement('script');
  s.async = true;
  s.src = 'https://connect.facebook.net/en_US/fbevents.js';
  s.onload = done; s.onerror = done;
  (d.head || d.getElementsByTagName('script')[0].parentNode).appendChild(s);

  w.fbq('set', 'autoConfig', false, id);
  w.fbq('init', id);
  w.fbq('track', 'PageView');
})(window, document);
