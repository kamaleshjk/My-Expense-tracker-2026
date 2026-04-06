# PWA Setup - Complete Guide

## What is PWA?

Progressive Web App - makes your web app work like a native app:
- ✅ Install on home screen
- ✅ Works offline
- ✅ Fast loading
- ✅ Push notifications (future)

## PWA Features Added

### 1. **Service Worker** (`sw.js`)
- Caches assets for offline use
- Network fallback strategy
- Background sync ready

### 2. **Manifest** (`manifest.json`)
- App metadata
- Icons (192x192, 512x512)
- Shortcuts for quick actions
- Display settings

### 3. **Icons** 
- `icon-192.svg` - Home screen icon
- `icon-512.svg` - Splash screen

### 4. **HTML Registration**
- Service worker registration script
- Install prompt handling

## How to Use

### Development
```bash
npm run dev
```

### Build & Deploy
```bash
npm run build
firebase deploy
```

## Installation on Devices

### Android
1. Open app in Chrome/Brave
2. Tap menu (⋮)
3. "Install app" appears
4. Tap to install
5. App appears on home screen

### iOS (iPhone/iPad)
1. Open in Safari
2. Tap Share button
3. "Add to Home Screen"
4. Choose icon and tap "Add"
5. Opens like native app

### Windows/macOS
1. Open in Edge/Chrome
2. Address bar shows install icon
3. Click to install
4. App opens in window

## Offline Support

The app now:
- ✅ Caches all static assets
- ✅ Works offline for viewing data
- ✅ Syncs when connection returns
- ✅ Shows cached data if offline

**Note:** Firebase Auth and data sync require internet. Transactions will queue offline.

## Checklist for PWA

- ✅ Service Worker installed
- ✅ Manifest.json configured
- ✅ HTTPS enabled (Firebase has this)
- ✅ Responsive design (Tailwind CSS)
- ✅ Icons provided
- ✅ App name and description set
- ✅ Installable on all platforms

## Testing

### Check Service Worker
1. Open DevTools (F12)
2. Go to Application → Service Workers
3. Should show "sw.js" registered

### Test Offline
1. DevTools → Network tab
2. Check "Offline" checkbox
3. App should still load cached content
4. Login/Sync will show offline

### Test Installation
1. DevTools → Application → Manifest
2. Should show valid manifest
3. Should have install prompt

## Advanced Features (Future)

```javascript
// Background sync for offline transactions
navigator.serviceWorker.ready.then(registration => {
  return registration.sync.register('sync-transactions');
});

// Push notifications
Notification.requestPermission().then(permission => {
  if (permission === 'granted') {
    // Subscribe to push
  }
});

// Periodic background sync
registration.periodicSync.register('sync-data', {
  minInterval: 24 * 60 * 60 * 1000 // 24 hours
});
```

## Troubleshooting

### Service Worker not registering
- Check browser console for errors
- Ensure HTTPS (localhost works for dev)
- Try clearing cache and service workers

### Offline doesn't work
- Check Network tab in DevTools
- Verify sw.js is cached
- Check Service Worker scope

### App won't install
- Requires HTTPS (or localhost)
- Need valid manifest.json
- Need valid icons
- Need service worker

## Firebase Hosting Setup

Your Firebase hosting automatically provides:
- ✅ HTTPS (required for PWA)
- ✅ Fast CDN
- ✅ Service worker friendly

Just deploy with `firebase deploy` and PWA features activate!

## Security

- Service worker only loads what's in cache
- No sensitive data cached (auth tokens excluded)
- Offline access only for UI and cached data
- Firebase rules still protect real data

**Your PWA is now ready!** 🚀
