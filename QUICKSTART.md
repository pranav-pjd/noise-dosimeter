# Quick Start Guide

## 🚀 Get Started in 3 Steps

### Step 1: Start the Server

Open Terminal and run:

```bash
cd "/Users/pjd/BITS/Y4/Y4S1/BITS F364 Human Computer Interaction HCI/Project/Project Proposal/noise-dosimeter"
./start.sh
```

### Step 2: Open in Browser

Navigate to: **http://localhost:8000**

We recommend using **Safari** on macOS for best sensor support.

### Step 3: Grant Permissions

1. Click "Enable Access" button
2. Allow microphone access when prompted
3. Click "Start" to begin monitoring

## 🎯 What You'll See

- **Current Noise Level**: Real-time dB measurement
- **Daily Dose**: Percentage of safe daily exposure
- **Environmental Context**: Office, outdoor, vehicle, etc.
- **Exposure History**: Charts showing daily/weekly/monthly trends

## ⚙️ Key Features to Try

### Real-Time Monitoring
- Speak, play music, or make noise
- Watch the meter respond in real-time
- See your noise level category (Quiet → Dangerous)

### Safety Warnings
- Get alerted when noise exceeds 85 dB
- Receive warnings at 100% daily dose
- Critical alerts at severe exposure levels

### Context Awareness
- Move around with your device
- Watch context change (stationary → moving)
- See how light and motion affect environment detection

### Data Tracking
- Monitor exposure over time
- View hourly breakdown for today
- Check weekly and monthly trends
- Export your data as JSON

## 📱 Install as App

1. Look for install icon in browser address bar
2. Click to install on your Mac
3. Launch from Applications or Launchpad
4. Enjoy full-screen standalone app

## 🔧 Settings

Click the ⚙️ icon to customize:

- **Safety Threshold**: Choose NIOSH (85 dB), OSHA (90 dB), or Conservative (80 dB)
- **Audio Warnings**: Enable/disable alert sounds
- **Push Notifications**: Get browser notifications for warnings
- **Calibration**: Adjust dB offset for accuracy (-20 to +20 dB)

## 📊 Understanding Your Data

### Noise Levels
- **<70 dB**: Safe (normal conversation)
- **70-85 dB**: Moderate (city traffic)
- **85-95 dB**: Loud (lawn mower)
- **95-110 dB**: Very loud (motorcycle)
- **>110 dB**: Dangerous (rock concert)

### Daily Dose
- **0-50%**: ✅ Low risk - you're safe
- **50-100%**: ⚠️ Moderate - watch your exposure
- **100-200%**: 🚨 High risk - seek quiet environment
- **>200%**: 🔴 Severe - immediate action needed

### Safe Exposure Times (NIOSH)
- **85 dB**: 8 hours
- **88 dB**: 4 hours
- **91 dB**: 2 hours
- **94 dB**: 1 hour
- **97 dB**: 30 minutes
- **100 dB**: 15 minutes

## 🛡️ Privacy

- ✅ All data stored locally on your device
- ✅ No cloud services or external servers
- ✅ No tracking or analytics
- ✅ Export your data anytime
- ✅ Clear all data with one click

## 💡 Pro Tips

1. **Calibrate for Accuracy**: Use a real sound meter to calibrate the app
2. **Daily Routine**: Check your dose each evening
3. **Use Ear Protection**: When dose exceeds 50%
4. **Take Breaks**: Step into quiet spaces regularly
5. **Export Weekly**: Keep backup of your exposure data

## ❓ Troubleshooting

### Microphone Not Working
- Check System Preferences → Security & Privacy → Microphone
- Ensure Safari/Chrome has microphone permission
- Try reloading the page

### Sensors Not Available
- Some sensors require HTTPS (not available on localhost)
- Not all Macs have ambient light sensors
- App works fine without sensors

### High Battery Usage
- Audio monitoring uses CPU
- Stop monitoring when not needed
- Close other browser tabs

## 📚 Learn More

- **README.md**: Full documentation
- **TESTING.md**: Comprehensive testing guide
- **HCI project proposal.pdf**: Project background and research

## 🎓 Academic Context

This app was built for **BITS F364 - Human Computer Interaction** course.

**Key HCI Principles Applied:**
- User-centered design
- Context-aware computing
- Proactive interaction
- Privacy by design
- Accessibility considerations
- Progressive enhancement

## 🆘 Need Help?

Check the browser console (⌥⌘I in Safari) for error messages.

Common commands to run in console:
```javascript
// Check app status
app.isMonitoring

// View current dose
dosimetry.getSummary()

// Check sensor data
sensorFusion.getData()

// View audio status
audioProcessor.getStatus()
```

## ✅ Verification Checklist

After starting the app, verify:
- [ ] Page loads without errors
- [ ] Permission banner appears
- [ ] Microphone access works
- [ ] "Start" button responds
- [ ] Real-time levels update
- [ ] Dose percentage shows
- [ ] Chart renders
- [ ] Settings open/close

---

**You're all set! Start protecting your hearing today.** 🔊🛡️

For detailed information, see **README.md**
For testing procedures, see **TESTING.md**
