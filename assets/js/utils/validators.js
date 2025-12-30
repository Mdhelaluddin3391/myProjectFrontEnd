const Validators = {
    isValidPhone: (phone) => {
        // Indian Phone Regex (6-9 start, 10 digits)
        const re = /^[6-9]\d{9}$/;
        return re.test(phone);
    },

    isValidEmail: (email) => {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    },

    isValidPincode: (pin) => {
        const re = /^[1-9][0-9]{5}$/;
        return re.test(pin);
    },

    isNotEmpty: (val) => {
        return val && val.trim().length > 0;
    },

    isValidOTP: (otp) => {
        return /^\d{6}$/.test(otp);
    }
};

window.Validators = Validators;