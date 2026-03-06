# Game Bar Leaderboard

Simple rotating leaderboard for social game bars. Shows player scores from Google Sheets with smooth transitions.

## Features

- Rotates between Crazy Pool and Activity Game every 18 seconds
- Smooth fade transitions
- Reads data from Google Sheets
- Shows only approved scores
- Auto-refreshes every 45 seconds
- Large text for TV viewing

## Setup

### 1. Create Google Sheets

Make a sheet with these columns:

| Player Name | Score | Approved |
|-------------|-------|----------|
| Alice       | 1250  | TRUE     |
| Bob         | 980   | TRUE     |

Important: Third column must be TRUE to show the entry.

### 2. Publish as CSV

1. Open your Google Sheet
2. Go to **File → Share → Publish to web**
3. Select your sheet
4. Choose **Comma-separated values (.csv)**
5. Click **Publish**
6. Copy the URL

### 3. Configure

Open `script/script.js` and edit these lines at the top:

```javascript
const CRAZY_POOL_URL = 'YOUR_CRAZY_POOL_CSV_URL';
const ACTIVITY_GAME_URL = 'YOUR_ACTIVITY_GAME_CSV_URL';
const ROTATION_SECONDS = 18;
const REFRESH_SECONDS = 45;
```

### 4. Open in Browser

1. Open `index.html` in Chrome or Firefox
2. Press **F11** for fullscreen

Done!

## How It Works

- **Crazy Pool**: Lowest score wins
- **Activity Game**: Highest score wins
- Only entries with `Approved = TRUE` are shown
- Shows top 5 players only

## Customization

### Change Rotation Speed

Edit in `script/script.js`:
```javascript
const ROTATION_SECONDS = 20;  // Change to any number
```

### Change Colors

Edit `css/style.css`:
```css
.title {
    background: linear-gradient(90deg, #00f0ff 0%, #ff00ff 100%);
}
```

### Change Subtitle

Edit `index.html`:
```html
<p class="subtitle">Your Text Here</p>
```

## Testing

The system shows sample data if you haven't set the Google Sheets URLs yet. Just open `index.html` to test.

## Troubleshooting

**No data showing?**
- Check that Google Sheet is published
- Verify CSV URLs are correct
- Check Approved column has TRUE values

**Not rotating?**
- Open browser console (F12) to check for errors
- Make sure JavaScript is enabled

## File Structure

```
├── index.html              # Main page
├── css/
│   └── style.css          # Styling
├── script/
│   └── script.js          # Logic (edit URLs here)
└── README.md
```
