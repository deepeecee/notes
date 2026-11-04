// archive.ph endpoints:
//   /submit/?url=<url>  asks archive.ph to capture the URL now
//   /newest/<url>       redirects to the most recent existing snapshot
const ARCHIVE = "https://archive.ph";

const MENUS = [
  { id: "archive-link", title: "Archive link on archive.ph", contexts: ["link"] },
  { id: "newest-link", title: "Open latest archive.ph snapshot of link", contexts: ["link"] },
  { id: "archive-page", title: "Archive this page on archive.ph", contexts: ["page"] }
];

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    for (const m of MENUS) chrome.contextMenus.create(m);
  });
});

function archiveUrl(menuId, target) {
  if (menuId === "newest-link") return `${ARCHIVE}/newest/${target}`;
  return `${ARCHIVE}/submit/?url=${encodeURIComponent(target)}`;
}

chrome.contextMenus.onClicked.addListener((info, tab) => {
  const target = info.menuItemId === "archive-page" ? info.pageUrl : info.linkUrl;
  if (!target || !/^https?:/i.test(target)) return; // skip javascript:, mailto:, chrome://, etc.

  chrome.tabs.create({
    url: archiveUrl(info.menuItemId, target),
    index: tab ? tab.index + 1 : undefined,
    openerTabId: tab ? tab.id : undefined
  });
});
