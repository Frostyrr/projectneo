import requests


class EmailService:
    def __init__(self, script_url, secret_token):
        self.script_url = script_url
        self.secret_token = secret_token

    def send_otp(self, to_email, otp, purpose="reset"):
        if purpose == "register":
            subject = "Neo Account Verification OTP"
            html_content = self._get_register_template(otp)

        elif purpose == "verify_old_email":
            subject = "Neo - Verify Account Modification"
            html_content = self._get_verify_old_email_template(otp)

        elif purpose == "update_email":
            subject = "Neo - Verify Your New Email"
            html_content = self._get_update_email_template(otp)

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
                print(f"OTP sent to {to_email}")
            else:
                print(f"Failed to send email: {result}")

        except Exception as e:
            print("Email Service Error:", e)

    # reuseable template
    def _neo_email_layout(self, title, subtitle, otp, color, footer_msg):
        return f"""
        <div style="margin:0; padding:0; background-color:#0f1113; font-family:'Segoe UI', Roboto, Arial, sans-serif;">
            <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
                <tr>
                    <td align="center">
                        
                        <table width="420" cellpadding="0" cellspacing="0"
                            style="
                                background:#161718;
                                border-radius:20px;
                                padding:36px 32px;
                                border:1px solid rgba(255,255,255,0.08);
                                box-shadow:0 24px 64px rgba(0,0,0,0.6);
                                text-align:center;
                            ">

                            <tr>
                                <td style="padding-bottom:12px;">
                                    <div style="
                                        font-size:16px;
                                        font-weight:600;
                                        color:{color};
                                        letter-spacing:0.3px;
                                    ">
                                        Neo
                                    </div>
                                </td>
                            </tr>

                            <tr>
                                <td>
                                    <h2 style="
                                        margin:0;
                                        color:#e8eaed;
                                        font-weight:600;
                                        font-size:20px;
                                    ">
                                        {title}
                                    </h2>

                                    <p style="
                                        margin:8px 0 0;
                                        color:#a1a1aa;
                                        font-size:13px;
                                        line-height:1.4;
                                    ">
                                        {subtitle}
                                    </p>
                                </td>
                            </tr>

                            <tr>
                                <td style="padding:26px 0 22px;">
                                    <div style="
                                        display:inline-block;
                                        background:rgba(255,255,255,0.04);
                                        color:{color};
                                        font-size:26px;
                                        font-weight:700;
                                        letter-spacing:8px;
                                        padding:14px 24px;
                                        border-radius:12px;
                                        border:1px solid rgba(255,255,255,0.08);
                                        box-shadow:0 0 20px rgba(0,0,0,0.3);
                                        font-family:'Courier New', monospace;
                                    ">
                                        {otp}
                                    </div>
                                </td>
                            </tr>

                            <tr>
                                <td>
                                    <p style="
                                        color:#c8cbd0;
                                        font-size:13px;
                                        margin:0;
                                    ">
                                        This code expires in <strong>10 minutes</strong>.
                                    </p>
                                </td>
                            </tr>

                            <tr>
                                <td style="padding-top:24px;">
                                    <p style="
                                        font-size:12px;
                                        color:#5a5d63;
                                        margin:0;
                                        line-height:1.4;
                                    ">
                                        {footer_msg}
                                    </p>

                                    <p style="
                                        font-size:12px;
                                        color:#5a5d63;
                                        margin-top:8px;
                                    ">
                                        — Neo Team
                                    </p>
                                </td>
                            </tr>

                        </table>

                    </td>
                </tr>
            </table>
        </div>
        """

    def _get_register_template(self, otp):
        return self._neo_email_layout(
            "Welcome to Neo",
            "Secure your account using the code below",
            otp,
            "#4ade96",
            "If you didn’t request this, you can safely ignore this email."
        )

    def _get_reset_template(self, otp):
        return self._neo_email_layout(
            "Reset Your Password",
            "Use this code to reset your password",
            otp,
            "#4ade96",
            "If you didn’t request this, secure your account immediately."
        )

    def _get_verify_old_email_template(self, otp):
        return self._neo_email_layout(
            "Verify Email Change",
            "Confirm your request to update your email",
            otp,
            "#4ade96",
            "If this wasn’t you, secure your account immediately."
        )

    def _get_update_email_template(self, otp):
        return self._neo_email_layout(
            "Confirm Your New Email",
            "Verify your new email address",
            otp,
            "#4ade96",
            "If this wasn’t you, you can ignore this email."
        )