// Jobs page: a dotted globe you can turn, with the cities that have open gigs
// pinned to it. Land comes from jobs-land.js; everything else is drawn here.
(function () {
    'use strict';

    const PLAY_URL = 'https://play.google.com/store/apps/details?id=com.app.sidegigs';
    const APP_STORE_URL = 'https://apps.apple.com/in/app/sidegigs/id6767884076';

    // The kinds of gig on offer. Cities list them by key below.
    const GIGS = {
        event: {
            title: 'Event Crew',
            type: 'One-day',
            when: 'Sat, 3pm – 11pm',
            about: 'Help set up stalls, guide guests and pack down after a wedding reception. Food is provided on site.',
            needs: ['Comfortable on your feet for 8 hours', 'Black shirt and trousers', 'Reach the venue 30 minutes early']
        },
        barista: {
            title: 'Café Barista',
            type: 'Part-time',
            when: 'Weekdays, 5pm – 10pm',
            about: 'Take orders, make coffee and keep the counter tidy during the evening rush. Training on the machine is given on day one.',
            needs: ['Friendly with customers', 'Basic English or local language', 'Available at least 3 evenings a week']
        },
        delivery: {
            title: 'Delivery Partner',
            type: 'Flexible',
            when: 'Pick your own hours',
            about: 'Deliver groceries and parcels within 5 km. You choose the slots that suit you and get paid per drop plus a daily bonus.',
            needs: ['Own two-wheeler and a valid licence', 'Smartphone with mobile data', 'Know the local area']
        },
        promoter: {
            title: 'Brand Promoter',
            type: 'Weekend',
            when: 'Sat – Sun, 11am – 7pm',
            about: 'Run a sampling stall in a shopping mall, talk to shoppers about a new snack brand and hand out samples.',
            needs: ['Confident speaking to strangers', 'Neat appearance', 'Both weekend days']
        },
        tutor: {
            title: 'Home Tutor (Maths)',
            type: 'Part-time',
            when: 'Mon, Wed, Fri · 6pm – 8pm',
            about: 'Teach maths to a class 9 student at their home. Syllabus and books are provided by the family.',
            needs: ['Strong in school maths', 'Patient and punctual', 'Lives within 5 km']
        },
        warehouse: {
            title: 'Warehouse Packer',
            type: 'Shift',
            when: 'Night shift, 10pm – 6am',
            about: 'Pick, pack and label orders for next-day dispatch during the festive sale. Night allowance included.',
            needs: ['Can lift up to 10 kg', 'Okay with night shifts', 'Closed shoes']
        },
        retail: {
            title: 'Retail Assistant',
            type: 'Weekend',
            when: 'Sat – Sun, 10am – 8pm',
            about: 'Help customers find sizes, restock shelves and manage the trial rooms at a clothing store during the sale.',
            needs: ['Good with people', 'Weekend availability for 4 weeks', 'Basic billing knowledge is a plus']
        },
        data: {
            title: 'Data Entry Assistant',
            type: 'Remote',
            when: 'Any 4 hours a day',
            about: 'Enter product details from photos into a spreadsheet. Work from home at your own pace with a daily target.',
            needs: ['Laptop and stable internet', 'Typing speed of 30 wpm or more', 'Attention to detail']
        },
        photo: {
            title: 'Event Photographer',
            type: 'One-day',
            when: 'Sun, 9am – 2pm',
            about: 'Cover a college fest: candid shots of the crowd and the main stage. Edited photos are due within two days.',
            needs: ['Own DSLR or mirrorless camera', 'A portfolio link', 'Basic Lightroom editing']
        },
        survey: {
            title: 'Field Surveyor',
            type: '3 days',
            when: 'Thu – Sat, 10am – 5pm',
            about: 'Visit local shops with a short survey on the app and record their answers. Travel allowance is paid per day.',
            needs: ['Smartphone with data', 'Speaks the local language', 'Comfortable walking outdoors']
        },
        kitchen: {
            title: 'Kitchen Helper',
            type: 'Part-time',
            when: 'Daily, 11am – 3pm',
            about: 'Prep vegetables, plate orders and keep the kitchen clean during the lunch rush at a busy restaurant.',
            needs: ['Hygiene-minded', 'Quick on your feet', 'Lunch provided']
        },
        social: {
            title: 'Social Media Assistant',
            type: 'Remote',
            when: '2 hours a day, flexible',
            about: 'Schedule posts, reply to comments and make simple reels for a small local brand.',
            needs: ['Knows Instagram well', 'Canva or a similar tool', 'Writes clear captions']
        },
        voice: {
            title: 'Malayalam Voice-over',
            type: 'Remote',
            when: 'One recording session',
            about: 'Record a 3-minute script in Malayalam for a client abroad. Work from home with a decent microphone.',
            needs: ['Clear Malayalam diction', 'Quiet room to record', 'Turn around within 48 hours']
        },
        support: {
            title: 'Chat Support (Hindi)',
            type: 'Remote',
            when: 'Evenings, 4 hours',
            about: 'Answer customer chats in Hindi and English for an overseas online store. All tools are browser based.',
            needs: ['Fluent Hindi and English', 'Laptop and stable internet', 'Available 4 evenings a week']
        }
    };

    // Each listing is [gig, pay, spots left, posted]. Cities abroad are remote
    // gigs done from India for clients there.
    const CITIES = [
        { id: 'kannur', name: 'Kannur', region: 'Kerala', lat: 11.87, lng: 75.37, jobs: [['event', '₹900/day', 8, '1h ago'], ['tutor', '₹350/hr', 1, '3h ago'], ['kitchen', '₹600/day', 2, '5h ago']] },
        { id: 'kozhikode', name: 'Kozhikode', region: 'Kerala', lat: 11.25, lng: 75.78, jobs: [['barista', '₹550/shift', 3, '40m ago'], ['photo', '₹2,500/day', 1, '2h ago'], ['delivery', '₹45/drop', 15, 'Today']] },
        { id: 'kochi', name: 'Kochi', region: 'Kerala', lat: 9.93, lng: 76.27, major: true, hot: true, jobs: [['event', '₹1,000/day', 20, '20m ago'], ['promoter', '₹1,200/day', 6, '1h ago'], ['retail', '₹800/day', 10, '2h ago'], ['social', '₹8,000/month', 1, 'Yesterday']] },
        { id: 'trivandrum', name: 'Thiruvananthapuram', region: 'Kerala', lat: 8.52, lng: 76.94, jobs: [['survey', '₹700/day', 12, '4h ago'], ['tutor', '₹300/hr', 2, 'Today']] },
        { id: 'coimbatore', name: 'Coimbatore', region: 'Tamil Nadu', lat: 11.02, lng: 76.96, jobs: [['warehouse', '₹850/night', 25, '2h ago'], ['kitchen', '₹550/day', 3, 'Today']] },
        { id: 'bengaluru', name: 'Bengaluru', region: 'Karnataka', lat: 12.97, lng: 77.59, major: true, hot: true, jobs: [['delivery', '₹50/drop', 40, '10m ago'], ['barista', '₹650/shift', 5, '1h ago'], ['warehouse', '₹950/night', 30, '1h ago'], ['data', '₹500/day', 10, '3h ago'], ['photo', '₹3,000/day', 2, 'Today']] },
        { id: 'chennai', name: 'Chennai', region: 'Tamil Nadu', lat: 13.08, lng: 80.27, major: true, jobs: [['retail', '₹750/day', 12, '30m ago'], ['event', '₹950/day', 15, '2h ago'], ['survey', '₹700/day', 8, 'Today']] },
        { id: 'hyderabad', name: 'Hyderabad', region: 'Telangana', lat: 17.39, lng: 78.49, major: true, jobs: [['warehouse', '₹900/night', 35, '45m ago'], ['promoter', '₹1,100/day', 8, '2h ago'], ['delivery', '₹45/drop', 25, 'Today']] },
        { id: 'pune', name: 'Pune', region: 'Maharashtra', lat: 18.52, lng: 73.86, jobs: [['barista', '₹600/shift', 4, '1h ago'], ['tutor', '₹400/hr', 2, '5h ago']] },
        { id: 'mumbai', name: 'Mumbai', region: 'Maharashtra', lat: 19.08, lng: 72.88, major: true, hot: true, jobs: [['event', '₹1,200/day', 30, '15m ago'], ['promoter', '₹1,400/day', 10, '1h ago'], ['retail', '₹900/day', 14, '3h ago'], ['photo', '₹3,500/day', 3, 'Today']] },
        { id: 'ahmedabad', name: 'Ahmedabad', region: 'Gujarat', lat: 23.02, lng: 72.57, jobs: [['warehouse', '₹800/night', 20, '2h ago'], ['survey', '₹650/day', 10, 'Yesterday']] },
        { id: 'jaipur', name: 'Jaipur', region: 'Rajasthan', lat: 26.91, lng: 75.79, jobs: [['event', '₹850/day', 18, '3h ago'], ['kitchen', '₹550/day', 4, 'Today']] },
        { id: 'delhi', name: 'New Delhi', region: 'Delhi', lat: 28.61, lng: 77.21, major: true, hot: true, jobs: [['delivery', '₹50/drop', 50, '5m ago'], ['retail', '₹850/day', 20, '1h ago'], ['promoter', '₹1,300/day', 12, '2h ago'], ['data', '₹500/day', 15, 'Today']] },
        { id: 'chandigarh', name: 'Chandigarh', region: 'Punjab', lat: 30.73, lng: 76.78, jobs: [['barista', '₹550/shift', 3, '4h ago']] },
        { id: 'lucknow', name: 'Lucknow', region: 'Uttar Pradesh', lat: 26.85, lng: 80.95, jobs: [['tutor', '₹300/hr', 3, '2h ago'], ['survey', '₹600/day', 15, 'Today']] },
        { id: 'kolkata', name: 'Kolkata', region: 'West Bengal', lat: 22.57, lng: 88.36, major: true, jobs: [['event', '₹800/day', 16, '1h ago'], ['kitchen', '₹500/day', 5, '3h ago'], ['social', '₹7,000/month', 1, 'Today']] },
        { id: 'guwahati', name: 'Guwahati', region: 'Assam', lat: 26.14, lng: 91.74, jobs: [['survey', '₹600/day', 10, 'Yesterday']] },
        { id: 'dubai', name: 'Dubai', region: 'Remote · UAE client', lat: 25.2, lng: 55.27, remote: true, jobs: [['voice', '₹2,000/script', 2, '2h ago'], ['support', '₹600/day', 5, 'Today']] },
        { id: 'singapore', name: 'Singapore', region: 'Remote · Singapore client', lat: 1.35, lng: 103.82, remote: true, jobs: [['data', '₹650/day', 6, '4h ago']] },
        { id: 'london', name: 'London', region: 'Remote · UK client', lat: 51.51, lng: -0.13, remote: true, jobs: [['support', '₹700/day', 4, 'Yesterday']] },
        { id: 'toronto', name: 'Toronto', region: 'Remote · Canada client', lat: 43.65, lng: -79.38, remote: true, jobs: [['social', '₹9,000/month', 1, 'Today']] }
    ];

    // Where the globe opens and what the India / World buttons go back to.
    const INDIA_VIEW = { lng: 80, lat: 13 };
    const WORLD_VIEW = { lng: 60, lat: 15, zoom: 1 };
    const MIN_ZOOM = 0.9;
    const MAX_ZOOM = 5;
    const MAX_TILT = 60;
    const DOT_GAP = 5; // css px between land dots, whatever the zoom
    const DEG = Math.PI / 180;

    const stage = document.getElementById('jobsStage');
    const canvas = document.getElementById('jobsGlobe');
    const markerLayer = document.getElementById('jobsMarkers');
    const cityList = document.getElementById('jobsCities');
    const panel = document.getElementById('jobsPanel');
    if (!stage || !canvas || !window.SIDEGIGS_LAND) return;

    const ctx = canvas.getContext('2d');
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const platform = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
        ? 'ios'
        : /Android/.test(navigator.userAgent) ? 'android' : 'desktop';

    const view = { lng: WORLD_VIEW.lng - 60, lat: WORLD_VIEW.lat, zoom: WORLD_VIEW.zoom };
    const size = { w: 0, h: 0, dpr: 1, cx: 0, cy: 0, base: 0 };
    let selected = null;
    let openJob = null;
    let tween = null;
    let dirty = true;

    function esc(text) {
        return String(text).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
    }

    function clamp(value, lo, hi) {
        return Math.min(hi, Math.max(lo, value));
    }

    function wrapLng(lng) {
        return ((lng + 540) % 360) - 180;
    }

    /* ---------- Land dots ---------- */

    const land = (() => {
        const bin = atob(window.SIDEGIGS_LAND);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        return bytes;
    })();

    function isLand(lat, lng) {
        const row = clamp(Math.floor((90 - lat) * 2), 0, 359);
        const col = clamp(Math.floor((wrapLng(lng) + 180) * 2), 0, 719);
        const i = row * 720 + col;
        return (land[i >> 3] >> (i & 7)) & 1;
    }

    // Dots sit on rows of latitude, spaced so they keep the same gap in pixels
    // at any zoom. Each dot is stored as sin(lat), cos(lat), lng in radians.
    let dots = null;
    let dotStep = 0;

    function buildDots(step) {
        const out = [];
        for (let lat = -90 + step / 2; lat < 90; lat += step) {
            const count = Math.max(1, Math.round((360 * Math.cos(lat * DEG)) / step));
            for (let k = 0; k < count; k++) {
                const lng = -180 + (k + 0.5) * (360 / count);
                if (isLand(lat, lng)) out.push(Math.sin(lat * DEG), Math.cos(lat * DEG), lng * DEG);
            }
        }
        dots = new Float32Array(out);
        dotStep = step;
    }

    // A phone is narrow, so India needs more zoom to fill it.
    function indiaView() {
        return { ...INDIA_VIEW, zoom: size.w >= 992 ? 3.2 : 4.2 };
    }

    function radius() {
        return size.base * view.zoom;
    }

    function ensureDots() {
        // Below about a third of a degree the half-degree land data shows its
        // squares, so the dots stop getting closer there.
        const step = Math.round(clamp((DOT_GAP / radius()) / DEG, 0.35, 3) * 20) / 20;
        if (step !== dotStep) buildDots(step);
    }

    /* ---------- Projection ---------- */

    let sinLat0 = 0;
    let cosLat0 = 1;
    let lng0 = 0;

    function prepareProjection() {
        sinLat0 = Math.sin(view.lat * DEG);
        cosLat0 = Math.cos(view.lat * DEG);
        lng0 = view.lng * DEG;
    }

    // Returns [x, y, z] in screen pixels; z is how directly the point faces you.
    function project(lat, lng) {
        const sinLat = Math.sin(lat * DEG);
        const cosLat = Math.cos(lat * DEG);
        const dl = lng * DEG - lng0;
        const cosDl = Math.cos(dl);
        const r = radius();
        return [
            size.cx + r * cosLat * Math.sin(dl),
            size.cy - r * (cosLat0 * sinLat - sinLat0 * cosLat * cosDl),
            sinLat0 * sinLat + cosLat0 * cosLat * cosDl
        ];
    }

    /* ---------- Drawing ---------- */

    const BUCKETS = 8;
    const bucketXY = Array.from({ length: BUCKETS }, () => new Float32Array(0));
    const bucketLen = new Int32Array(BUCKETS);

    function draw() {
        const { w, h, cx, cy } = size;
        const r = radius();
        ensureDots();
        prepareProjection();

        ctx.setTransform(size.dpr, 0, 0, size.dpr, 0, 0);
        ctx.clearRect(0, 0, w, h);

        // Green light round the edge.
        const glow = ctx.createRadialGradient(cx, cy, r * 0.92, cx, cy, r * 1.18);
        glow.addColorStop(0, 'rgba(195, 255, 0, 0.22)');
        glow.addColorStop(0.35, 'rgba(195, 255, 0, 0.07)');
        glow.addColorStop(1, 'rgba(195, 255, 0, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(cx, cy, r * 1.18, 0, Math.PI * 2);
        ctx.fill();

        // The sphere, lit from the upper left.
        const body = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.45, r * 0.05, cx, cy, r);
        body.addColorStop(0, '#141a08');
        body.addColorStop(0.7, '#060803');
        body.addColorStop(1, '#020301');
        ctx.fillStyle = body;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(195, 255, 0, 0.35)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Sort the visible dots into a few brightness buckets so each bucket
        // is one fillStyle change.
        const need = dots.length / 3 * 2;
        for (let b = 0; b < BUCKETS; b++) {
            if (bucketXY[b].length < need) bucketXY[b] = new Float32Array(need);
            bucketLen[b] = 0;
        }
        for (let i = 0; i < dots.length; i += 3) {
            const sinLat = dots[i];
            const cosLat = dots[i + 1];
            const dl = dots[i + 2] - lng0;
            const cosDl = Math.cos(dl);
            const z = sinLat0 * sinLat + cosLat0 * cosLat * cosDl;
            if (z <= 0.02) continue;
            const x = cx + r * cosLat * Math.sin(dl);
            if (x < -2 || x > w + 2) continue;
            const y = cy - r * (cosLat0 * sinLat - sinLat0 * cosLat * cosDl);
            if (y < -2 || y > h + 2) continue;
            const b = Math.min(BUCKETS - 1, Math.floor(Math.sqrt(z) * BUCKETS));
            const n = bucketLen[b];
            bucketXY[b][n] = x;
            bucketXY[b][n + 1] = y;
            bucketLen[b] = n + 2;
        }

        const dot = r > 900 ? 2 : 1.6;
        for (let b = 0; b < BUCKETS; b++) {
            const xy = bucketXY[b];
            const n = bucketLen[b];
            if (!n) continue;
            ctx.fillStyle = `rgba(255, 255, 255, ${(0.1 + 0.62 * ((b + 1) / BUCKETS)).toFixed(3)})`;
            for (let i = 0; i < n; i += 2) ctx.fillRect(xy[i] - dot / 2, xy[i + 1] - dot / 2, dot, dot);
        }

        placeMarkers();
        stage.setAttribute('aria-valuenow', String(Math.round(wrapLng(view.lng))));
        stage.setAttribute('aria-valuetext', `Facing ${Math.round(Math.abs(view.lat))}° ${view.lat >= 0 ? 'N' : 'S'}, ${Math.round(Math.abs(wrapLng(view.lng)))}° ${wrapLng(view.lng) >= 0 ? 'E' : 'W'}`);
    }

    /* ---------- Markers ---------- */

    const markers = new Map();

    function buildMarkers() {
        CITIES.forEach((city) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'globe-marker'
                + (city.major ? ' is-major' : '')
                + (city.hot ? ' is-hot' : '')
                + (city.remote ? ' is-remote' : '');
            button.setAttribute('aria-label', `${city.name}, ${city.jobs.length} open ${city.jobs.length === 1 ? 'gig' : 'gigs'}`);
            button.innerHTML = '<span class="globe-marker-dot"></span>'
                + `<span class="globe-marker-label">${esc(city.name)} <em>${city.jobs.length}</em></span>`;
            button.addEventListener('click', () => pickCity(city.id));
            markerLayer.appendChild(button);
            markers.set(city.id, button);
        });
    }

    function placeMarkers() {
        CITIES.forEach((city) => {
            const el = markers.get(city.id);
            const [x, y, z] = project(city.lat, city.lng);
            const shown = z > 0.04 && x > -40 && x < size.w + 40 && y > -40 && y < size.h + 40;
            el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
            el.style.opacity = shown ? String(clamp(z * 5, 0, 1)) : '0';
            el.style.visibility = shown ? 'visible' : 'hidden';
            el.tabIndex = shown ? 0 : -1;
            el.classList.toggle('is-selected', city.id === selected);
            // Only the big cities are named when zoomed out, so Kerala's pins
            // don't bury each other in labels.
            el.classList.toggle('is-named', city.id === selected || Boolean(city.major && view.zoom >= 1.8));
        });
    }

    /* ---------- Motion ---------- */

    function requestDraw() {
        dirty = true;
    }

    function frame(now) {
        if (tween) {
            const t = clamp((now - tween.start) / tween.duration, 0, 1);
            const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
            view.lng = tween.from.lng + tween.dLng * e;
            view.lat = tween.from.lat + (tween.to.lat - tween.from.lat) * e;
            view.zoom = tween.from.zoom + (tween.to.zoom - tween.from.zoom) * e;
            if (t >= 1) {
                view.lng = wrapLng(view.lng);
                tween = null;
            }
            dirty = true;
        }
        if (dirty) {
            dirty = false;
            draw();
        }
        requestAnimationFrame(frame);
    }

    // Turn the short way round to face [lng, lat], easing the zoom with it.
    function rotateTo(target, duration) {
        const to = {
            lng: target.lng,
            lat: clamp(target.lat, -MAX_TILT, MAX_TILT),
            zoom: clamp(target.zoom ?? view.zoom, MIN_ZOOM, MAX_ZOOM)
        };
        const ms = reduceMotion.matches ? 0 : (duration ?? 1100);
        if (!ms) {
            Object.assign(view, to);
            tween = null;
            requestDraw();
            return;
        }
        tween = {
            start: performance.now(),
            duration: ms,
            from: { ...view },
            to,
            dLng: wrapLng(to.lng - view.lng)
        };
    }

    function rotateBy(dLng, dLat) {
        rotateTo({ lng: view.lng + dLng, lat: view.lat + dLat }, 450);
    }

    function zoomBy(factor) {
        rotateTo({ lng: view.lng, lat: view.lat, zoom: view.zoom * factor }, 450);
    }

    /* ---------- Dragging and keys ---------- */

    let drag = null;

    stage.addEventListener('pointerdown', (event) => {
        if (event.button !== 0) return;
        tween = null;
        drag = { id: event.pointerId, x: event.clientX, y: event.clientY };
        stage.setPointerCapture(event.pointerId);
        stage.classList.add('is-dragging');
    });

    stage.addEventListener('pointermove', (event) => {
        if (!drag || drag.id !== event.pointerId) return;
        const r = radius();
        const dx = event.clientX - drag.x;
        const dy = event.clientY - drag.y;
        drag.x = event.clientX;
        drag.y = event.clientY;
        view.lng = wrapLng(view.lng - (dx / r) / DEG);
        view.lat = clamp(view.lat + (dy / r) / DEG, -MAX_TILT, MAX_TILT);
        requestDraw();
    });

    function endDrag(event) {
        if (!drag || drag.id !== event.pointerId) return;
        drag = null;
        stage.classList.remove('is-dragging');
    }

    stage.addEventListener('pointerup', endDrag);
    stage.addEventListener('pointercancel', endDrag);

    stage.addEventListener('keydown', (event) => {
        const moves = { ArrowLeft: [-15, 0], ArrowRight: [15, 0], ArrowUp: [0, 10], ArrowDown: [0, -10] };
        if (moves[event.key]) {
            event.preventDefault();
            rotateBy(moves[event.key][0] / view.zoom, moves[event.key][1] / view.zoom);
        } else if (event.key === '+' || event.key === '=') {
            zoomBy(1.4);
        } else if (event.key === '-') {
            zoomBy(1 / 1.4);
        }
    });

    document.querySelectorAll('[data-globe]').forEach((button) => {
        button.addEventListener('click', () => {
            const action = button.dataset.globe;
            if (action === 'left') rotateBy(-20 / view.zoom, 0);
            if (action === 'right') rotateBy(20 / view.zoom, 0);
            if (action === 'in') zoomBy(1.4);
            if (action === 'out') zoomBy(1 / 1.4);
            if (action === 'india') rotateTo(indiaView(), 1200);
            if (action === 'world') rotateTo(WORLD_VIEW, 1200);
        });
    });

    /* ---------- Sizing ---------- */

    function resize() {
        const rect = stage.getBoundingClientRect();
        const wide = rect.width >= 992;
        size.w = rect.width;
        size.h = rect.height;
        size.dpr = Math.min(window.devicePixelRatio || 1, 2);
        size.cx = rect.width / 2;
        size.cy = rect.height * (wide ? 0.56 : 0.58);
        size.base = Math.min(rect.width, rect.height) * (wide ? 0.38 : 0.44);
        canvas.width = Math.round(rect.width * size.dpr);
        canvas.height = Math.round(rect.height * size.dpr);
        requestDraw();
    }

    new ResizeObserver(resize).observe(stage);

    /* ---------- City list and details ---------- */

    function countLabel(n) {
        return `${n} ${n === 1 ? 'gig' : 'gigs'}`;
    }

    function renderCityList() {
        cityList.innerHTML = CITIES.map((city) => `
            <button type="button" class="jobs-city${city.remote ? ' is-remote' : ''}${city.id === selected ? ' is-selected' : ''}" data-city="${city.id}" aria-pressed="${city.id === selected}">
                <span class="jobs-city-dot"></span>
                <span class="jobs-city-name">${esc(city.name)}</span>
                <span class="jobs-city-count">${city.jobs.length}</span>
            </button>`).join('');
    }

    cityList.addEventListener('click', (event) => {
        const button = event.target.closest('[data-city]');
        if (button) pickCity(button.dataset.city);
    });

    function pickCity(id) {
        const city = CITIES.find((entry) => entry.id === id);
        if (!city) return;
        selected = id;
        openJob = null;
        // Lean a little short of the city's latitude so it sits above the
        // middle of the globe. On a phone it goes higher still, above the
        // sheet the details come up in.
        const zoom = city.remote ? Math.min(view.zoom, 1.3) : Math.max(view.zoom, indiaView().zoom);
        const lat = size.w >= 992
            ? city.lat * 0.6 - 2
            : city.lat - (size.h * 0.25 / (size.base * zoom)) / DEG;
        rotateTo({ lng: city.lng, lat, zoom });
        renderCityList();
        renderPanel();
        requestDraw();
    }

    function closePanel() {
        selected = null;
        openJob = null;
        renderCityList();
        renderPanel();
        requestDraw();
    }

    function storeButtons() {
        return `
            <div class="jobs-stores">
                <a href="${PLAY_URL}" target="_blank" rel="noopener noreferrer" class="download-btn google-play">
                    <img src="images/google-play-icon.svg" alt="" class="download-icon">
                    <div class="download-text"><small>Get it on</small>Google Play</div>
                </a>
                <a href="${APP_STORE_URL}" target="_blank" rel="noopener noreferrer" class="download-btn app-store">
                    <img src="images/apple-icon.svg" alt="" class="download-icon">
                    <div class="download-text"><small>Download on the</small>App Store</div>
                </a>
            </div>`;
    }

    function applyButton() {
        // On a phone the button goes straight to that phone's store; on a
        // computer it shows both.
        if (platform === 'desktop') {
            return `
                <button type="button" class="jobs-apply" data-action="apply" aria-expanded="false">
                    Apply via app <i class="fas fa-arrow-right" aria-hidden="true"></i>
                </button>
                <div class="jobs-apply-stores" hidden>
                    <p>Install Sidegigs on your phone, then find this gig under its city.</p>
                    ${storeButtons()}
                </div>`;
        }
        const href = platform === 'ios' ? APP_STORE_URL : PLAY_URL;
        return `<a class="jobs-apply" href="${href}" target="_blank" rel="noopener noreferrer">Apply via app <i class="fas fa-arrow-right" aria-hidden="true"></i></a>`;
    }

    function renderPanel() {
        const city = CITIES.find((entry) => entry.id === selected);
        panel.classList.toggle('is-open', Boolean(city));
        stage.closest('.jobs-section').classList.toggle('has-panel', Boolean(city));

        if (!city) {
            panel.innerHTML = `
                <div class="jobs-panel-empty">
                    <div class="jobs-panel-empty-icon"><i class="fas fa-location-dot" aria-hidden="true"></i></div>
                    <h2>Pick a city</h2>
                    <p>Tap a pin on the globe or a city on the list to see the gigs open there right now.</p>
                </div>`;
            return;
        }

        if (openJob !== null) {
            const [key, pay, spots, posted] = city.jobs[openJob];
            const gig = GIGS[key];
            panel.innerHTML = `
                <div class="jobs-panel-head">
                    <button type="button" class="jobs-icon-btn" data-action="back" aria-label="Back to ${esc(city.name)} gigs"><i class="fas fa-arrow-left" aria-hidden="true"></i></button>
                    <span class="jobs-panel-crumb">${esc(city.name)}</span>
                    <button type="button" class="jobs-icon-btn" data-action="close" aria-label="Close"><i class="fas fa-xmark" aria-hidden="true"></i></button>
                </div>
                <div class="jobs-detail">
                    <span class="jobs-tag${gig.type === 'Remote' ? ' is-remote' : ''}">${esc(gig.type)}</span>
                    <h2>${esc(gig.title)}</h2>
                    <p class="jobs-detail-where"><i class="fas fa-location-dot" aria-hidden="true"></i> ${esc(city.name)}, ${esc(city.region)}</p>
                    <div class="jobs-detail-pay">${esc(pay)}</div>
                    <dl class="jobs-facts">
                        <div><dt>When</dt><dd>${esc(gig.when)}</dd></div>
                        <div><dt>Spots left</dt><dd>${spots}</dd></div>
                        <div><dt>Posted</dt><dd>${esc(posted)}</dd></div>
                    </dl>
                    <h3>About the gig</h3>
                    <p>${esc(gig.about)}</p>
                    <h3>You'll need</h3>
                    <ul>${gig.needs.map((need) => `<li>${esc(need)}</li>`).join('')}</ul>
                    <div class="jobs-apply-wrap">
                        ${applyButton()}
                        <p class="jobs-apply-note">No interview round. Some employers may ask for a resume.</p>
                    </div>
                </div>`;
            panel.querySelector('[data-action="back"]').focus({ preventScroll: true });
            return;
        }

        panel.innerHTML = `
            <div class="jobs-panel-head">
                <div>
                    <h2>${esc(city.name)}</h2>
                    <span class="jobs-panel-sub">${esc(city.region)} · ${countLabel(city.jobs.length)}</span>
                </div>
                <button type="button" class="jobs-icon-btn" data-action="close" aria-label="Close"><i class="fas fa-xmark" aria-hidden="true"></i></button>
            </div>
            <ul class="jobs-list">
                ${city.jobs.map(([key, pay, spots, posted], index) => {
                    const gig = GIGS[key];
                    return `
                    <li>
                        <button type="button" class="jobs-card" data-job="${index}">
                            <span class="jobs-card-top">
                                <span class="jobs-card-title">${esc(gig.title)}</span>
                                <span class="jobs-card-pay">${esc(pay)}</span>
                            </span>
                            <span class="jobs-card-meta">
                                <span class="jobs-tag${gig.type === 'Remote' ? ' is-remote' : ''}">${esc(gig.type)}</span>
                                ${esc(gig.when)}
                            </span>
                            <span class="jobs-card-foot">${spots} ${spots === 1 ? 'spot' : 'spots'} left · ${esc(posted)}</span>
                        </button>
                    </li>`;
                }).join('')}
            </ul>`;
    }

    panel.addEventListener('click', (event) => {
        const action = event.target.closest('[data-action]');
        const card = event.target.closest('[data-job]');
        if (card) {
            openJob = Number(card.dataset.job);
            renderPanel();
            panel.scrollTop = 0;
        } else if (action?.dataset.action === 'back') {
            openJob = null;
            renderPanel();
        } else if (action?.dataset.action === 'close') {
            closePanel();
        } else if (action?.dataset.action === 'apply') {
            const stores = panel.querySelector('.jobs-apply-stores');
            stores.hidden = !stores.hidden;
            action.setAttribute('aria-expanded', String(!stores.hidden));
        }
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && selected) closePanel();
    });

    /* ---------- Start ---------- */

    const total = CITIES.reduce((sum, city) => sum + city.jobs.length, 0);
    document.getElementById('jobsTotal').textContent = total;
    document.getElementById('jobsCityCount').textContent = CITIES.filter((city) => !city.remote).length;

    buildMarkers();
    renderCityList();
    renderPanel();
    resize();
    requestAnimationFrame(frame);
    // Open on the world, then turn and lean in to India.
    setTimeout(() => rotateTo(indiaView(), 2200), 350);
})();
