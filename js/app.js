/* ============================================================
   MING FIT — APP 入口
   全局错误兜底 · 初始化
   ============================================================ */

(function() {
  // 全局错误兜底：任何未捕获异常都不允许整屏白屏
  window.addEventListener('error', function (e) {
    console.error('[MING FIT] uncaught error:', e.message);
    if (UI && UI.app && typeof UI.renderFatal === 'function') {
      // 只在主区域还空着时介入，避免反复覆盖
      if (!document.querySelector('.tabbar')) {
        UI.renderFatal(e.error || e.message);
      }
    }
  });

  window.addEventListener('unhandledrejection', function (e) {
    console.error('[MING FIT] unhandled rejection:', e.reason);
  });

  // 开发调试模式：URL 带 ?debug=1 或 localStorage 标记时开启
  const debugOn = /[?&]debug=1/.test(location.search) || localStorage.getItem('MING_DEBUG') === '1';
  if (debugOn) UI._debugActive = true;

  document.addEventListener('DOMContentLoaded', function () {
    try {
      UI.init();
    } catch (e) {
      console.error('[MING FIT] init error:', e);
      if (UI && UI.app && typeof UI.renderFatal === 'function') UI.renderFatal(e);
    }
  });
})();
