const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 96, height: 96 } });
  await pg.setContent(`<html><body style="margin:0;background:transparent"><svg width="96" height="96" viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg">
    <path fill="#fff" fill-rule="evenodd" d="M48 8c-16.6 0-30 13.1-30 29.4C18 60 48 88 48 88s30-28 30-50.6C78 21.1 64.6 8 48 8zm0 17a12.5 12.5 0 1 1 0 25a12.5 12.5 0 0 1 0-25z"/></svg></body></html>`);
  await pg.screenshot({ path: '/home/claude/turkiye-gezi-android/assets/notification-icon.png', omitBackground: true });
  await b.close();
})();
