import { Resend } from "resend";

let resendClient: Resend | null = null;

const getResendClient = (): Resend => {
  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return resendClient;
};

const generateOtp = (size: number): string => {
  const characters = "0123456789";
  let otp = "";
  for (let i = 0; i < size; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    otp += characters[randomIndex];
  }
  return otp;
};

export const sendWelcomeEmail = async (to: string) => {
  const { data, error } = await getResendClient().emails.send({
    from: "NawaNapam <welcome@mail.nawanapam.com>",
    to,
    subject: "Welcome to NawaNapam",
    html: `
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f6f6f6; padding:40px 0;">
        <tr>
          <td align="center">
            <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:8px; padding:32px; font-family: Arial, Helvetica, sans-serif; color:#111;">

              <!-- Header -->
              <tr>
                <td style="padding-bottom:24px;">
                  <h1 style="margin:0; font-size:22px; font-weight:600; color:#000;">
                    Welcome to NawaNapam
                  </h1>
                </td>
              </tr>

              <!-- Greeting -->
              <tr>
                <td style="padding-bottom:16px;">
                  <p style="margin:0; font-size:14px; color:#444;">
                    Hello,
                  </p>
                </td>
              </tr>

              <!-- Body -->
              <tr>
                <td style="padding-bottom:20px;">
                  <p style="margin:0; font-size:14px; color:#444; line-height:1.6;">
                    We’re excited to have you join <strong>NawaNapam</strong>. Your account has been successfully created, and you’re all set to explore the platform.
                  </p>
                </td>
              </tr>

              <tr>
                <td style="padding-bottom:20px;">
                  <p style="margin:0; font-size:14px; color:#444; line-height:1.6;">
                    Discover features designed to make your experience smooth, secure, and enjoyable.
                  </p>
                </td>
              </tr>

              <!-- Divider -->
              <tr>
                <td style="padding:24px 0;">
                  <hr style="border:none; border-top:1px solid #eee;" />
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td>
                  <p style="margin:0; font-size:12px; color:#888;">
                    If you have any questions, feel free to reach out to us anytime.
                  </p>
                  <p style="margin:8px 0 0; font-size:12px; color:#888;">
                    © ${new Date().getFullYear()} NawaNapam. All rights reserved.
                  </p>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    `,
  });

  return { data, error };
};

export const sendOtpEmail = async (to: string) => {
  const otp = generateOtp(6);

  const { data, error } = await getResendClient().emails.send({
    from: "NawaNapam <otp@mail.nawanapam.com>",
    to,
    subject: "Your NawaNapam Verification Code",
    html: `
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f6f6f6; padding:40px 0;">
        <tr>
          <td align="center">
            <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:8px; padding:32px; font-family: Arial, Helvetica, sans-serif; color:#111;">
              
              <!-- Header -->
              <tr>
                <td style="padding-bottom:24px;">
                  <h1 style="margin:0; font-size:22px; font-weight:600; color:#000;">
                    NawaNapam
                  </h1>
                </td>
              </tr>

              <!-- Body -->
              <tr>
                <td style="padding-bottom:16px;">
                  <p style="margin:0; font-size:14px; color:#444;">
                    Hello,
                  </p>
                </td>
              </tr>

              <tr>
                <td style="padding-bottom:20px;">
                  <p style="margin:0; font-size:14px; color:#444; line-height:1.6;">
                    Use the verification code below to complete your request. This code is valid for a limited time.
                  </p>
                </td>
              </tr>

              <!-- OTP Box -->
              <tr>
                <td align="center" style="padding:24px 0;">
                  <div style="
                    display:inline-block;
                    padding:14px 28px;
                    border:1px dashed #000;
                    border-radius:6px;
                    font-size:24px;
                    letter-spacing:6px;
                    font-weight:600;
                    color:#000;
                  ">
                    ${otp}
                  </div>
                </td>
              </tr>

              <!-- Info -->
              <tr>
                <td style="padding-top:12px;">
                  <p style="margin:0; font-size:13px; color:#666; line-height:1.6;">
                    If you didn’t request this code, you can safely ignore this email.
                  </p>
                </td>
              </tr>

              <!-- Divider -->
              <tr>
                <td style="padding:24px 0;">
                  <hr style="border:none; border-top:1px solid #eee;" />
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td>
                  <p style="margin:0; font-size:12px; color:#888;">
                    © ${new Date().getFullYear()} NawaNapam. All rights reserved.
                  </p>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    `,
  });

  return { data, error, otp };
};
export const sendAdminNotificationEmail = async (
  to: string,
  subject: string,
  message: string,
) => {
  const { data, error } = await getResendClient().emails.send({
    from: "NawaNapam <admin@mail.nawanapam.com>",
    to,
    subject,
    html: `
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f6f6f6; padding:40px 0;">
        <tr>
          <td align="center">
            <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:8px; padding:32px; font-family: Arial, Helvetica, sans-serif; color:#111;">
            
              <tr>
                <td style="padding-bottom:24px;">
                  <h1 style="margin:0; font-size:22px; font-weight:600; color:#000;">
                    ${subject}
                  </h1>
                </td>
              </tr>

              <tr>
                <td style="padding-bottom:20px; font-size:14px; color:#444; line-height:1.6;">
                  ${message.replace(/\n/g, "<br>")}
                </td>
              </tr>

              <tr>
                <td style="padding-bottom:20px; font-size:14px; color:#444;">
                  Admin Console: <a href="https://admin.nawanapam.com/console" target="_blank" style="color:#0066ff;">https://admin.nawanapam.com/console</a>
                </td>
              </tr>

              <tr>
                <td style="padding:24px 0;">
                  <hr style="border:none; border-top:1px solid #eee;" />
                </td>
              </tr>

              <tr>
                <td>
                  <p style="margin:0; font-size:12px; color:#888;">
                    © ${new Date().getFullYear()} NawaNapam. All rights reserved.
                  </p>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    `,
  });

  return { data, error };
};
