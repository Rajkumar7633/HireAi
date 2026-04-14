import nodemailer from "nodemailer"

export interface SendEmailOptions {
  to: string
  subject: string
  html: string
  text?: string
  attachments?: Array<{ filename: string; content?: Buffer | string; path?: string; contentType?: string; cid?: string }>
}

// Email transporter configuration
let transporter: nodemailer.Transporter | null = null

function getTransporter() {
  if (transporter) return transporter
  const host = process.env.SMTP_HOST || process.env.EMAIL_SERVICE_HOST
  const port = Number(process.env.SMTP_PORT || process.env.EMAIL_SERVICE_PORT || 587)
  const user = process.env.SMTP_USER || process.env.EMAIL_SERVICE_USER
  const pass = process.env.SMTP_PASS || process.env.EMAIL_SERVICE_PASS

  if (!host || !user || !pass) {
    throw new Error('Email service configuration missing')
  }

  transporter = nodemailer.createTransporter({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  })

  return transporter
}

// Email templates
const emailTemplates = {
  'assessment-invitation': {
    subject: 'Assessment Invitation',
    html: (data: any) => `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Assessment Invitation</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .details { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎯 Assessment Invitation</h1>
            <p>${data.company}</p>
          </div>
          <div class="content">
            <h2>Hi ${data.candidateName},</h2>
            <p>You have been invited to take an assessment for ${data.company}.</p>
            
            <div class="details">
              <h3>📋 Assessment Details:</h3>
              <p><strong>Title:</strong> ${data.assessmentTitle}</p>
              <p><strong>Description:</strong> ${data.assessmentDescription}</p>
              <p><strong>Duration:</strong> ${data.duration} minutes</p>
              <p><strong>Scheduled Date:</strong> ${data.scheduledDate ? new Date(data.scheduledDate).toLocaleString() : 'Flexible'}</p>
              <p><strong>Test Type:</strong> ${data.testType}</p>
            </div>

            <div class="details">
              <h3>📝 Instructions:</h3>
              <p>${data.instructions}</p>
              <ul>
                <li>Ensure you have a stable internet connection</li>
                <li>Use a modern browser (Chrome, Firefox, Safari)</li>
                <li>Allow camera and microphone access when prompted</li>
                <li>Complete the assessment in a quiet environment</li>
                <li>Do not switch tabs or open new windows during the test</li>
              </ul>
            </div>

            <div style="text-align: center;">
              <a href="${data.testLink}" class="button">🚀 Start Assessment</a>
            </div>

            <p><strong>Important:</strong> This link is unique to you and will expire after use. Please keep it secure.</p>
            
            <div class="footer">
              <p>Good luck with your assessment! 🍀</p>
              <p>© 2026 ${data.company}. All rights reserved.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `
  },
  'interview-invitation': {
    subject: 'Interview Invitation',
    html: (data: any) => `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Interview Invitation</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .details { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎥 Interview Invitation</h1>
            <p>${data.company}</p>
          </div>
          <div class="content">
            <h2>Hi ${data.candidateName},</h2>
            <p>You have been invited for an interview with ${data.company}.</p>
            
            <div class="details">
              <h3>📅 Interview Details:</h3>
              <p><strong>Position:</strong> ${data.interviewTitle}</p>
              <p><strong>Description:</strong> ${data.interviewDescription}</p>
              <p><strong>Date & Time:</strong> ${data.scheduledDate}</p>
              <p><strong>Duration:</strong> ${data.duration} minutes</p>
              <p><strong>Interview Type:</strong> ${data.interviewType}</p>
              <p><strong>Interviewer:</strong> ${data.interviewerName} (${data.interviewerEmail})</p>
            </div>

            <div class="details">
              <h3>📝 Instructions:</h3>
              <p>${data.instructions}</p>
              <ul>
                <li>Join the interview 5 minutes before scheduled time</li>
                <li>Test your camera and microphone beforehand</li>
                <li>Ensure you have a stable internet connection</li>
                <li>Find a quiet, well-lit environment</li>
                <li>Have your resume and any required documents ready</li>
              </ul>
            </div>

            <div style="text-align: center;">
              <a href="${data.interviewLink}" class="button">🎥 Join Interview</a>
            </div>

            <p><strong>Important:</strong> This interview link is unique to you. Please do not share it with others.</p>
            
            <div class="footer">
              <p>We look forward to speaking with you! 🤝</p>
              <p>© 2026 ${data.company}. All rights reserved.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `
  }
};

// Send assessment email
export async function sendAssessmentEmail({ to, subject, template, data }: {
  to: string;
  subject: string;
  template: string;
  data: any;
}) {
  try {
    const emailTemplate = emailTemplates[template as keyof typeof emailTemplates];
    if (!emailTemplate) {
      throw new Error(`Email template ${template} not found`);
    }

    const mailOptions = {
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject,
      html: emailTemplate.html(data)
    };

    const result = await getTransporter().sendMail(mailOptions);
    console.log('Assessment email sent successfully:', result.messageId);
    return result;
  } catch (error) {
    console.error('Error sending assessment email:', error);
    throw error;
  }
}

// Send interview email
export async function sendInterviewEmail({ to, subject, template, data }: {
  to: string;
  subject: string;
  template: string;
  data: any;
}) {
  try {
    const emailTemplate = emailTemplates[template as keyof typeof emailTemplates];
    if (!emailTemplate) {
      throw new Error(`Email template ${template} not found`);
    }

    const mailOptions = {
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject,
      html: emailTemplate.html(data)
    };

    const result = await getTransporter().sendMail(mailOptions);
    console.log('Interview email sent successfully:', result.messageId);
    return result;
  } catch (error) {
    console.error('Error sending interview email:', error);
    throw error;
  }
}

export async function sendEmail(options: SendEmailOptions) {
  try {
    const mailOptions = {
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
      attachments: options.attachments
    };

    const result = await getTransporter().sendMail(mailOptions);
    console.log('Email sent successfully:', result.messageId);
    return result;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
}
