---
name: browser-automation
description: "Patterns for web automation using the built-in browser tool. Covers social media, forms, scraping, and e-commerce workflows."
metadata: {"moltbot":{"emoji":"🌐"}}
---

# Browser Automation Patterns

This skill documents effective patterns for using Moltbot's built-in browser tool for web automation tasks.

## Browser Tool Overview

The browser tool provides Playwright-based automation with these core actions:

| Action | Purpose |
|--------|---------|
| `navigate` | Go to a URL |
| `snapshot` | Get page structure (for finding elements) |
| `screenshot` | Capture the page visually |
| `act` | Perform interactions (click, type, etc.) |
| `tabs` | Manage browser tabs |
| `upload` | Upload files to forms |
| `pdf` | Export page as PDF |
| `dialog` | Handle browser dialogs |
| `console` | Read console logs |

### Act Kinds

The `act` action supports these interaction types:

- `click` - Click an element (supports `doubleClick`, `button`, `modifiers`)
- `type` - Type text into focused element (supports `submit`, `slowly`)
- `fill` - Fill form fields by ref (clears first)
- `press` - Press a key (Enter, Tab, Escape, etc.)
- `hover` - Hover over an element
- `drag` - Drag from one element to another
- `select` - Select dropdown options
- `wait` - Wait for time or text to appear/disappear
- `evaluate` - Run JavaScript on an element
- `resize` - Resize browser viewport

## Social Media Automation

### Twitter/X

**Preferred:** Use the `bird` skill for Twitter (faster, more reliable).

Fallback browser pattern when bird is blocked:
```
browser navigate targetUrl:"https://twitter.com/compose/tweet"
browser snapshot
browser act request:{kind:"type", text:"Your tweet content here"}
browser act request:{kind:"click", ref:"[Post button ref]"}
```

### LinkedIn

**Authentication:** LinkedIn requires login. Use a persistent browser profile.

#### Post to LinkedIn

```
browser navigate targetUrl:"https://linkedin.com/feed"
browser snapshot
# Find the "Start a post" button
browser act request:{kind:"click", ref:"[Start a post ref]"}
browser act request:{kind:"wait", timeMs:1000}
browser snapshot
# Type in the post modal
browser act request:{kind:"type", text:"Your post content here. #hashtag"}
browser act request:{kind:"click", ref:"[Post button ref]"}
```

#### Send Connection Request

```
browser navigate targetUrl:"https://linkedin.com/in/[username]"
browser snapshot
browser act request:{kind:"click", ref:"[Connect button ref]"}
browser act request:{kind:"wait", timeMs:500}
browser snapshot
# Add note if available
browser act request:{kind:"click", ref:"[Add a note ref]"}
browser act request:{kind:"type", text:"Hi [Name], I'd like to connect because..."}
browser act request:{kind:"click", ref:"[Send ref]"}
```

#### Search for People

```
browser navigate targetUrl:"https://linkedin.com/search/results/people/?keywords=[query]"
browser snapshot
# Iterate through results
```

### General Social Media Tips

1. **Rate limiting:** Add waits between actions (`wait` with `timeMs:2000-5000`)
2. **Session persistence:** Use browser profiles to stay logged in
3. **Fallback strategy:** If one platform blocks, try another or use APIs
4. **Timing:** Social posts perform better at specific times; schedule accordingly

## Form Automation

### Single Form Fill

```
browser navigate targetUrl:"https://example.com/signup"
browser snapshot
# Get refs from snapshot, then fill
browser act request:{kind:"fill", fields:[
  {"ref":"1", "value":"John"},
  {"ref":"2", "value":"Doe"},
  {"ref":"3", "value":"john@example.com"}
]}
browser act request:{kind:"click", ref:"[Submit button ref]"}
```

### Multi-Step Form Wizard

```
# Step 1
browser navigate targetUrl:"https://example.com/wizard"
browser snapshot
browser act request:{kind:"fill", fields:[{"ref":"1", "value":"Step 1 data"}]}
browser act request:{kind:"click", ref:"[Next button ref]"}

# Wait for step 2 to load
browser act request:{kind:"wait", timeMs:1000}
browser snapshot

# Step 2
browser act request:{kind:"fill", fields:[{"ref":"5", "value":"Step 2 data"}]}
browser act request:{kind:"click", ref:"[Next button ref]"}

# Continue pattern...
```

### Checkbox and Radio Buttons

```
browser snapshot
# Click to toggle checkbox
browser act request:{kind:"click", ref:"[Checkbox ref]"}
# Select radio option
browser act request:{kind:"click", ref:"[Radio option ref]"}
```

### Dropdown Selection

```
browser snapshot
browser act request:{kind:"select", ref:"[Select element ref]", values:["Option Value"]}
```

### File Upload

```
browser snapshot
# Find file input ref
browser upload paths:["/path/to/file.pdf"] inputRef:"[File input ref]"
```

## E-Commerce Checkout

### Add to Cart Flow

