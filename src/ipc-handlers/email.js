/**
 * Email IPC Handlers
 * Handles email sending for purchase orders and test emails
 */

const nodemailer = require('nodemailer');
const emailSettingsStore = require('../database/email-settings-store');

/**
 * Send a test email to verify SMTP configuration
 */
async function sendTestEmail(event, { to, settings }) {
  try {
    // Use provided settings or load from store
    const emailSettings = settings || emailSettingsStore.getEmailSettings();

    // Validate configuration
    if (!emailSettings.smtpHost || !emailSettings.smtpUser || !emailSettings.smtpPassword) {
      return {
        success: false,
        error: 'SMTP configuration is incomplete. Please configure all required fields.'
      };
    }

    // Create transporter
    const transporter = nodemailer.createTransport({
      host: emailSettings.smtpHost,
      port: emailSettings.smtpPort,
      secure: emailSettings.smtpSecure, // true for 465, false for other ports
      auth: {
        user: emailSettings.smtpUser,
        pass: emailSettings.smtpPassword
      }
    });

    // Verify connection configuration
    await transporter.verify();

    // Send test email
    const info = await transporter.sendMail({
      from: emailSettings.emailFrom || emailSettings.smtpUser,
      to: to || emailSettings.smtpUser,
      subject: 'DBx BOQ - Email Test',
      text: 'This is a test email from DBx BOQ. Your email configuration is working correctly!',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2 style="color: #0d6efd;">DBx BOQ - Email Test</h2>
          <p>This is a test email from DBx BOQ.</p>
          <p><strong>Your email configuration is working correctly!</strong></p>
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;">
          <p style="color: #666; font-size: 0.9em;">
            SMTP Server: ${emailSettings.smtpHost}:${emailSettings.smtpPort}<br>
            From: ${emailSettings.emailFrom || emailSettings.smtpUser}
          </p>
        </div>
      `
    });

    console.log('Test email sent:', info.messageId);

    return {
      success: true,
      messageId: info.messageId,
      to: to || emailSettings.smtpUser
    };
  } catch (error) {
    console.error('Error sending test email:', error);

    // Provide more helpful error messages
    let errorMessage = error.message;
    if (error.code === 'EAUTH') {
      errorMessage = 'Authentication failed. Please check your username and password. For Gmail, make sure you are using an App Password.';
    } else if (error.code === 'ECONNREFUSED') {
      errorMessage = 'Connection refused. Please check your SMTP server and port settings.';
    } else if (error.code === 'ETIMEDOUT') {
      errorMessage = 'Connection timed out. Please check your SMTP server address and network connection.';
    }

    return {
      success: false,
      error: errorMessage
    };
  }
}

/**
 * Send general email (from compose modal)
 */
async function sendGeneral(event, { to, cc, bcc, subject, body, attachments }) {
  try {
    const emailSettings = emailSettingsStore.getEmailSettings();

    // Validate configuration
    if (!emailSettings.smtpHost || !emailSettings.smtpUser || !emailSettings.smtpPassword) {
      return {
        success: false,
        error: 'Email not configured. Please configure SMTP settings in Settings > Email.'
      };
    }

    // Check if test mode is enabled
    const emailTo = emailSettings.testMode ? emailSettings.testEmail : to;

    // Create transporter
    const transporter = nodemailer.createTransport({
      host: emailSettings.smtpHost,
      port: emailSettings.smtpPort,
      secure: emailSettings.smtpSecure,
      auth: {
        user: emailSettings.smtpUser,
        pass: emailSettings.smtpPassword
      }
    });

    // Determine from address with display name
    let fromAddress = emailSettings.emailFrom || emailSettings.smtpUser;
    if (emailSettings.emailFromName) {
      fromAddress = `"${emailSettings.emailFromName}" <${fromAddress}>`;
    }

    // Build email options
    const mailOptions = {
      from: fromAddress,
      to: emailTo,
      subject: subject,
      text: body,
      html: body.replace(/\n/g, '<br>'),
      attachments: attachments || []
    };

    // Add CC if provided
    if (cc && !emailSettings.testMode) {
      mailOptions.cc = cc;
    }

    // Add BCC if provided
    if (bcc && !emailSettings.testMode) {
      mailOptions.bcc = bcc;
    }

    // Send email
    const info = await transporter.sendMail(mailOptions);

    console.log('General email sent:', info.messageId);

    return {
      success: true,
      messageId: info.messageId,
      to: emailTo,
      testMode: emailSettings.testMode
    };
  } catch (error) {
    console.error('Error sending general email:', error);

    // Provide more helpful error messages
    let errorMessage = error.message;
    if (error.code === 'EAUTH') {
      errorMessage = 'Authentication failed. Please check your username and password. For Gmail, make sure you are using an App Password. For Outlook, you may need an App Password or OAuth.';
    } else if (error.code === 'ECONNREFUSED') {
      errorMessage = 'Connection refused. Please check your SMTP server and port settings.';
    } else if (error.code === 'ETIMEDOUT') {
      errorMessage = 'Connection timed out. Please check your SMTP server address and network connection.';
    }

    return {
      success: false,
      error: errorMessage
    };
  }
}

/**
 * Send purchase order via email
 */
async function sendPurchaseOrder(event, { orderNumber, to, subject, body, attachments }) {
  try {
    const emailSettings = emailSettingsStore.getEmailSettings();

    // Validate configuration
    if (!emailSettings.smtpHost || !emailSettings.smtpUser || !emailSettings.smtpPassword) {
      return {
        success: false,
        error: 'Email not configured. Please configure SMTP settings first.'
      };
    }

    // Check if test mode is enabled
    const emailTo = emailSettings.testMode ? emailSettings.testEmail : to;

    // Create transporter
    const transporter = nodemailer.createTransport({
      host: emailSettings.smtpHost,
      port: emailSettings.smtpPort,
      secure: emailSettings.smtpSecure,
      auth: {
        user: emailSettings.smtpUser,
        pass: emailSettings.smtpPassword
      }
    });

    // Build email options
    const mailOptions = {
      from: emailSettings.emailFrom || emailSettings.smtpUser,
      to: emailTo,
      subject: subject,
      text: body,
      html: body.replace(/\n/g, '<br>'),
      attachments: attachments || []
    };

    // Add CC if configured
    if (emailSettings.emailCC) {
      mailOptions.cc = emailSettings.emailCC;
    }

    // Send email
    const info = await transporter.sendMail(mailOptions);

    console.log('Purchase order email sent:', info.messageId);

    return {
      success: true,
      messageId: info.messageId,
      to: emailTo,
      testMode: emailSettings.testMode
    };
  } catch (error) {
    console.error('Error sending purchase order email:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  sendTestEmail,
  sendGeneral,
  sendPurchaseOrder
};
