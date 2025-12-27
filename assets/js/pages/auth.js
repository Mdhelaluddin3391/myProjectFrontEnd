// assets/js/pages/auth.js
const stepPhone = document.getElementById('step-phone');
const stepOtp = document.getElementById('step-otp');
let phoneNumber = '';

document.addEventListener('DOMContentLoaded', () => {
    // Redirect if already logged in
    if (localStorage.getItem(APP_CONFIG.STORAGE_KEYS.TOKEN)) {
        window.location.href = APP_CONFIG.ROUTES.HOME;
        return;
    }
    
    // Bind Forms
    const phoneForm = document.getElementById('step-phone');
    if (phoneForm) phoneForm.addEventListener('submit', handleSendOtp);
    
    const otpForm = document.getElementById('step-otp');
    if (otpForm) otpForm.addEventListener('submit', handleVerifyAndLogin);
});

async function handleSendOtp(e) {
    e.preventDefault();
    const input = document.getElementById('phone-input').value;
    
    // Backend expects "+91..." format. Validate strictly.
    if (!/^[6-9]\d{9}$/.test(input)) {
        return Toast.error("Invalid Indian mobile number");
    }

    const btn = document.getElementById('get-otp-btn');
    const originalHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<div class="loader-spinner" style="width:20px;height:20px;border-width:2px;margin:0;"></div>';

    try {
        phoneNumber = `+91${input}`; // Backend Format
        await ApiService.post('/notifications/send-otp/', { phone: phoneNumber });
        
        stepPhone.style.display = 'none';
        stepOtp.style.display = 'block';
        document.getElementById('display-phone').innerText = phoneNumber;
        
        Toast.success("OTP Sent");
        
        // Start Timer (assuming startTimer function exists in global scope or we define it)
        if(window.startTimer) window.startTimer();
        else startTimerLocal();
        
        setTimeout(() => {
            const firstInput = document.querySelector('.otp-input');
            if(firstInput) firstInput.focus();
        }, 100);

    } catch (err) { 
        console.error(err);
        Toast.error(err.message || "Failed to send OTP"); 
    } finally {
        btn.innerHTML = originalHtml;
        btn.disabled = false;
    }
}

async function handleVerifyAndLogin(e) {
    e.preventDefault();
    let otp = '';
    document.querySelectorAll('.otp-input').forEach(i => otp += i.value);
    
    if(otp.length !== 6) return Toast.warning("Please enter complete OTP");

    const btn = document.getElementById('verify-btn');
    const originalText = btn.innerText;
    btn.disabled = true;
    btn.innerText = "Verifying...";
    
    try {
        /**
         * CRITICAL FIX: 
         * Do NOT call /notifications/verify-otp/ separately.
         * The /auth/register/customer/ endpoint performs verification AND login/creation atomically.
         */
        const res = await ApiService.post('/auth/register/customer/', { 
            phone: phoneNumber, 
            otp: otp 
        });

        if (res.access) {
            localStorage.setItem(APP_CONFIG.STORAGE_KEYS.TOKEN, res.access);
            
            // Re-fetch Profile to ensure we have fresh user data
            const user = await ApiService.get('/auth/me/');
            localStorage.setItem(APP_CONFIG.STORAGE_KEYS.USER, JSON.stringify(user));
            
            Toast.success("Login Successful");
            window.location.href = APP_CONFIG.ROUTES.HOME;
        } else {
            throw new Error("No access token received");
        }

    } catch (err) {
        console.error(err);
        Toast.error(err.message || "Verification Failed");
        localStorage.clear();
        btn.disabled = false;
        btn.innerText = originalText;
    }
}

// Local helper if not in HTML
function startTimerLocal() {
    let time = 30;
    const el = document.getElementById('timer');
    if(!el) return;
    const interval = setInterval(() => {
        el.innerText = --time;
        if(time <= 0) clearInterval(interval);
    }, 1000);
}

// Helper for OTP inputs focus
window.focusNext = function(el) {
    if (el.value.length === 1 && el.nextElementSibling) el.nextElementSibling.focus();
}

window.resetForm = function() {
    stepOtp.style.display = 'none';
    stepPhone.style.display = 'block';
    document.getElementById('get-otp-btn').disabled = false;
}