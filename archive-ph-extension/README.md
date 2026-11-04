# Send to archive.ph (Chrome extension)

Adds three right-click menu items:

- **Archive link on archive.ph**: on any link; opens `archive.ph/submit/?url=<link>` in a new tab next to the current one, which starts a capture.
- **Open latest archive.ph snapshot of link**: opens `archive.ph/newest/<link>`, jumping to the most recent existing snapshot without making a new one.
- **Archive this page on archive.ph**: right-click anywhere on a page to capture the page you're on.

Non-web links (`mailto:`, `javascript:`, `chrome://`) are ignored. The only permission requested is `contextMenus`; no data leaves your browser except the URL you choose to send to archive.ph.

## Install

1. Open `chrome://extensions`.
2. Turn on **Developer mode** (top right).
3. Click **Load unpacked** and choose this `archive-ph-extension` folder.

To use a different mirror (archive.today, archive.is), change `ARCHIVE` at the top of `background.js` and click the reload icon on the extension card.

## Notes

archive.ph sometimes shows a CAPTCHA before accepting a capture; solve it in the new tab and the capture continues.
