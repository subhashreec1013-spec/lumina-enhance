# Lumina Enhance

**Adaptive multi-frame low-light image enhancement — full-stack AI application.**

---

## Folder Structure

```
lumina-enhance/
├── backend/
│   ├── core/
│   │   ├── __init__.py
│   │   ├── scene_analysis.py      # Brightness, noise, contrast, motion metrics
│   │   ├── adaptive_controller.py # Dynamic parameter tuning
│   │   ├── optical_flow.py        # Farneback flow, motion masks, frame alignment
│   │   └── semantic_mask.py       # Face detection, saliency, protection blending
│   ├── pipeline/
│   │   ├── __init__.py
│   │   ├── fusion.py              # Exposure brackets + Mertens-style fusion
│   │   └── enhancement.py        # 12-step main pipeline orchestrator
│   ├── outputs/                   # Saved enhanced images (auto-created)
│   ├── main.py                    # FastAPI app, /enhance, /status, /result
│   └── requirements.txt
│
└── frontend/
    ├── public/
    │   └── index.html
    ├── src/
    │   ├── components/
    │   │   ├── Navbar.jsx           # Fixed top nav
    │   │   ├── HeroSection.jsx      # Landing with CTA
    │   │   ├── UploadZone.jsx       # Drag-and-drop multi-file upload
    │   │   ├── ProcessingView.jsx   # Animated pipeline progress
    │   │   ├── ResultViewer.jsx     # Before/after slider + zoom/pan
    │   │   ├── MetricsPanel.jsx     # Scene analysis + params display
    │   │   └── ErrorView.jsx        # Error state
    │   ├── hooks/
    │   │   └── useEnhancement.js    # Job lifecycle state machine
    │   ├── utils/
    │   │   └── api.js               # Axios API calls + polling
    │   ├── App.jsx                  # Root — stage router
    │   ├── index.js
    │   └── index.css                # Tailwind + custom design tokens
    ├── package.json
    ├── tailwind.config.js
    └── postcss.config.js
```

---

## Setup

### Backend

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start API server
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

API available at: http://localhost:8000  
Swagger docs at: http://localhost:8000/docs

---

### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start dev server
npm start
```

App available at: http://localhost:3000

> The frontend proxies API calls to `http://localhost:8000` automatically (set in package.json).

---

## API Endpoints

| Method | Path              | Description                          |
|--------|-------------------|--------------------------------------|
| POST   | `/enhance`        | Upload 1–8 images, returns `job_id`  |
| GET    | `/status/{id}`    | Poll progress (0–100) and message    |
| GET    | `/result/{id}`    | Get final URLs + metadata + params   |
| GET    | `/outputs/{file}` | Serve processed image files          |
| DELETE | `/jobs/{id}`      | Clean up job and files               |
| GET    | `/health`         | Health check                         |

---

## Pipeline Steps

1. Scene Analysis — brightness, noise, contrast, dynamic range, shadow/highlight fractions  
2. Adaptive Parameter Tuning — gamma, CLAHE clip, denoise strength, bracket count  
3. Optical Flow + Motion Masks — Farneback dense flow, soft motion weighting  
4. Gamma Correction — LUT-based adaptive gamma lift  
5. Exposure Bracket Generation — synthetic EV-spaced brackets  
6. Multi-Exposure Fusion — contrast/saturation/exposure weighted Mertens blend  
7. Shadow Enhancement — perceptual dark-region lifting curve  
8. CLAHE — contrast-limited adaptive histogram equalization (LAB L channel)  
9. Non-Local Means Denoising — strength tuned to noise level  
10. Local Contrast Boost — unsharp mask in luminance  
11. Highlight Protection — original highlight blending  
12. Tone Mapping + Saturation + Semantic Protection + Adaptive Blend  

---

## Production Notes

- Replace the in-memory `jobs` dict in `main.py` with Redis for multi-worker deployments  
- Add authentication (API keys or JWT) before exposing publicly  
- Set `REACT_APP_API_URL` env var in frontend for non-localhost backends  
- Outputs directory should be on persistent storage in production  
