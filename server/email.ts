import nodemailer from "nodemailer";
import { Digest, FeedItem } from "../src/types";

export async function sendDigestEmail(to: string, items: FeedItem[]) {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS || !process.env.SMTP_FROM) {
    console.warn("SMTP credentials not configured. Email to %s skipped.", to);
    console.log("Digest Content Preview for %s:", to);
    console.log(items.map(i => `- ${i.title}`).join("\n"));
    throw new Error("SMTP configuration missing. Please set SMTP_HOST, SMTP_USER, SMTP_PASS, and SMTP_FROM in the Settings > Secrets menu.");
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: process.env.SMTP_PORT === "465", // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: {
      // Do not fail on invalid certificates (common in some corporate environments)
      rejectUnauthorized: false,
      // Some servers require specific versions
      minVersion: "TLSv1",
    }
  });

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 40px 20px; color: #1e293b; }
        .container { max-width: 680px; margin: 0 auto; }
        .header { text-align: center; margin-bottom: 40px; }
        .logo { background-color: #6366f1; color: white; width: 40px; height: 40px; line-height: 40px; border-radius: 12px; display: inline-block; font-weight: bold; font-size: 20px; margin-bottom: 10px; }
        .app-name { font-size: 24px; font-weight: 800; letter-spacing: -0.025em; color: #0f172a; margin: 0; }
        .grid { font-size: 0; text-align: center; }
        .card { 
          background-color: #ffffff; 
          border-radius: 24px; 
          border: 1px solid #e2e8f0; 
          padding: 20px; 
          margin-bottom: 24px; 
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); 
          display: inline-block;
          width: 310px;
          vertical-align: top;
          margin: 0 10px 20px 10px;
          font-size: 14px;
          text-align: left;
          box-sizing: border-box;
        }
        .card-meta { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.1em; }
        .card-title { font-size: 16px; font-weight: 700; line-height: 1.4; color: #1e293b; margin: 0 0 10px 0; text-decoration: none; display: block; min-height: 45px; }
        .card-summary { font-size: 13px; line-height: 1.5; color: #475569; margin: 0 0 16px 0; font-weight: 500; height: 60px; overflow: hidden; }
        .badge-container { margin-bottom: 16px; min-height: 24px; }
        .badge { background-color: #eef2ff; color: #4f46e5; padding: 3px 8px; border-radius: 6px; font-size: 9px; font-weight: 700; margin-right: 4px; text-transform: uppercase; }
        .footer { text-align: center; margin-top: 40px; color: #94a3b8; font-size: 12px; font-weight: 500; clear: both; }
        .button { display: inline-block; background-color: #6366f1; color: white; padding: 10px 20px; border-radius: 10px; text-decoration: none; font-weight: 700; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; }
        .source-tag { font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">D</div>
          <h1 class="app-name">Digest Intelligence</h1>
          <p style="color: #64748b; font-size: 14px; margin-top: 8px;">System Briefing: ${new Date().toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}</p>
        </div>

        <div class="grid">
          ${items.map((item, idx) => `
            <div class="card">
              ${item.imageUrl ? `
                <div style="margin: -20px -20px 20px -20px; height: 160px; overflow: hidden; border-radius: 23px 23px 0 0;">
                  <img src="${item.imageUrl}" style="width: 100%; h-auto; object-fit: cover;" alt="${item.title}">
                </div>
              ` : ""}
              <div class="card-meta">
                <span>NODE-${String(idx + 1).padStart(3, '0')}</span>
                <span class="source-tag">${item.sourceName || "SYSTEM"}</span>
              </div>
              <a href="${item.url}" class="card-title">${item.title}</a>
              <p class="card-summary">${item.summary}</p>
              <div class="badge-container">
                ${item.categories.map(cat => `<span class="badge">${cat}</span>`).join("")}
              </div>
              <div style="border-top: 1px solid #f1f5f9; padding-top: 20px;">
                <a href="${item.url}" class="button">View Report</a>
              </div>
            </div>
          `).join("")}
        </div>

        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} NewsDigest Autonomous Network</p>
          <p>Generated by Intelligence Agent &bull; Secure Transmission</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const info = await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject: `Your News Digest - ${new Date().toLocaleDateString()}`,
    html: htmlContent,
  });

  console.log("Message sent: %s", info.messageId);
}
