# Screenshots Guide

## How to Create Screenshots

### 1. Setup
- Open Safari with GraphQL Inspector enabled
- Navigate to a website with GraphQL API (e.g., GitHub, Shopify, any GraphQL app)
- Make some GraphQL requests

### 2. Take Screenshots

Use macOS screenshot tool:
- **⌘ + Shift + 4** — Select area
- **⌘ + Shift + 4, then Space** — Capture window

### 3. Required Screenshots

| Filename | Description | What to Show |
|----------|-------------|--------------|
| `main.png` | Main view | List of requests with one selected |
| `query.png` | Query tab | GraphQL query with syntax highlighting |
| `variables.png` | Variables tab | JSON variables |
| `response.png` | Response tab | Server response JSON |
| `headers.png` | Headers tab | Request/Response headers |
| `edit.png` | Edit mode | Editing query before replay |
| `filters.png` | Filters | Filter buttons and search |

### 4. Recommended Settings

- **Window size:** 800x600 px (popup)
- **Resolution:** Retina (@2x) for crisp images
- **Format:** PNG

### 5. For App Store

App Store requires specific sizes:
- 2880 × 1800 pixels (Retina)
- 2560 × 1600 pixels
- 1440 × 900 pixels

**Tip:** Take full-window screenshots and resize as needed.

### 6. Optimization

Optimize PNG files before committing:
```bash
# Install pngquant
brew install pngquant

# Optimize all screenshots
pngquant --quality=80-90 --ext .png --force screenshots/*.png
```

