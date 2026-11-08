# Snap Scroll Redux - Firefox Extension

This is the Firefox-compatible version of the Snap Scroll Redux extension.

## Changes Made for Firefox Compatibility

1. **Updated manifest.json**:
   - Added `browser_specific_settings` with Firefox-specific configuration
   - Added minimum Firefox version requirement (142.0, needed for the data_collection_permissions manifest key)
   - Added browser-polyfill.min.js to content scripts

2. **Updated JavaScript files**:
   - Changed from `chrome` API to `browser` API with fallback support
   - Made message passing compatible with Firefox's requirements
   - Added error handling for content script injection

3. **Cross-browser compatibility**:
   - Uses `browserAPI` variable that works with both Firefox and Chrome
   - Includes browser polyfill for maximum compatibility

## Required Additional File

You need to download the WebExtension browser API polyfill:

1. Download `browser-polyfill.min.js` from:
   https://github.com/mozilla/webextension-polyfill/releases/latest

2. Place it in the root directory of your extension alongside the other files

## File Structure

```
snap-scroll-redux-firefox/
├── manifest.json
├── popup.html
├── popup.css
├── popup.js
├── content.js
├── browser-polyfill.min.js  (download separately)
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

## Installation in Firefox

### Temporary Installation (for testing):
1. Open Firefox and navigate to `about:debugging`
2. Click "This Firefox" in the left sidebar
3. Click "Load Temporary Add-on"
4. Select the `manifest.json` file from your extension directory

### Permanent Installation:
1. Create a `.zip` file containing all extension files
2. Change the extension from `.zip` to `.xpi`
3. Upload to Firefox Add-ons (https://addons.mozilla.org/) or self-distribute

## Key Differences from Chrome Version

1. **Browser API**: Firefox uses `browser.*` APIs which return promises by default, while Chrome uses `chrome.*` APIs with callbacks
2. **Message Passing**: Firefox requires returning `true` from message listeners when sending responses asynchronously
3. **Content Script Injection**: Added fallback content script injection for better reliability
4. **Extension ID**: Added explicit extension ID in manifest for consistency

## Testing

The extension should work identically to the Chrome version:
- **Snap Scroll**: Hold left mouse button + right-click to scroll to that position
- **Paragraph Navigation**: Middle-click on any paragraph to jump to the next one
- **Navigation Bar Detection**: Automatically detects and accounts for fixed headers

## Browser Support

This version supports:
- Firefox 142.0 and above
- Also remains compatible with Chrome/Edge (thanks to the polyfill)

## Notes

- The `popup.css` file remains unchanged as CSS is compatible across browsers
- Icon files need to be added separately (16x16, 48x48, and 128x128 PNG files)
- The extension automatically handles differences between Firefox and Chrome APIs