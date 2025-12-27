// assets/js/pages/auth.js (FULL FILE)
const stepPhone = document.getElementById('step-phone');
const stepOtp = document.getElementById('step-otp');
let phoneNumber = '';

document.addEventListener('DOMContentLoaded', () => {
    if (localStorage.getItem(APP_CONFIG.STORAGE_KEYS.TOKEN)) {
        window.location.href = APP_CONFIG.ROUTES.HOME;
        return;
    }
    document.getElementById('step-phone').addEventListener('submit', handleSendOtp);
    document.getElementById('step-otp').addEventListener('submit', handleVerifyAndLogin);
});

async function handleSendOtp(e) {
    e.preventDefault();
    const input = document.getElementById('phone-input').value;
    if (!Validators.isValidPhone(input)) return Toast.error("Invalid phone number");

    const btn = document.getElementById('get-otp-btn');
    const originalHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<div class="loader-spinner" style="width:20px;height:20px;border-width:2px;margin:0;"></div>';

    try {
        phoneNumber = `+91${input}`;
        await ApiService.post('/notifications/send-otp/', { phone: phoneNumber });
        stepPhone.style.display = 'none';
        stepOtp.style.display = 'block'; // Matches inline CSS usage in HTML
        document.getElementById('display-phone').innerText = phoneNumber;
        Toast.success("OTP Sent");
        
        // Start Timer
        if(window.startTimer) window.startTimer();
        
        setTimeout(() => {
            const firstInput = document.querySelector('.otp-input');
            if(firstInput) firstInput.focus();
        }, 100);

    } catch (err) { 
        Toast.error(err.message); 
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
        // CHANGED: Send OTP to register endpoint for verification + token
        const res = await ApiService.post('/auth/register/customer/', { 
            phone: phoneNumber, 
            otp: otp 
        });

        localStorage.setItem(APP_CONFIG.STORAGE_KEYS.TOKEN, res.access);

        // Fetch User Profile to confirm roles
        const user = await ApiService.get('/auth/me/');
        localStorage.setItem(APP_CONFIG.STORAGE_KEYS.USER, JSON.stringify(user));
        
        Toast.success("Login Successful");
        window.location.href = APP_CONFIG.ROUTES.HOME;

    } catch (err) {
        Toast.error(err.message);
        localStorage.clear();
        btn.disabled = false;
        btn.innerText = originalText;
    }
}