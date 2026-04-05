import requests

class EmailService:
    def __init__(self, script_url, secret_token):
        self.script_url = script_url
        self.secret_token = secret_token

    def send_otp(self, to_email, otp, purpose="reset"):
        if purpose == "register":
            subject = "Neo Account Verification OTP"
            html_content = self._get_register_template(otp)
        else:
            subject = "Neo Password Reset OTP"
            html_content = self._get_reset_template(otp)

        payload = {
            "secret_token": self.secret_token,
            "to": to_email,
            "subject": subject,
            "html": html_content
        }

        try:
            response = requests.post(self.script_url, json=payload)
            result = response.json()
            if response.status_code == 200 and result.get("status") == "success":
                print(f"OTP sent to {to_email} via Google Apps Script: {otp}")
            else:
                print(f"Failed to send. Google responded with: {result}")
        except Exception as e:
            print("Google Apps Script Error:", e)

    def _get_register_template(self, otp):
        return f"""
        <div style="font-family: sans-serif; color: #333;">
            <h2>Welcome to Neo!</h2>
            <p>Your OTP for account registration is: <strong style="font-size: 24px; color: #0d763a;">{otp}</strong></p>
            <p>This code will expire in 10 minutes.</p>
            <p>- Neo Team</p>
        </div>
        """

    def _get_reset_template(self, otp):
        return f"""
        <div style="font-family: sans-serif; color: #333;">
            <h2>Reset Your Password</h2>
            <p>We received a request to reset your password.</p>
            <p>Your One-Time Password (OTP) is: <strong style="font-size: 24px; color: #0d763a;">{otp}</strong></p>
            <p>This code will expire in 10 minutes. If you did not request this, please ignore this email.</p>
            <p>- Neo Team</p>
        </div>
        """