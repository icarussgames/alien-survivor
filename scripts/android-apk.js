// Loaded only inside the Capacitor APK.
(function () {
  function bind() {
    var Cap = window.Capacitor;
    if (!Cap || typeof Cap.isNativePlatform !== 'function' || !Cap.isNativePlatform()) return;
    var App = Cap.Plugins && Cap.Plugins.App;
    if (!App || typeof App.addListener !== 'function') return;
    App.addListener('backButton', function () {
      if (typeof screen === 'undefined') { App.exitApp(); return; }
      if (screen === 'level') return;
      if (screen === 'itemMode') { setScreen('menu'); return; }
      if (screen === 'shop' || screen === 'gal' || screen === 'lib') {
        setScreen(typeof backScreen !== 'undefined' && backScreen === 'over' ? 'over' : 'menu');
        return;
      }
      if (screen === 'stage' && typeof exitStageToMenu === 'function') { exitStageToMenu(); return; }
      if (screen === 'over' || screen === 'play') { setScreen('menu'); return; }
      App.exitApp();
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
})();
