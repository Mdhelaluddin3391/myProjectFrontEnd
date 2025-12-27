// assets/js/pages/auth.js

const stepPhone = document.getElementById('step-phone');
const stepOtp = document.getElementById('step-otp');
let phoneNumber = '';

document.addEventListener('DOMContentLoaded', () => {
    // अगर पहले से लॉगिन है तो होमपेज पर भेजें
    if (localStorage.getItem(APP_CONFIG.STORAGE_KEYS.TOKEN)) {
        window.location.href = APP_CONFIG.ROUTES.HOME;
        return;
    }
    
    const phoneForm = document.getElementById('step-phone');
    if (phoneForm) phoneForm.addEventListener('submit', handleSendOtp);
    
    const otpForm = document.getElementById('step-otp');
    if (otpForm) otpForm.addEventListener('submit', handleVerifyAndLogin);
});

async function handleSendOtp(e) {
    e.preventDefault();
    const input = document.getElementById('phone-input').value;
    
    // Indian Mobile Validation
    if (!/^[6-9]\d{9}$/.test(input)) {
        return Toast.error("Please enter a valid 10-digit mobile number");
    }

    const btn = document.getElementById('get-otp-btn');
    const originalHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = 'Sending...';

    try {
        phoneNumber = `+91${input}`; 
        // API Call: Send OTP
        await ApiService.post('/notifications/send-otp/', { phone: phoneNumber });
        
        stepPhone.style.display = 'none';
        stepOtp.style.display = 'block';
        document.getElementById('display-phone').innerText = phoneNumber;
        
        Toast.success("OTP Sent successfully");
        startTimerLocal();
        
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
    
    if(otp.length !== 6) return Toast.warning("Please enter complete 6-digit OTP");

    const btn = document.getElementById('verify-btn');
    const originalText = btn.innerText;
    btn.disabled = true;
    btn.innerText = "Verifying...";
    
    try {
        // FIX: Removed separate verify-otp call. 
        // Direct Register/Login call handles both verification and token generation.
        const res = await ApiService.post('/auth/register/customer/', { 
            phone: phoneNumber, 
            otp: otp 
        });

        if (res.access) {
            localStorage.setItem(APP_CONFIG.STORAGE_KEYS.TOKEN, res.access);
            if(res.refresh) localStorage.setItem(APP_CONFIG.STORAGE_KEYS.REFRESH, res.refresh);
            
            // Fetch Profile immediately to update UI
            try {
                const user = await ApiService.get('/auth/me/');
                localStorage.setItem(APP_CONFIG.STORAGE_KEYS.USER, JSON.stringify(user));
            } catch(e) { console.warn("Profile fetch failed", e); }
            
            Toast.success("Login Successful");
            window.location.href = APP_CONFIG.ROUTES.HOME;
        } else {
            throw new Error("No access token received");
        }

    } catch (err) {
        console.error(err);
        Toast.error(err.message || "Verification Failed");
        btn.disabled = false;
        btn.innerText = originalText;
    }
}

function startTimerLocal() {
    let time = 30;
    const el = document.getElementById('timer');
    if(!el) return;
    const interval = setInterval(() => {
        el.innerText = --time;
        if(time <= 0) clearInterval(interval);
    }, 1000);
}

// UI Helpers
window.focusNext = function(el) {
    if (el.value.length === 1 && el.nextElementSibling) el.nextElementSibling.focus();
}

window.resetForm = function() {
    stepOtp.style.display = 'none';
    stepPhone.style.display = 'block';
    document.getElementById('get-otp-btn').disabled = false;
}