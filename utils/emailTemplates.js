function assignedCopiesHtml({ examinerName, paperTitle, count, link, email }) {
  // Adapted HTML template provided by user. Keep structure and styles, replace variables.
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>PIMS: Copies Assigned</title>
  <style>
    body, table, td, a { -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }
    table, td { mso-table-lspace:0pt; mso-table-rspace:0pt; }
    img { border:0; line-height:100%; outline:none; text-decoration:none; -ms-interpolation-mode:bicubic; }
    table { border-collapse:collapse !important; }
    body { margin:0; padding:0; width:100% !important; background-color:#f4f4f4; }
    @media screen and (max-width:600px) {
      .container { width:100% !important; padding:0 !important; }
      .mobile-center { text-align:center !important; }
    }
  </style>
</head>
<body style="font-family:Arial,sans-serif; background-color:#f4f4f4; padding:20px;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center">
        <table class="container" width="600" cellpadding="0" cellspacing="0" style="max-width:600px; background:#fff; border-radius:8px; overflow:hidden; box-shadow:0 4px 12px rgba(0,0,0,0.05);">
          <tr>
            <td style="background:#800000; padding:20px; text-align:center;">
              <img src="https://media.licdn.com/dms/image/v2/D4E0BAQG03u_JwSSOTg/company-logo_200_200/company-logo_200_200/0/1696437747519?e=2147483647&v=beta&t=Zvu-ZXadz0L420-4VWZNqRWCXn9SWwtH5e2mP1BFmi4" alt="PIMS Logo" width="40" style="vertical-align:middle; margin-right:8px;">
              <span style="color:#fff; font-size:24px; font-weight:bold; vertical-align:middle;">PIMS Evalu Pro</span>
            </td>
          </tr>
          <tr>
            <td style="padding:24px; color:#333;">
              <p style="margin-top:0;">Dear ${examinerName || 'Examiner'},</p>
              <p>
                You have been assigned <strong>${count}</strong> copy(ies) for the exam: <strong>${paperTitle}</strong>.
              </p>
              <p>
                Please login with this email <strong>${email}</strong> to view and evaluate the copies.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;">
                <tr>
                  <td style="border-top:1px solid #eee; padding-top:12px;">
                    <div style="font-size:12px; color:#777; text-transform:uppercase;">Action</div>
                    <div style="font-size:16px; font-weight:500;">
                      Click the button below to open the dashboard and start checking.
                    </div>
                  </td>
                </tr>
              </table>
              <p style="text-align:center;">
                <a href="${link}" style="display:inline-block;background:#800000;color:#fff !important;text-decoration:none;padding:12px 24px;border-radius:4px;font-weight:600;">Open Dashboard</a>
              </p>
              <p style="font-size:12px; color:#555; text-align:center; margin-bottom:0;">If you did not expect this, please ignore.</p>
            </td>
          </tr>
          <tr>
            <td style="background:#f0f0f0; padding:16px; text-align:center; font-size:12px; color:#666;">
              Prasad Institute of Medical Sciences, Sarai Shahzadi, Banthara, Kanpur Road, Lucknow (U.P) - 226401<br>
              <a href="https://pimslko.edu.in" style="color:#800000; text-decoration:none;">www.pimslko.edu.in</a> | +91-9721453166
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function updatedCopiesHtml({ examinerName, paperTitle, newCount, totalCount, link, email }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>PIMS: Copies Updated</title>
  <style>
    body, table, td, a { -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }
    table, td { mso-table-lspace:0pt; mso-table-rspace:0pt; }
    img { border:0; line-height:100%; outline:none; text-decoration:none; -ms-interpolation-mode:bicubic; }
    table { border-collapse:collapse !important; }
    body { margin:0; padding:0; width:100% !important; background-color:#f4f4f4; }
    @media screen and (max-width:600px) {
      .container { width:100% !important; padding:0 !important; }
      .mobile-center { text-align:center !important; }
    }
  </style>
</head>
<body style="font-family:Arial,sans-serif; background-color:#f4f4f4; padding:20px;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center">
        <table class="container" width="600" cellpadding="0" cellspacing="0" style="max-width:600px; background:#fff; border-radius:8px; overflow:hidden; box-shadow:0 4px 12px rgba(0,0,0,0.05);">
          <tr>
            <td style="background:#800000; padding:20px; text-align:center;">
              <img src="https://media.licdn.com/dms/image/v2/D4E0BAQG03u_JwSSOTg/company-logo_200_200/company-logo_200_200/0/1696437747519?e=2147483647&v=beta&t=Zvu-ZXadz0L420-4VWZNqRWCXn9SWwtH5e2mP1BFmi4" alt="PIMS Logo" width="40" style="vertical-align:middle; margin-right:8px;">
              <span style="color:#fff; font-size:24px; font-weight:bold; vertical-align:middle;">PIMS Evalu Pro</span>
            </td>
          </tr>
          <tr>
            <td style="padding:24px; color:#333;">
              <p style="margin-top:0;">Dear ${examinerName || 'Examiner'},</p>
              <p>
                Your assigned copies for the exam: <strong>${paperTitle}</strong> have been <strong>updated</strong>.
              </p>
              <p>
                <strong>${newCount}</strong> new copy(ies) have been assigned to you.<br>
                You now have a total of <strong>${totalCount}</strong> copy(ies) for this exam.
              </p>
              <p>
                Please login with this email <strong>${email}</strong> to view and evaluate your copies.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;">
                <tr>
                  <td style="border-top:1px solid #eee; padding-top:12px;">
                    <div style="font-size:12px; color:#777; text-transform:uppercase;">Action Required</div>
                    <div style="font-size:16px; font-weight:500;">
                      Click the button below to open the dashboard and view your updated assignments.
                    </div>
                  </td>
                </tr>
              </table>
              <p style="text-align:center;">
                <a href="${link}" style="display:inline-block;background:#800000;color:#fff !important;text-decoration:none;padding:12px 24px;border-radius:4px;font-weight:600;">Open Dashboard</a>
              </p>
              <p style="font-size:12px; color:#555; text-align:center; margin-bottom:0;">If you did not expect this, please contact the administrator.</p>
            </td>
          </tr>
          <tr>
            <td style="background:#f0f0f0; padding:16px; text-align:center; font-size:12px; color:#666;">
              Prasad Institute of Medical Sciences, Sarai Shahzadi, Banthara, Kanpur Road, Lucknow (U.P) - 226401<br>
              <a href="https://pimslko.edu.in" style="color:#800000; text-decoration:none;">www.pimslko.edu.in</a> | +91-9721453166
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

module.exports = { assignedCopiesHtml, updatedCopiesHtml };
