# 🍽️ MessTrack - Mess Attendance Tracker

An offline-first Progressive Web App (PWA) for hostel students to track their mess attendance with beautiful glass-morphism UI design.

## ✨ Features

### Core Functionality
- **Dual Attendance Tracking**: Mark attendance for both Lunch and Dinner
- **Offline-First**: Works completely offline using LocalStorage
- **Auto-Reset**: Automatically archives data at the start of each month
- **PWA Support**: Install as a native app on any device
- **Glass-Morphism UI**: Modern, beautiful interface with blur effects

### Key Features
- 📅 **Dashboard**: Quick attendance marking with visual feedback
- 📊 **History**: Calendar view of monthly attendance  
- 📈 **Summary**: Monthly statistics and attendance percentage
- ⚙️ **Settings**: Theme customization and data management
- 📤 **Export**: Download attendance data as CSV or PDF
- 🌓 **Dark/Light Themes**: Glass-themed interfaces for both modes
- 🔔 **Notifications**: Optional daily reminders (when enabled)
- 💾 **Data Backup**: Export/Import all data as JSON

### ✨ Enhanced Features (v2.0)
- 🎯 **Floating Action Button**: Quick marking from any page
- 📅 **Weekly View**: Last 7 days attendance at a glance
- ⏰ **Custom Meal Times**: Set your hostel's specific timings
- ✏️ **Bulk Edit Mode**: Edit multiple days at once
- 📱 **QR Code Sharing**: Generate QR codes for easy report sharing
- 📝 **Skip Reasons**: Track why meals were skipped with notes
- 🎨 **Enhanced PDF**: Professional reports with colors and statistics
- 📲 **Smart Install**: One-tap PWA installation with analytics tracking
- 🔔 **Meal Notifications**: Get reminded at your custom meal times
- 📊 **Enhanced About**: Detailed app info with privacy policy

## 🚀 Getting Started

### Installation

1. **Clone or Download** the repository to your local machine
2. **Generate Icons**: Open `icon-generator.html` in a browser and click "Download All Icons"
3. **Serve the App**: 
   - For local testing: Use any static file server
   - For production: Deploy to any web hosting service

### Quick Start with Python
```bash
# Navigate to project directory
cd "Mess Track"

# Start a simple HTTP server (Python 3)
python -m http.server 8000

# Open browser
# Navigate to http://localhost:8000
```

### Quick Start with Node.js
```bash
# Install http-server globally
npm install -g http-server

# Navigate to project directory
cd "Mess Track"

# Start server
http-server -p 8000

# Open browser
# Navigate to http://localhost:8000
```

## 📱 Installing as PWA

### On Mobile (Android/iOS)
1. Open the app in Chrome/Safari
2. Tap the menu button (⋮ or Share icon)
3. Select "Add to Home Screen" or "Install App"
4. Follow the prompts

### On Desktop (Chrome/Edge)
1. Open the app in browser
2. Click the install icon in the address bar (⊕)
3. Click "Install"

## 💡 How to Use

### Marking Attendance
1. Open the app and go to Dashboard
2. Click the **Lunch** button to mark lunch attendance
3. Click the **Dinner** button to mark dinner attendance
4. Buttons turn green when marked with a checkmark

### Viewing History
1. Navigate to the **History** tab
2. Use arrow buttons to navigate between months
3. Icons indicate attendance:
   - ☀️ Yellow sun = Lunch attended
   - 🌙 Blue moon = Dinner attended
   - ✅ Green check = Both attended

### Checking Summary
1. Go to **Summary** tab to see:
   - Current month's lunch count
   - Current month's dinner count
   - Overall attendance percentage
   - Previous months' archived data

### Exporting Data
1. **Current Month Export**:
   - Go to Summary → Click "Export as CSV" or "Export as PDF"
   
2. **All Data Export**:
   - Go to Settings → Click "Export All Data"
   - Saves as JSON file with complete history

### Importing Data
1. Go to Settings → Click "Import Data"
2. Select your backup JSON file
3. Confirm to replace existing data

## 🎨 Themes

The app supports two beautiful glass-morphism themes:

- **Dark Glass** (Default): Dark background with glass effect
- **Light Glass**: Light purple gradient with glass effect

Toggle themes using:
- Moon/Sun icon in header
- Settings → Appearance → Theme selector

## 📊 Data Structure

Data is stored in LocalStorage with the following structure:

```javascript
{
  "attendance": {
    "2024-01-15": { "lunch": true, "dinner": false },
    "2024-01-16": { "lunch": true, "dinner": true }
  },
  "summaries": {
    "2024-01": { 
      "lunchCount": 28, 
      "dinnerCount": 30, 
      "percentage": 96.6 
    }
  },
  "settings": {
    "theme": "dark",
    "notifications": false
  }
}
```

## 🔄 Auto-Reset Mechanism

- Automatically detects new month on app launch
- Archives previous month's data to summaries
- Clears current attendance records
- Preserves all historical data

## 🛠️ Technical Details

### Tech Stack
- **Frontend**: Vanilla JavaScript (ES6+)
- **Styling**: Tailwind CSS (CDN)
- **Icons**: Font Awesome
- **PDF Export**: jsPDF
- **Storage**: LocalStorage
- **PWA**: Service Worker + Web Manifest

### Browser Support
- ✅ Chrome/Edge (Full support)
- ✅ Firefox (Full support)
- ✅ Safari (iOS 11.3+)
- ✅ Samsung Internet
- ✅ Opera

### Offline Capabilities
- All core features work offline
- Data syncs to LocalStorage instantly
- No internet required after initial load
- CDN resources are cached by Service Worker

## 📁 Project Structure

```
Mess Track/
├── index.html          # Main HTML file
├── app.js             # Core JavaScript logic
├── sw.js              # Service Worker
├── manifest.json      # PWA Manifest
├── icon-generator.html # Icon generation tool
├── plan.md            # Development plan
├── README.md          # Documentation
└── icons/             # PWA icons (generated)
    ├── icon-72.png
    ├── icon-96.png
    ├── icon-128.png
    ├── icon-144.png
    ├── icon-152.png
    ├── icon-192.png
    ├── icon-384.png
    └── icon-512.png
```

## 🔒 Privacy & Security

- **100% Offline**: No data leaves your device
- **Local Storage**: All data stored locally
- **No Tracking**: No analytics or tracking
- **No Server**: Completely client-side application
- **Your Data**: Export anytime, delete anytime

## 🐛 Troubleshooting

### App not installing as PWA
- Ensure you're serving over HTTPS (or localhost)
- Check if Service Worker is registered
- Clear browser cache and try again

### Data not persisting
- Check browser's LocalStorage quota
- Ensure cookies/storage are not blocked
- Try different browser

### Icons not loading
- Generate icons using `icon-generator.html`
- Ensure all icon files are in root directory
- Check manifest.json paths

## 📝 License

This project is free to use for personal and educational purposes.

## 🤝 Contributing

Feel free to fork, modify, and improve the application. Suggestions and pull requests are welcome!

## 📞 Support

For issues or questions, please create an issue in the repository.

---

**Made with ❤️ for hostel students everywhere**

*Never miss marking your mess attendance again!*