```
browser navigate targetUrl:"https://shop.example.com/product/123"
browser snapshot
# Select options if needed
browser act request:{kind:"select", ref:"[Size selector ref]", values:["Large"]}
browser act request:{kind:"click", ref:"[Add to Cart ref]"}
browser act request:{kind:"wait", timeMs:1500}
```

### Checkout Process

```
browser navigate targetUrl:"https://shop.example.com/checkout"
browser snapshot

# Shipping info
browser act request:{kind:"fill", fields:[
  {"ref":"1", "value":"John Doe"},
  {"ref":"2", "value":"123 Main St"},
  {"ref":"3", "value":"San Francisco"},
  {"ref":"4", "value":"CA"},
  {"ref":"5", "value":"94102"}
]}
browser act request:{kind:"click", ref:"[Continue to payment ref]"}
browser act request:{kind:"wait", timeMs:2000}

# Payment (use 1Password for card details)
# op read "op://Vault/Card/number"
browser snapshot
browser act request:{kind:"fill", fields:[
  {"ref":"10", "value":"[card number]"},
  {"ref":"11", "value":"[exp date]"},
  {"ref":"12", "value":"[cvv]"}
]}
browser act request:{kind:"click", ref:"[Place order ref]"}
```

## Data Extraction (Scraping)

### Basic Page Scraping

```
browser navigate targetUrl:"https://example.com/data"
browser snapshot
# Snapshot includes page structure; parse for data

# For specific element text:
browser act request:{kind:"evaluate", ref:"[Element ref]", fn:"(el) => el.textContent"}
```

### Table Extraction

```
browser navigate targetUrl:"https://example.com/table"
browser snapshot
# Extract table data with evaluate
browser act request:{kind:"evaluate", fn:"() => { 
  const rows = document.querySelectorAll('table tr');
  return Array.from(rows).map(row => 
    Array.from(row.cells).map(cell => cell.textContent)
  );
}"}
```

### Paginated Data

```
# First page
browser navigate targetUrl:"https://example.com/list?page=1"
browser snapshot
# Extract data...

# Check for next page
browser act request:{kind:"click", ref:"[Next page ref]"}
browser act request:{kind:"wait", timeMs:2000}
browser snapshot
# Extract more data...
# Repeat until no more pages
```

### Search Result Extraction

```
browser navigate targetUrl:"https://example.com/search?q=query"
browser snapshot

# Loop through results
browser act request:{kind:"evaluate", fn:"() => {
  const results = document.querySelectorAll('.result-item');
  return Array.from(results).map(r => ({
    title: r.querySelector('.title')?.textContent,
    link: r.querySelector('a')?.href,
    description: r.querySelector('.desc')?.textContent
  }));
}"}
```

## Best Practices

### When to Use Browser vs API

| Use Browser | Use API |
|-------------|---------|
| No API available | Official API exists |
| Need visual verification | Speed is critical |
| Complex interactions | Simple data fetch |
| Testing UI flows | Production automation |

### Error Handling

```
# Always snapshot before acting
browser snapshot

# Wait for elements to be ready
browser act request:{kind:"wait", timeMs:1000}

# Check for error messages after actions
browser snapshot
# Look for error indicators in snapshot
```

### Rate Limiting Awareness

- Add delays between requests: `browser act request:{kind:"wait", timeMs:3000}`
- Vary timing to appear more human
- Respect robots.txt and ToS
- Back off if you see captchas or blocks

### Session Persistence

Use browser profiles to maintain login state:
```
browser start profile:"linkedin"
# All subsequent actions use this profile's cookies
```

### Debugging

```
# Take screenshots to see what's happening
browser screenshot fullPage:true

# Check console for errors
browser console level:"error"

# Use snapshot to understand page structure
browser snapshot mode:"efficient"
```

## Common Issues

### Element Not Found
- Run `browser snapshot` to see current page structure
- Element may have loaded dynamically; add a `wait`
- Try different snapshot format: `browser snapshot snapshotFormat:"aria"`

### Click Not Working
- Element may be obscured; try `browser act request:{kind:"wait", timeMs:1000}` first
- Use `hover` before `click` for dropdown menus
- Check if element is in an iframe (iframes not supported)

### Login Required
- Use a persistent browser profile with saved session
- Handle login flow first, then proceed with task

### Captcha/Bot Detection
- Add longer, randomized delays
- Avoid rapid-fire requests
- Consider using the service's API instead
- Some sites simply block automation; have a fallback plan

## Integration with Other Skills

### With 1Password (Secure Data)
```bash
# Get credentials
export EMAIL=$(op read "op://Vault/Service/email")
export PASS=$(op read "op://Vault/Service/password")
# Use in browser fill
```

### With bird (Twitter)
For Twitter, prefer `bird` CLI:
```bash
bird tweet "content"
bird search "query"
```
Fall back to browser only if bird is rate-limited.

### With himalaya (Email)
Scrape data with browser, send via email:
```bash
# After scraping data...
himalaya message write -H "To:recipient@example.com" -H "Subject:Report" "Data: ..."
```
