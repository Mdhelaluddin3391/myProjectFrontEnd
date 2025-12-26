const stepPhone = document.getElementById('step-phone');
const stepOtp = document.getElementById('step-otp');
let phoneNumber = '';

document.addEventListener('DOMContentLoaded', () => {
    // Check if already logged in
    if(localStorage.getItem(APP_CONFIG.STORAGE_KEYS.TOKEN)) {
        window.location.href = APP_CONFIG.ROUTES.HOME;
        return;
    }

    document.getElementById('step-phone').addEventListener('submit', handleSendOtp);
    document.getElementById('step-otp').addEventListener('submit', handleVerifyOtp);
});

async function handleSendOtp(e) {
    e.preventDefault();
    const input = document.getElementById('phone-input').value;
    
    if(!Validators.isValidPhone(input)) {
        return Toast.error("Invalid Indian mobile number");
    }

    const btn = document.getElementById('get-otp-btn');
    toggleBtnLoading(btn, true);

    try {
        phoneNumber = input;
        await ApiService.post('/notifications/send-otp/', { phone: `+91${phoneNumber}` });
        
        stepPhone.style.display = 'none';
        stepOtp.style.display = 'block';
        document.getElementById('display-phone').innerText = `+91 ${phoneNumber}`;
        Toast.success("OTP Sent!");
        
        startTimer();
        setTimeout(() => document.querySelector('.otp-input').focus(), 100);
        
    } catch(err) {
        Toast.error(err.message);
    } finally {
        toggleBtnLoading(btn, false, 'Get OTP <i class="fas fa-arrow-right"></i>');
    }
}

async function handleVerifyOtp(e) {
    e.preventDefault();
    let otp = '';
    document.querySelectorAll('.otp-input').forEach(i => otp += i.value);
    
    if(!Validators.isValidOTP(otp)) return Toast.warning("Enter valid 6-digit OTP");

    const btn = document.getElementById('verify-btn');
    toggleBtnLoading(btn, true, 'Verifying...');

    try {
        // 1. OTP Verify
        await ApiService.post('/notifications/verify-otp/', { phone: `+91${phoneNumber}`, otp: otp });
        
        // 2. Login/Register
        const res = await ApiService.post('/auth/register/customer/', { phone: `+91${phoneNumber}` });
        
        if(res.access) localStorage.setItem(APP_CONFIG.STORAGE_KEYS.TOKEN, res.access);

        // 3. Fetch Profile to check if user is active/blocked
        const profile = await ApiService.get('/auth/me/');
        
        // Agar user active nahi hai (Backend se block hai)
        if (!profile.is_active) {
            throw new Error("Your account is temporarily suspended due to multiple cancellations. Please contact support.");
        }

        localStorage.setItem(APP_CONFIG.STORAGE_KEYS.USER, JSON.stringify(profile));
        Toast.success("Login Successful");
        window.location.href = APP_CONFIG.ROUTES.HOME;

    } catch(err) {
        // Yahan 'user_blocked' ya custom message handle hoga
        Toast.error(err.message || "Verification Failed");
        toggleBtnLoading(btn, false, 'Verify & Login');
    }
}

// Helpers
window.focusNext = function(el) {
    if (el.value.length === 1 && el.nextElementSibling) el.nextElementSibling.focus();
}

window.resetForm = function() {
    stepOtp.style.display = 'none';
    stepPhone.style.display = 'block';
}

function startTimer() {
    let time = 30;
    const el = document.getElementById('timer');
    const interval = setInterval(() => {
        el.innerText = --time;
        if(time <= 0) clearInterval(interval);
    }, 1000);
}

function toggleBtnLoading(btn, isLoading, text = '') {
    if(isLoading) {
        btn.disabled = true;
        btn.innerHTML = '<div class="loader-spinner" style="width:20px;height:20px;border-width:2px;margin:0;"></div>';
    } else {
        btn.disabled = false;
        btn.innerHTML = text;
    }
}