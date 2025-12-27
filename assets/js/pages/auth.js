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
    document.getElementById('step-otp').addEventListener('submit', handleVerifyOtp);
});

async function handleSendOtp(e) {
    e.preventDefault();
    const input = document.getElementById('phone-input').value;
    if (!Validators.isValidPhone(input)) return Toast.error("Invalid phone number");

    try {
        phoneNumber = `+91${input}`;
        await ApiService.post('/notifications/send-otp/', { phone: phoneNumber });
        stepPhone.classList.add('d-none');
        stepOtp.classList.remove('d-none');
        document.getElementById('display-phone').innerText = phoneNumber;
        Toast.success("OTP Sent");
        document.querySelector('.otp-input').focus();
    } catch (err) { Toast.error(err.message); }
}

async function handleVerifyOtp(e) {
    e.preventDefault();
    let otp = '';
    document.querySelectorAll('.otp-input').forEach(i => otp += i.value);
    
    try {
        // 1. Verify and Register
        const res = await ApiService.post('/auth/register/customer/', { phone: phoneNumber, otp: otp });
        localStorage.setItem(APP_CONFIG.STORAGE_KEYS.TOKEN, res.access);

        // 2. Profile & Role Validation
        const user = await ApiService.get('/auth/me/');
        const roles = user.roles || [];
        
        if (!roles.some(r => r.role === 'customer')) {
            throw new Error("Unauthorized: Customer role required.");
        }

        localStorage.setItem(APP_CONFIG.STORAGE_KEYS.USER, JSON.stringify(user));
        window.location.href = APP_CONFIG.ROUTES.HOME;
    } catch (err) {
        Toast.error(err.message);
        localStorage.clear();
    }
}