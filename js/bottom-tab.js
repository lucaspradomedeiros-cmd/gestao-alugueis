(function () {
  const PRIMARY = ['dashboard', 'tenants', 'report', 'despesas'];

  function tabGo(pageId) {
    tabMoreClose();
    showPage(pageId);
    _setActiveTab(pageId);
  }

  function _setActiveTab(pageId) {
    document.querySelectorAll('.tab-btn[data-page]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.page === pageId);
    });
    const isSecondary = !PRIMARY.includes(pageId);
    document.getElementById('tab-more-btn')?.classList.toggle('active', isSecondary);
  }

  function tabMoreToggle() {
    const panel = document.getElementById('tab-more-panel');
    if (panel.classList.contains('open')) {
      tabMoreClose();
    } else {
      panel.classList.add('open');
      document.getElementById('tab-backdrop').classList.add('visible');
      document.getElementById('tab-more-icon').textContent = '✕';
      document.getElementById('tab-more-btn').classList.add('active');
    }
  }

  function tabMoreClose() {
    document.getElementById('tab-more-panel')?.classList.remove('open');
    document.getElementById('tab-backdrop')?.classList.remove('visible');
    const icon = document.getElementById('tab-more-icon');
    if (icon) icon.textContent = '···';
  }

  // Mantém tab bar sincronizada quando showPage é chamado de dentro das páginas
  const _orig = window.showPage;
  window.showPage = function (id) {
    _orig(id);
    if (window.innerWidth <= 760) _setActiveTab(id);
  };

  window.tabGo = tabGo;
  window.tabMoreToggle = tabMoreToggle;
  window.tabMoreClose = tabMoreClose;
})();
