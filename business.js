// Business page: sign in or sign up with a mobile number or email, then set up
// the business profile and pick a plan. Mirrors the business onboarding in the app.
(function () {
    'use strict';

    const API = 'https://api.sidegigs.app/api';
    const TIMEOUT = 15000;
    const RESEND_AFTER = 30;
    const TOKEN_KEY = 'sg_biz_token';
    const STATE_KEY = 'sg_biz_setup';

    // The API only has mobile OTP login for managers so far. Email login and
    // saving the business profile have no endpoint yet: fill these in when
    // they exist. Until then email works only on a local preview (code 123456)
    // and the profile is kept in this browser.
    const ENDPOINTS = {
        phoneSend: '/auth/manager/send_otp',
        phoneVerify: '/auth/manager/login_by_otp',
        emailSend: null,
        emailVerify: null,
        saveBusiness: null
    };
    const LOCAL = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
    const PREVIEW_CODE = '123456';

    const STEPS = ['auth', 'kind', 'identity', 'details', 'plan', 'done'];
    const SETUP = ['kind', 'identity', 'details'];
    const PLANS = { free: 'Basic Plan', growth: 'Growth Plan', plus: 'Professional Plus Plan' };
    const DOCS = {
        pan: {
            label: 'Enter your PAN number to verify',
            placeholder: 'Ex: ABCDE1234F',
            pattern: /^[A-Z]{5}[0-9]{4}[A-Z]$/,
            error: 'A PAN has 5 letters, 4 numbers and a letter, like ABCDE1234F.'
        },
        udyam: {
            label: 'Enter your Udyam registration number to verify',
            placeholder: 'Ex: UDYAM-KL-07-0012345',
            pattern: /^UDYAM-[A-Z]{2}-[0-9]{2}-[0-9]{7}$/,
            error: 'A Udyam number looks like UDYAM-KL-07-0012345.'
        }
    };

    const $ = (id) => document.getElementById(id);
    let state = readState();
    let tempToken = '';
    let resendTimer = null;

    // ---------- Storage ----------

    function readState() {
        try {
            return JSON.parse(sessionStorage.getItem(STATE_KEY)) || {};
        } catch (error) {
            return {};
        }
    }

    function saveState() {
        try {
            sessionStorage.setItem(STATE_KEY, JSON.stringify(state));
        } catch (error) {
            // Private windows can refuse storage; the flow still works without it.
        }
    }

    function token() {
        try {
            return localStorage.getItem(TOKEN_KEY) || '';
        } catch (error) {
            return '';
        }
    }

    function setToken(value) {
        try {
            if (value) localStorage.setItem(TOKEN_KEY, value);
            else localStorage.removeItem(TOKEN_KEY);
        } catch (error) {
            // See saveState.
        }
    }

    // ---------- Backend ----------

    async function post(path, body) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), TIMEOUT);
        try {
            const headers = { 'Content-Type': 'application/json' };
            if (token()) headers.Authorization = `Bearer ${token()}`;
            const response = await fetch(`${API}${path}`, {
                method: 'POST',
                headers,
                body: JSON.stringify(body),
                signal: controller.signal
            });
            const json = await response.json().catch(() => ({}));
            if (!response.ok || json.status === false) {
                const detail = json.errors && Object.values(json.errors)[0];
                throw new Error(detail || json.message || 'Something went wrong. Try again.');
            }
            return json;
        } catch (error) {
            if (error.name === 'AbortError') throw new Error('The server took too long. Try again.');
            if (error instanceof TypeError) throw new Error('Could not reach Sidegigs. Check your connection.');
            throw error;
        } finally {
            clearTimeout(timer);
        }
    }

    function pick(json, keys) {
        for (const source of [json.data, json]) {
            if (!source || typeof source !== 'object') continue;
            for (const key of keys) if (source[key]) return source[key];
        }
        return '';
    }

    async function sendCode(method, value) {
        if (method === 'phone') {
            const json = await post(ENDPOINTS.phoneSend, { phone: value });
            tempToken = pick(json, ['temp_token', 'tempToken', 'token']);
            return;
        }
        if (ENDPOINTS.emailSend) {
            const json = await post(ENDPOINTS.emailSend, { email: value });
            tempToken = pick(json, ['temp_token', 'tempToken', 'token']);
            return;
        }
        if (!LOCAL) throw new Error('Email sign in is not open yet. Use your mobile number for now.');
        tempToken = 'preview';
    }

    async function verifyCode(method, code) {
        const path = method === 'phone' ? ENDPOINTS.phoneVerify : ENDPOINTS.emailVerify;
        if (path) {
            const json = await post(path, { temp_token: tempToken, otp: code, fcm_token: '' });
            return pick(json, ['token', 'access_token', 'accessToken']) || 'signed-in';
        }
        if (code !== PREVIEW_CODE) throw new Error('That code is not right.');
        return 'preview';
    }

    async function saveBusiness() {
        if (ENDPOINTS.saveBusiness) {
            const { kind, agency, gst, doc, docNumber, name, type, role, plan } = state;
            await post(ENDPOINTS.saveBusiness, { kind, agency, gst, doc, docNumber, name, type, role, plan });
        }
    }

    // ---------- Steps ----------

    function show(step) {
        state.step = step;
        saveState();
        document.querySelectorAll('[data-step]').forEach((section) => {
            section.hidden = section.dataset.step !== step;
        });
        const inCard = STEPS.indexOf(step) <= STEPS.indexOf('details');
        $('bizCard').hidden = !inCard;

        const setupIndex = SETUP.indexOf(step);
        $('bizFoot').hidden = setupIndex < 0;
        if (setupIndex >= 0) {
            document.querySelectorAll('.biz-progress span').forEach((bar, i) => {
                bar.classList.toggle('is-on', i <= setupIndex);
            });
            $('bizBack').hidden = setupIndex === 0;
            $('bizNext').textContent = step === 'details' ? 'Save & Continue' : 'Next';
        }
        if (step === 'done') fillDone();
        window.scrollTo(0, 0);
        const title = document.querySelector(`[data-step="${step}"] h1`);
        if (title) {
            title.tabIndex = -1;
            title.focus({ preventScroll: true });
        }
    }

    function back() {
        const i = STEPS.indexOf(state.step);
        if (i > 1) show(STEPS[i - 1]);
    }

    // ---------- Sign in ----------

    let method = 'phone';

    function setMethod(next) {
        method = next;
        document.querySelectorAll('.biz-tab').forEach((tab) => {
            const on = tab.dataset.method === next;
            tab.classList.toggle('is-on', on);
            tab.setAttribute('aria-selected', on);
        });
        document.querySelectorAll('[data-for]').forEach((field) => {
            field.hidden = field.dataset.for !== next;
        });
        $('authSendError').textContent = '';
    }

    function readTarget() {
        if (method === 'phone') {
            const phone = $('authPhone').value.replace(/\D/g, '').replace(/^91(?=\d{10}$)/, '');
            if (!/^[6-9]\d{9}$/.test(phone)) throw new Error('Enter a 10-digit Indian mobile number.');
            return { value: phone, shown: `+91 ${phone.slice(0, 5)} ${phone.slice(5)}` };
        }
        const email = $('authEmail').value.trim().toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) throw new Error('Enter a valid email address.');
        return { value: email, shown: email };
    }

    async function busy(button, task) {
        const label = button.textContent;
        button.disabled = true;
        button.textContent = 'Please wait…';
        try {
            await task();
        } finally {
            button.disabled = false;
            button.textContent = label;
        }
    }

    function startResendTimer() {
        clearInterval(resendTimer);
        let left = RESEND_AFTER;
        const button = $('authResend');
        const tick = () => {
            button.disabled = left > 0;
            button.textContent = left > 0 ? `Resend code in ${left}s` : 'Resend code';
            if (left-- <= 0) clearInterval(resendTimer);
        };
        tick();
        resendTimer = setInterval(tick, 1000);
    }

    let target = null;

    async function onSend(event) {
        event.preventDefault();
        const error = $('authSendError');
        error.textContent = '';
        try {
            target = readTarget();
        } catch (problem) {
            error.textContent = problem.message;
            return;
        }
        await busy(event.submitter || $('authSend').querySelector('button'), async () => {
            try {
                await sendCode(method, target.value);
                $('authTarget').textContent = target.shown;
                $('authSend').hidden = true;
                $('authVerify').hidden = false;
                document.querySelector('.biz-tabs').hidden = true;
                $('authCode').value = '';
                $('authCode').focus();
                startResendTimer();
            } catch (problem) {
                error.textContent = problem.message;
            }
        });
    }

    async function onVerify(event) {
        event.preventDefault();
        const error = $('authVerifyError');
        error.textContent = '';
        const code = $('authCode').value.replace(/\D/g, '');
        if (code.length < 4) {
            error.textContent = 'Enter the code we sent you.';
            return;
        }
        await busy(event.submitter || $('authVerify').querySelector('button'), async () => {
            try {
                setToken(await verifyCode(method, code));
                state.signedInAs = target.shown;
                clearInterval(resendTimer);
                show('kind');
            } catch (problem) {
                error.textContent = problem.message;
            }
        });
    }

    function backToSend() {
        clearInterval(resendTimer);
        $('authVerify').hidden = true;
        $('authSend').hidden = false;
        document.querySelector('.biz-tabs').hidden = false;
        $('authVerifyError').textContent = '';
    }

    async function onResend() {
        const error = $('authVerifyError');
        error.textContent = '';
        try {
            await sendCode(method, target.value);
            startResendTimer();
        } catch (problem) {
            error.textContent = problem.message;
        }
    }

    // ---------- Setup ----------

    function choose(field, value) {
        state[field] = value;
        if (field === 'doc') {
            state.docVerified = false;
            showDoc();
        }
        saveState();
        paintChoices();
    }

    function paintChoices() {
        document.querySelectorAll('[data-field]').forEach((button) => {
            const on = state[button.dataset.field] === button.dataset.value;
            button.classList.toggle('is-on', on);
            button.setAttribute('aria-checked', on);
        });
        document.querySelectorAll('.biz-compare [data-col]').forEach((cell) => {
            cell.classList.toggle('is-on', cell.dataset.col === state.plan);
        });
    }

    function showDoc() {
        const doc = DOCS[state.doc] || DOCS.pan;
        $('docLabel').textContent = doc.label;
        $('docNumber').placeholder = doc.placeholder;
        const verify = $('docVerify');
        verify.classList.toggle('is-done', !!state.docVerified);
        verify.innerHTML = state.docVerified
            ? '<i class="fas fa-check" aria-hidden="true"></i> Verified'
            : 'Verify';
    }

    // Checks the number's format. There is no lookup endpoint yet.
    function verifyDoc() {
        const error = $('docError');
        const doc = DOCS[state.doc];
        if (!doc) {
            error.textContent = 'Choose PAN or Udyam Aadhar first.';
            return;
        }
        const number = $('docNumber').value.toUpperCase().replace(/\s/g, '');
        $('docNumber').value = number;
        if (!doc.pattern.test(number)) {
            error.textContent = doc.error;
            state.docVerified = false;
        } else {
            error.textContent = '';
            state.docNumber = number;
            state.docVerified = true;
        }
        saveState();
        showDoc();
    }

    function checkStep(step) {
        if (step === 'kind') {
            if (!state.kind) return 'Choose what best describes your business.';
            if (!state.agency) return 'Tell us if you are a recruitment agency.';
        }
        if (step === 'identity') {
            if (!state.gst) return 'Tell us if you are GST registered.';
            if (!state.doc) return 'Choose a document to verify your business.';
            if (!state.docVerified) return 'Enter your document number and tap Verify.';
        }
        if (step === 'details') {
            state.name = $('bizName').value.trim();
            state.type = $('bizType').value;
            state.role = $('bizRole').value;
            saveState();
            if (!state.name) return 'Enter your business name.';
            if (!state.type) return 'Choose your business type.';
            if (!state.role) return 'Choose your designation.';
        }
        return '';
    }

    function errorBoxFor(step) {
        return { kind: null, identity: $('docError'), details: $('detailsError') }[step];
    }

    let kindError = null;

    function onNext() {
        const step = state.step;
        const problem = checkStep(step);
        const box = errorBoxFor(step) || kindError;
        if (box) box.textContent = problem;
        if (problem) return;
        show(STEPS[STEPS.indexOf(step) + 1]);
    }

    function onLogo() {
        const file = $('bizLogo').files[0];
        const preview = $('bizLogoPreview');
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
            $('detailsError').textContent = 'Pick an image under 5 MB.';
            $('bizLogo').value = '';
            return;
        }
        $('detailsError').textContent = '';
        preview.src = URL.createObjectURL(file);
        preview.hidden = false;
        $('bizLogoHint').innerHTML = `<i class="far fa-image" aria-hidden="true"></i> ${escapeHtml(file.name)} · Change`;
    }

    async function onPlan() {
        const error = $('planError');
        if (!state.plan) {
            error.textContent = 'Choose a plan to continue.';
            return;
        }
        error.textContent = '';
        await busy($('planNext'), async () => {
            try {
                await saveBusiness();
                show('done');
            } catch (problem) {
                error.textContent = problem.message;
            }
        });
    }

    function fillDone() {
        const plan = PLANS[state.plan] || PLANS.free;
        const paid = state.plan && state.plan !== 'free';
        $('doneText').textContent = `${state.name || 'Your business'} is on the ${plan}.` +
            (paid ? ' Finish the payment in the app to unlock it.' : '');
    }

    function signOut() {
        setToken('');
        state = {};
        saveState();
        tempToken = '';
        target = null;
        backToSend();
        setMethod('phone');
        $('authPhone').value = '';
        $('authEmail').value = '';
        restoreFields();
        paintChoices();
        show('auth');
    }

    function restoreFields() {
        $('bizName').value = state.name || '';
        $('bizType').value = state.type || '';
        $('bizRole').value = state.role || '';
        $('docNumber').value = state.docNumber || '';
        showDoc();
    }

    function escapeHtml(text) {
        return String(text).replace(/[&<>"']/g, (c) => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        }[c]));
    }

    // ---------- Wiring ----------

    function init() {
        kindError = document.createElement('p');
        kindError.className = 'biz-error';
        kindError.setAttribute('role', 'alert');
        document.querySelector('[data-step="kind"]').appendChild(kindError);

        document.querySelectorAll('.biz-tab').forEach((tab) => {
            tab.addEventListener('click', () => setMethod(tab.dataset.method));
        });
        $('authSend').addEventListener('submit', onSend);
        $('authVerify').addEventListener('submit', onVerify);
        $('authChange').addEventListener('click', backToSend);
        $('authResend').addEventListener('click', onResend);
        $('authPhone').addEventListener('input', (event) => {
            event.target.value = event.target.value.replace(/\D/g, '').slice(0, 10);
        });

        document.querySelectorAll('[data-field]').forEach((button) => {
            button.addEventListener('click', () => {
                choose(button.dataset.field, button.dataset.value);
                const box = errorBoxFor(state.step) || kindError;
                if (state.step !== 'plan' && box) box.textContent = '';
            });
        });
        $('docVerify').addEventListener('click', verifyDoc);
        $('docNumber').addEventListener('input', () => {
            if (state.docVerified) {
                state.docVerified = false;
                saveState();
                showDoc();
            }
        });
        $('docNumber').addEventListener('keydown', (event) => {
            if (event.key === 'Enter') verifyDoc();
        });
        $('bizLogo').addEventListener('change', onLogo);
        $('bizNext').addEventListener('click', onNext);
        $('bizBack').addEventListener('click', back);
        document.querySelector('[data-back]').addEventListener('click', back);
        $('planNext').addEventListener('click', onPlan);
        $('bizSignOut').addEventListener('click', signOut);

        restoreFields();
        paintChoices();
        const resume = token() && STEPS.includes(state.step) && state.step !== 'auth' ? state.step : null;
        show(token() ? (resume || 'kind') : 'auth');
    }

    init();
})();
