# Testing Guide - Noise Dosimeter PWA

## Quick Start

1. **Start the server**:
   ```bash
   cd noise-dosimeter
   ./start.sh
   ```
   Or manually:
   ```bash
   python3 -m http.server 8000
   ```

2. **Open in browser**:
   - Navigate to `http://localhost:8000`
   - Use Safari on macOS for best sensor support
   - Chrome/Edge also work well

## Testing Checklist

### ✅ Initial Setup
- [ ] Page loads without errors
- [ ] UI displays correctly
- [ ] Responsive design works on different screen sizes
- [ ] Permission banner appears

### ✅ Permissions & Initialization
- [ ] Click "Enable Access" button
- [ ] Microphone permission dialog appears
- [ ] Permission granted successfully
- [ ] Permission banner disappears after granting

### ✅ Audio Monitoring
- [ ] Click "Start" button
- [ ] Current dB level updates in real-time
- [ ] Make noise (speak, clap, play music) - level should change
- [ ] Meter bar fills based on noise level
- [ ] Status text updates (Quiet, Moderate, Loud, etc.)

### ✅ Dosimetry Calculation
- [ ] Daily dose percentage updates
- [ ] Dose circle fills as exposure increases
- [ ] Exposure time counter increments
- [ ] Safe time remaining decreases appropriately
- [ ] Peak level is tracked correctly

### ✅ Sensor Integration
- [ ] Motion sensor shows status (if available)
- [ ] Light sensor shows lux value (if available)
- [ ] Context detection updates (Office, Outdoor, etc.)
- [ ] Environmental context display updates

### ✅ Data Visualization
- [ ] Chart displays on page load
- [ ] Switch between Day/Week/Month tabs
- [ ] Chart updates when tab is changed
- [ ] Data points render correctly

### ✅ Settings
- [ ] Click settings icon (⚙️)
- [ ] Modal opens
- [ ] Change threshold (85/90/80 dB)
- [ ] Toggle audio warnings
- [ ] Toggle push notifications
- [ ] Adjust calibration offset
- [ ] Close modal

### ✅ Warning System
- [ ] Expose app to loud noise (>85 dB)
- [ ] Warning toast appears
- [ ] Audio alert plays (if enabled)
- [ ] Warning at 100% dose
- [ ] Critical warning at 150% dose

### ✅ Data Persistence
- [ ] Stop and restart monitoring
- [ ] Refresh page
- [ ] Data persists (dose, peak level, etc.)
- [ ] Chart shows historical data
- [ ] Settings are remembered

### ✅ Export & Clear Data
- [ ] Click "Export Data" in settings
- [ ] JSON file downloads
- [ ] File contains exposure records and summaries
- [ ] Click "Clear All Data"
- [ ] Confirm dialog appears
- [ ] All data is cleared after confirmation

### ✅ PWA Features
- [ ] Service worker registers (check DevTools)
- [ ] App works offline (disable network, reload)
- [ ] Install prompt appears (browser dependent)
- [ ] App can be installed to home screen
- [ ] Installed app launches standalone

### ✅ Offline Functionality
- [ ] Start monitoring while online
- [ ] Disconnect network
- [ ] App continues to work
- [ ] Data saves locally
- [ ] Reconnect - no data loss

### ✅ Cross-Browser Testing
- [ ] Safari (macOS/iOS) - Best sensor support
- [ ] Chrome (Desktop/Mobile)
- [ ] Firefox
- [ ] Edge

### ✅ Mobile Testing
- [ ] Open on iPhone/iPad
- [ ] Open on Android device
- [ ] Touch interactions work
- [ ] Install as PWA on mobile
- [ ] Background monitoring (limitations expected)

## Known Limitations

### Sensor Support
- **Accelerometer**: Widely supported on mobile, limited on desktop
- **Ambient Light**: Limited browser support, may show "--"
- **Generic Sensor API**: Requires HTTPS (except localhost)

### Audio Measurement
- **Not Calibrated**: dB SPL values are estimates
- **Device Dependent**: Different devices have different microphone sensitivities
- **Background Noise**: Picks up all ambient sound, not just harmful noise

