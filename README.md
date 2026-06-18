# vnstat-web

A modern web dashboard for [vnstat](https://humdi.net/vnstat/) network traffic monitoring, built with [Chart.js](https://www.chartjs.org/).

## Features

- **Dashboard layout** — card-based UI with summary statistics and interactive charts
- **Light/Dark theme** — automatic (follows system preference) or manual toggle with persistence
- **Summary stats** — total received, transmitted, peak usage, and total traffic at a glance
- **SPA-style controls** — switch interfaces, time scales, and options without page reloads
- **Time scales** — hourly, daily, monthly, yearly, and top days
- **Stacked/grouped charts** — toggle between stacked and side-by-side bar views
- **Responsive design** — works on desktop, tablet, and mobile
- **URL state** — bookmarkable views with query parameters

## Quick Start

### Docker Compose (recommended)

```yaml
services:
  vnstat-ui:
    container_name: vnstat-ui
    image: bhoopendrau004/vnstat-ui:latest
    restart: always
    network_mode: host
    volumes:
      - vnstat-data:/var/lib/vnstat

volumes:
  vnstat-data:
```

```bash
docker compose up -d
```

The dashboard will be available at `http://localhost:7979`.

> **Note:** `network_mode: host` is required so vnstat can monitor the host's network interfaces.

### Build from source

```bash
git clone https://github.com/bhoopendrau004/vnstat-web.git
cd vnstat-web
docker compose up -d --build
```

## Data Persistence

vnstat's traffic database is stored in a named Docker volume (`vnstat-data`). Data persists across container restarts and recreation.

## Configuration

| File | Purpose |
|---|---|
| `index.html` | Page structure and layout |
| `style.css` | Styling, theming, and responsive breakpoints |
| `main.js` | Chart rendering, data fetching, controls, and theme logic |
| `data.php` | Backend API — reads from vnstat and returns JSON |
| `configs/` | Apache port and virtual host configuration |

## Tech Stack

- **Frontend:** Vanilla HTML, CSS, JavaScript
- **Charts:** [Chart.js v4](https://www.chartjs.org/) (loaded via CDN)
- **Backend:** PHP + Apache
- **Data source:** vnstat system daemon
- **Container:** Docker (php:apache base image)

## CI/CD

Docker images are automatically built and pushed to [DockerHub](https://hub.docker.com/r/bhoopendrau004/vnstat-ui) on every GitHub release. Tags follow the format `v0.0.2` → pushed as `0.0.2` and `latest`.
