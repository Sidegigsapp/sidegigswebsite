// Jobs page: a dotted globe you can turn, with the cities that have open gigs
// pinned to it. Land comes from jobs-land.js; everything else is drawn here.
(function () {
    'use strict';

    const PLAY_URL = 'https://play.google.com/store/apps/details?id=com.app.sidegigs';
    const APP_STORE_URL = 'https://apps.apple.com/in/app/sidegigs/id6767884076';

    const API = 'https://api.sidegigs.app/api';
    const LOAD_TIMEOUT = 15000;

    // Places we know the position of. Jobs from the app are filed under the
    // nearest one (within NEAR_KM); classifieds only give a town name, so they
    // are matched against the names and aliases here.
    const NEAR_KM = 30;
    const KNOWN_PLACES = [
        { id: 'kasaragod', name: 'Kasaragod', region: 'Kerala', lat: 12.5, lng: 75.0 },
        { id: 'kannur', name: 'Kannur', region: 'Kerala', lat: 11.87, lng: 75.37 },
        { id: 'kozhikode', name: 'Kozhikode', region: 'Kerala', lat: 11.25, lng: 75.78, aliases: ['calicut'] },
        { id: 'wayanad', name: 'Wayanad', region: 'Kerala', lat: 11.69, lng: 76.08, aliases: ['kalpetta'] },
        { id: 'malappuram', name: 'Malappuram', region: 'Kerala', lat: 11.05, lng: 76.07, aliases: ['kottakkal', 'tirur', 'manjeri', 'perinthalmanna'] },
        { id: 'palakkad', name: 'Palakkad', region: 'Kerala', lat: 10.78, lng: 76.65, aliases: ['palghat'] },
        { id: 'thrissur', name: 'Thrissur', region: 'Kerala', lat: 10.53, lng: 76.21, aliases: ['trichur'] },
        { id: 'kochi', name: 'Kochi', region: 'Kerala', lat: 9.98, lng: 76.29, aliases: ['ernakulam', 'cochin', 'edappally', 'kakkanad', 'aluva', 'thrippunithura', 'tripunithura', 'kalamassery', 'vyttila'] },
        { id: 'idukki', name: 'Idukki', region: 'Kerala', lat: 9.85, lng: 76.97, aliases: ['thodupuzha', 'munnar'] },
        { id: 'kottayam', name: 'Kottayam', region: 'Kerala', lat: 9.59, lng: 76.52 },
        { id: 'alappuzha', name: 'Alappuzha', region: 'Kerala', lat: 9.5, lng: 76.34, aliases: ['alleppey'] },
        { id: 'pathanamthitta', name: 'Pathanamthitta', region: 'Kerala', lat: 9.26, lng: 76.78, aliases: ['thiruvalla'] },
        { id: 'kollam', name: 'Kollam', region: 'Kerala', lat: 8.89, lng: 76.61, aliases: ['quilon'] },
        { id: 'trivandrum', name: 'Thiruvananthapuram', region: 'Kerala', lat: 8.52, lng: 76.94, aliases: ['trivandrum', 'kazhakkoottam', 'technopark', 'attingal', 'vakkom', 'varkala'] },
        { id: 'coimbatore', name: 'Coimbatore', region: 'Tamil Nadu', lat: 11.02, lng: 76.96 },
        { id: 'bengaluru', name: 'Bengaluru', region: 'Karnataka', lat: 12.97, lng: 77.59, aliases: ['bangalore'] },
        { id: 'mangaluru', name: 'Mangaluru', region: 'Karnataka', lat: 12.91, lng: 74.86, aliases: ['mangalore'] },
        { id: 'chennai', name: 'Chennai', region: 'Tamil Nadu', lat: 13.08, lng: 80.27, aliases: ['madras'] },
        { id: 'hyderabad', name: 'Hyderabad', region: 'Telangana', lat: 17.39, lng: 78.49 },
        { id: 'pune', name: 'Pune', region: 'Maharashtra', lat: 18.52, lng: 73.86 },
        { id: 'mumbai', name: 'Mumbai', region: 'Maharashtra', lat: 19.08, lng: 72.88, aliases: ['bombay'] },
        { id: 'delhi', name: 'New Delhi', region: 'Delhi', lat: 28.61, lng: 77.21, aliases: ['delhi'] },
        { id: 'kolkata', name: 'Kolkata', region: 'West Bengal', lat: 22.57, lng: 88.36 }
    ];

    // Filled from the API: the places with at least one opening, each with
    // its list of jobs.
    let CITIES = [];

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
        markerLayer.textContent = '';
        markers.clear();
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

    /* ---------- Jobs from the app ---------- */

    // 'loading' until the API answers, then 'ready' or 'failed'.
    let loadState = 'loading';

    async function post(path, body) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), LOAD_TIMEOUT);
        try {
            const response = await fetch(`${API}${path}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
                signal: controller.signal
            });
            if (!response.ok) throw new Error(`${path} answered ${response.status}`);
            const json = await response.json();
            if (!json.status || !Array.isArray(json.data)) throw new Error(`${path} sent no list`);
            return json.data;
        } finally {
            clearTimeout(timer);
        }
    }

    function clean(text) {
        const value = String(text ?? '').trim();
        // The app's form leaves 'string' in fields nobody filled in.
        return value.toLowerCase() === 'string' ? '' : value;
    }

    function formatPay(amount, type) {
        const value = Number(amount);
        if (!value) return 'Pay shared in the app';
        const money = `₹${value.toLocaleString('en-IN')}`;
        const per = { daily: '/day', monthly: '/month', hourly: '/hr', weekly: '/week', 'per job': ' per job' }[clean(type).toLowerCase()];
        return per ? money + per : `${money} ${clean(type)}`.trim();
    }

    function formatDate(value) {
        const date = value ? new Date(value) : null;
        if (!date || Number.isNaN(date.getTime())) return '';
        return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    }

    function postedAgo(value) {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return '';
        const hours = (Date.now() - date.getTime()) / 36e5;
        if (hours < 1) return 'Just now';
        if (hours < 24) return `${Math.floor(hours)}h ago`;
        const days = Math.floor(hours / 24);
        if (days === 1) return 'Yesterday';
        if (days < 30) return `${days} days ago`;
        return formatDate(value);
    }

    function distanceKm(aLat, aLng, bLat, bLng) {
        const dLat = (bLat - aLat) * DEG;
        const dLng = (bLng - aLng) * DEG;
        const h = Math.sin(dLat / 2) ** 2 + Math.cos(aLat * DEG) * Math.cos(bLat * DEG) * Math.sin(dLng / 2) ** 2;
        return 12742 * Math.asin(Math.sqrt(h));
    }

    function placeByName(text) {
        const words = clean(text).toLowerCase();
        if (!words) return null;
        return KNOWN_PLACES.find((place) => [place.name, place.id, ...(place.aliases || [])]
            .some((name) => new RegExp(`\\b${name.toLowerCase()}\\b`).test(words))) || null;
    }

    // A job goes under the nearest known place; failing that, under the town
    // named in its address, at its own position.
    function placeFor(lat, lng, text) {
        let best = null;
        let bestKm = NEAR_KM;
        KNOWN_PLACES.forEach((place) => {
            const km = distanceKm(lat, lng, place.lat, place.lng);
            if (km < bestKm) {
                best = place;
                bestKm = km;
            }
        });
        if (best) return best;
        const parts = clean(text).split(',').map((part) => part.trim()).filter((part) => part && !/\d|^india$/i.test(part));
        const name = parts[0] || 'Other';
        return { id: `at-${lat.toFixed(2)}-${lng.toFixed(2)}`, name, region: parts[parts.length - 1] || '', lat, lng };
    }

    function fromJob(job) {
        const [lng, lat] = job.location?.coordinates || [];
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
        return {
            place: placeFor(lat, lng, job.location_text),
            title: clean(job.job_title) || 'Open position',
            company: clean(job.company),
            tag: clean(job.category) || 'Job',
            pay: formatPay(job.payment, job.payment_type),
            where: clean(job.location_text),
            about: clean(job.job_description),
            needs: clean(job.job_requirements),
            posted: postedAgo(job.createdAt),
            until: formatDate(job.end_date),
            resume: Boolean(job.collect_resume),
            ours: false,
            time: new Date(job.createdAt).getTime() || 0
        };
    }

    // Classifieds are posted by the Sidegigs team and carry a town name
    // rather than a position.
    function fromClassified(item) {
        const where = clean(item.location || item.location_text);
        const place = placeByName(where);
        if (!place) return null;
        return {
            place,
            title: clean(item.title) || 'Classified',
            company: 'Sidegigs',
            tag: 'Posted by Sidegigs',
            pay: item.payment ? formatPay(item.payment, item.payment_type) : 'Details in the app',
            where: where.replace(/^./, (c) => c.toUpperCase()),
            about: clean(item.description),
            needs: '',
            posted: postedAgo(item.createdAt || item.created_at),
            until: '',
            resume: false,
            ours: true,
            time: new Date(item.createdAt || item.created_at).getTime() || 0
        };
    }

    async function loadJobs() {
        const [jobs, classifieds] = await Promise.allSettled([
            post('/jobs/guest_job_list', { status: 'open' }),
            post('/classified/guest_classified_list', {})
        ]);
        if (jobs.status === 'rejected' && classifieds.status === 'rejected') throw jobs.reason;
        const listings = [
            ...(jobs.value || []).map(fromJob),
            ...(classifieds.value || []).map(fromClassified)
        ].filter(Boolean);

        const byPlace = new Map();
        listings.forEach((listing) => {
            const { place } = listing;
            if (!byPlace.has(place.id)) byPlace.set(place.id, { id: place.id, name: place.name, region: place.region, lat: place.lat, lng: place.lng, jobs: [] });
            byPlace.get(place.id).jobs.push(listing);
        });
        const places = [...byPlace.values()];
        places.forEach((place) => place.jobs.sort((a, b) => b.time - a.time));
        places.sort((a, b) => b.jobs.length - a.jobs.length || a.name.localeCompare(b.name));
        // The busiest places get their names shown and a pulsing pin.
        places.forEach((place, index) => {
            place.major = index < 4;
            place.hot = index === 0 && place.jobs.length > 1;
        });
        return places;
    }

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
        // Lean right in: most openings are a few km apart in Kerala.
        const zoom = city.remote ? Math.min(view.zoom, 1.3) : MAX_ZOOM;
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
            const empty = {
                loading: ['fa-spinner fa-spin', 'Loading gigs', 'Getting the latest openings from the Sidegigs app.'],
                failed: ['fa-circle-exclamation', 'Gigs could not load', 'Open the Sidegigs app to see every opening near you.'],
                none: ['fa-briefcase', 'No open gigs right now', 'New openings are posted every day. Get the app to hear first.'],
                ready: ['fa-location-dot', 'Pick a place', 'Tap a pin on the globe or a place on the list to see the gigs open there right now.']
            }[loadState === 'ready' && !CITIES.length ? 'none' : loadState];
            panel.innerHTML = `
                <div class="jobs-panel-empty">
                    <div class="jobs-panel-empty-icon"><i class="fas ${empty[0]}" aria-hidden="true"></i></div>
                    <h2>${empty[1]}</h2>
                    <p>${empty[2]}</p>
                    ${loadState === 'ready' && CITIES.length ? '' : storeButtons()}
                </div>`;
            return;
        }

        if (openJob !== null) {
            const job = city.jobs[openJob];
            const facts = [
                ['Posted', job.posted],
                ['Apply by', job.until],
                ['Category', job.ours ? '' : job.tag]
            ].filter(([, value]) => value);
            panel.innerHTML = `
                <div class="jobs-panel-head">
                    <button type="button" class="jobs-icon-btn" data-action="back" aria-label="Back to ${esc(city.name)} gigs"><i class="fas fa-arrow-left" aria-hidden="true"></i></button>
                    <span class="jobs-panel-crumb">${esc(city.name)}</span>
                    <button type="button" class="jobs-icon-btn" data-action="close" aria-label="Close"><i class="fas fa-xmark" aria-hidden="true"></i></button>
                </div>
                <div class="jobs-detail">
                    <span class="jobs-tag${job.ours ? ' is-ours' : ''}">${esc(job.tag)}</span>
                    <h2>${esc(job.title)}</h2>
                    ${job.company && !job.ours ? `<p class="jobs-detail-company">${esc(job.company)}</p>` : ''}
                    <p class="jobs-detail-where"><i class="fas fa-location-dot" aria-hidden="true"></i> ${esc(job.where || `${city.name}, ${city.region}`)}</p>
                    <div class="jobs-detail-pay">${esc(job.pay)}</div>
                    ${facts.length ? `<dl class="jobs-facts">${facts.map(([label, value]) => `<div><dt>${label}</dt><dd>${esc(value)}</dd></div>`).join('')}</dl>` : ''}
                    ${job.about ? `<h3>About the ${job.ours ? 'listing' : 'job'}</h3><p class="jobs-detail-text">${esc(job.about)}</p>` : ''}
                    ${job.needs ? `<h3>You'll need</h3><p class="jobs-detail-text">${esc(job.needs)}</p>` : ''}
                    <div class="jobs-apply-wrap">
                        ${applyButton()}
                        <p class="jobs-apply-note">No interview round.${job.resume ? ' This employer asks for a resume, so keep one ready.' : ''}</p>
                    </div>
                </div>`;
            panel.querySelector('[data-action="back"]').focus({ preventScroll: true });
            return;
        }

        panel.innerHTML = `
            <div class="jobs-panel-head">
                <div>
                    <h2>${esc(city.name)}</h2>
                    <span class="jobs-panel-sub">${city.region ? `${esc(city.region)} · ` : ''}${countLabel(city.jobs.length)}</span>
                </div>
                <button type="button" class="jobs-icon-btn" data-action="close" aria-label="Close"><i class="fas fa-xmark" aria-hidden="true"></i></button>
            </div>
            <ul class="jobs-list">
                ${city.jobs.map((job, index) => `
                    <li>
                        <button type="button" class="jobs-card" data-job="${index}">
                            <span class="jobs-card-top">
                                <span class="jobs-card-title">${esc(job.title)}</span>
                                <span class="jobs-card-pay">${esc(job.pay)}</span>
                            </span>
                            <span class="jobs-card-meta">
                                <span class="jobs-tag${job.ours ? ' is-ours' : ''}">${esc(job.tag)}</span>
                                ${esc(job.ours ? job.where : job.company)}
                            </span>
                            <span class="jobs-card-foot">${esc([job.ours ? '' : job.where, job.posted].filter(Boolean).join(' · '))}</span>
                        </button>
                    </li>`).join('')}
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

    function showCounts() {
        const total = CITIES.reduce((sum, city) => sum + city.jobs.length, 0);
        document.getElementById('jobsTotal').textContent = loadState === 'ready' ? total : '–';
        document.getElementById('jobsCityCount').textContent = loadState === 'ready' ? CITIES.length : '–';
    }

    showCounts();
    renderCityList();
    renderPanel();
    loadJobs()
        .then((places) => {
            CITIES = places;
            loadState = 'ready';
        })
        .catch((error) => {
            console.warn('Sidegigs jobs could not load:', error);
            loadState = 'failed';
        })
        .then(() => {
            showCounts();
            buildMarkers();
            renderCityList();
            renderPanel();
            requestDraw();
        });
    resize();
    requestAnimationFrame(frame);
    // Open on the world, then turn and lean in to India.
    setTimeout(() => rotateTo(indiaView(), 2200), 350);
})();