### PWA Constraints
- **HTTPS Required**: For production deployment (localhost works for testing)
- **Storage Limits**: IndexedDB has quota limits (usually several GB)
- **Background Limitations**: Mobile OS may limit background execution

## Testing Scenarios

### Scenario 1: Daily Commute Simulation
1. Start monitoring
2. Play traffic noise from YouTube (~75 dB)
3. Observe dose accumulation over time
4. Context should show appropriate environment
5. Stop monitoring
6. Check daily summary

### Scenario 2: Office Environment
1. Start monitoring in quiet room
2. Observe low noise levels (40-50 dB)
3. Play music at moderate volume (70-80 dB)
4. Check that dose increases slowly
5. Review hourly breakdown in chart

### Scenario 3: Loud Event
1. Start monitoring
2. Play loud music or video (>90 dB)
3. Warning should appear quickly
4. Dose should increase rapidly
5. Check that safe time remaining decreases fast

### Scenario 4: Multi-Day Tracking
1. Use app for several days
2. Check weekly chart
3. Verify historical data
4. Export data and review JSON
5. Ensure data integrity

## Performance Testing

### Metrics to Check
- [ ] Page load time < 2 seconds
- [ ] UI updates are smooth (60 fps)
- [ ] No memory leaks during extended use
- [ ] Battery usage is reasonable
- [ ] CPU usage stays moderate

### Tools
- Chrome DevTools → Performance tab
- Safari Web Inspector → Timelines
- Lighthouse audit for PWA score
- Memory profiler for leak detection

## Debugging

### Common Issues

**Microphone not working:**
```
Check: Browser console for errors
Check: System microphone permissions
Check: HTTPS connection (or localhost)
Solution: Try different browser
```

**Sensors showing "--":**
```
Check: Browser compatibility
Check: HTTPS connection
Note: Sensors are optional, app works without them
Solution: Expected on some devices/browsers
```

**Data not persisting:**
```
Check: Browser console for IndexedDB errors
Check: Available storage space
Check: Private/Incognito mode (may limit storage)
Solution: Clear browser cache and retry
```

**PWA not installing:**
```
Check: HTTPS connection
Check: manifest.json loads correctly
Check: Service worker registers
Check: Browser supports PWA
Solution: Deploy to HTTPS host
```

## Browser DevTools Checks

### Console
```javascript
// Check if modules loaded
console.log(storage, dosimetry, audioProcessor, sensorFusion, app);

// Check current dose
console.log(dosimetry.getSummary());

// Check sensor data
console.log(sensorFusion.getData());

// Check audio status
console.log(audioProcessor.getStatus());
```

### Application Tab
- Check IndexedDB → NoiseDosimeterDB
- Check Service Workers → sw.js registered
- Check Manifest → manifest.json valid
- Check Storage → Usage

### Network Tab
- Verify all resources load (200 status)
- Check service worker intercepts requests
- Verify offline functionality

## Accessibility Testing

- [ ] Keyboard navigation works
- [ ] Screen reader compatibility
- [ ] Color contrast meets WCAG standards
- [ ] Focus indicators visible
- [ ] Alternative text for icons

## Security Testing

- [ ] No external scripts loaded
- [ ] No data sent to external servers
- [ ] All data stored locally
- [ ] No XSS vulnerabilities
- [ ] HTTPS enforced in production

## Test Results Template

```
Test Date: _______________
Browser: _________________
Device: __________________
OS: ______________________

Results:
✓ All core features working
✓ Audio monitoring accurate
✓ Data persistence functional
✓ PWA installable
⚠ Sensors partially available
⚠ Calibration needed for accuracy

Notes:
_________________________
_________________________
_________________________
```

## Reporting Issues

If you find bugs or issues:

1. Check browser console for errors
2. Note browser and OS version
3. List steps to reproduce
4. Capture screenshots if relevant
5. Check if issue persists in different browser

## Success Criteria

The app is working correctly if:
- ✅ Audio levels update in real-time
- ✅ Dose calculation follows NIOSH formula
- ✅ Data persists across sessions
- ✅ UI is responsive and intuitive
- ✅ Warnings appear at appropriate thresholds
- ✅ Works offline after initial load
- ✅ Can be installed as PWA

---

**Happy Testing!** 🔊🛡️
