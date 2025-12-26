# GraphQL Inspector

<p align="center">
  <img src="AppIcon.svg" width="128" height="128" alt="GraphQL Inspector Icon">
</p>

<p align="center">
  <strong>A powerful Safari extension for debugging GraphQL requests</strong>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#installation">Installation</a> •
  <a href="#usage">Usage</a> •
  <a href="#building">Building</a> •
  <a href="#contributing">Contributing</a> •
  <a href="#license">License</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Platform-macOS%2012%2B-blue" alt="Platform">
  <img src="https://img.shields.io/badge/Safari-16%2B-orange" alt="Safari">
  <img src="https://img.shields.io/badge/Swift-5.0-red" alt="Swift">
  <img src="https://img.shields.io/badge/License-MIT-green" alt="License">
</p>

---

## ✨ Features

### 🔍 Request Monitoring
- Automatically captures all GraphQL queries and mutations
- Works on any website with GraphQL API
- Shows request duration, status codes, and errors
- Real-time request tracking

### 📝 Query Analysis
- Beautiful syntax highlighting for GraphQL
- View variables and inline arguments
- Inspect request and response headers
- JSON formatting with error highlighting

### 🔄 Request Replay
- Re-send any request with one click
- **Edit query and variables** before replaying
- See updated responses instantly
- No page refresh needed

### 📊 Smart Organization
- Filter by type: Queries, Mutations, Errors
- Search operations by name
- Pagination for large request lists
- Request count indicator

### 🎨 Beautiful Dark UI
- Modern interface inspired by developer tools
- Easy-to-read syntax highlighting
- Designed for long debugging sessions

---

## 📸 Screenshots

<p align="center">
  <img src="screenshots/main.png" width="700" alt="Main View">
</p>

<details>
<summary>More Screenshots</summary>

### Query View
<img src="screenshots/query.png" width="700" alt="Query View">

### Variables View
<img src="screenshots/variables.png" width="700" alt="Variables View">

### Response View
<img src="screenshots/response.png" width="700" alt="Response View">

### Headers View
<img src="screenshots/headers.png" width="700" alt="Headers View">

### Edit Mode
<img src="screenshots/edit.png" width="700" alt="Edit Mode">

</details>

---

## 📥 Installation

### From Mac App Store
*(Coming Soon)*

### Manual Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/borisdrozdov/graphql-inspector.git
   cd graphql-inspector
   ```

2. **Open in Xcode**
   ```bash
   open GraphQL.xcodeproj
   ```

3. **Configure signing**
   - Select the project in Navigator
   - Go to "Signing & Capabilities"
   - Select your Team (Apple ID)
   - Change Bundle Identifier if needed

4. **Build and Run** (⌘R)

5. **Enable the extension**
   - Open Safari
   - Go to Safari → Settings → Extensions
   - Enable "GraphQL Inspector"

---

## 🚀 Usage

1. **Open Safari** and navigate to any website with GraphQL API

2. **Click the extension icon** in the toolbar

3. **View captured requests** in the left panel

4. **Inspect details:**
   - **Query** — GraphQL query with syntax highlighting
   - **Variables** — Request variables (JSON)
   - **Response** — Server response
   - **Headers** — Request/Response headers

5. **Replay requests:**
   - Click **Replay** to resend the request
   - Click **Edit** to modify query/variables before sending

6. **Filter & Search:**
   - Use filter buttons: All, Queries, Mutations, Errors
   - Search by operation name

---

## 🛠 Building

### Requirements
- macOS 12.0+
- Xcode 14.0+
- Apple Developer Account (for signing)

### Generate App Icons

```bash
# Install librsvg
brew install librsvg

# Generate icons
./generate-icons.sh
```

Or manually convert `AppIcon.svg` to PNG at these sizes:
- 16x16, 32x32, 64x64, 128x128, 256x256, 512x512, 1024x1024

### Build for Release

```bash
xcodebuild -scheme "GraphQL" -configuration Release archive
```

---

## 🏗 Project Structure

```
GraphQL/
├── GraphQL/                    # Main app (container)
│   ├── AppDelegate.swift
│   ├── ViewController.swift
│   ├── Info.plist
│   ├── Assets.xcassets/
│   └── Resources/
│       ├── Main.html
│       ├── Style.css
│       └── Script.js
│
├── GraphQL Extension/          # Safari extension
│   ├── SafariWebExtensionHandler.swift
│   ├── Info.plist
│   └── Resources/
│       ├── manifest.json
│       ├── background.js
│       ├── content.js
│       ├── popup.html
│       ├── popup.css
│       ├── popup.js
│       └── images/
│
├── AppIcon.svg                 # App icon source
├── generate-icons.sh           # Icon generation script
├── PRIVACY.md                  # Privacy policy
└── README.md
```

---

## 🔒 Privacy

GraphQL Inspector is completely privacy-focused:

- ✅ **No data collection** — All data stays on your device
- ✅ **No analytics** — No tracking or telemetry
- ✅ **No external servers** — Everything runs locally
- ✅ **Open source** — Fully auditable code

See [PRIVACY.md](PRIVACY.md) for the full privacy policy.

---

## 🤝 Contributing

Contributions are welcome! Here's how you can help:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### Ideas for Contributions
- [ ] Export requests as cURL commands
- [ ] Request history persistence
- [ ] Custom themes
- [ ] Request grouping by endpoint
- [ ] GraphQL schema introspection
- [ ] WebSocket subscription support

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

```
MIT License

Copyright (c) 2025 Boris Drozdov

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## 🙏 Acknowledgments

- Inspired by [GraphQL Network Inspector](https://github.com/nicknisi/graphql-network-inspector) for Chrome
- Built with ❤️ for the GraphQL community

---

<p align="center">
  <strong>If you find this useful, please ⭐ star the repository!</strong>
</p>

