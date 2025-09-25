// src/services/emailService.js - SendGrid Implementation
const sgMail = require('@sendgrid/mail');

class EmailService {
  constructor() {
    if (process.env.SENDGRID_API_KEY) {
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
      console.log('SendGrid email service initialized');
    } else {
      console.warn('SENDGRID_API_KEY not found, email service will be disabled');
    }
  }

  async sendBookingConfirmation(bookingData) {
    try {
      if (!process.env.SENDGRID_API_KEY) {
        console.log('SendGrid not configured, skipping email');
        return { messageId: 'skipped-no-api-key' };
      }

      console.log('Sending confirmation email via SendGrid:', bookingData.customerEmail);
      
      const htmlTemplate = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #1E293B; color: white; padding: 20px; text-align: center; }
            .content { background: #f9f9f9; padding: 20px; }
            .booking-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .cancel-button { 
              display: inline-block; 
              background: #DC2626; 
              color: white; 
              padding: 12px 24px; 
              text-decoration: none; 
              border-radius: 6px; 
              margin: 20px 0;
              text-align: center;
            }
            .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>D<span style="color: #EF4444;">O</span>ME</h1>
              <h2>Booking Confirmation</h2>
            </div>
            
            <div class="content">
              <p>Dear ${bookingData.customerName},</p>
              <p>Your booking has been confirmed! Here are your booking details:</p>
              
              <div class="booking-details">
                <h3>Booking Details</h3>
                <p><strong>Facility:</strong> ${bookingData.facilityName}</p>
                <p><strong>Court:</strong> ${bookingData.courtName}</p>
                <p><strong>Date:</strong> ${bookingData.bookingDate}</p>
                <p><strong>Time:</strong> ${bookingData.startTime} - ${bookingData.endTime}</p>
                <p><strong>Duration:</strong> ${bookingData.duration} minutes</p>
                <p><strong>Total Amount:</strong> $${bookingData.totalAmount}</p>
                <p><strong>Booking ID:</strong> ${bookingData.bookingId}</p>
              </div>

              <div style="text-align: center;">
                <a href="${bookingData.cancelUrl}" class="cancel-button">Cancel Booking</a>
              </div>

              <p><strong>Cancellation Policy:</strong> Bookings can be cancelled up to 24 hours before the scheduled time.</p>
            </div>
            
            <div class="footer">
              <p>Thank you for choosing DOME Sports Facility</p>
              <p>If you have any questions, please contact us.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const msg = {
        to: bookingData.customerEmail,
        from: process.env.EMAIL_FROM || 'noreply@domesports.com',
        subject: `Booking Confirmation - ${bookingData.facilityName}`,
        html: htmlTemplate
      };

      const result = await sgMail.send(msg);
      console.log('SendGrid confirmation email sent successfully:', result[0].statusCode);
      return { messageId: result[0].headers['x-message-id'] };
      
    } catch (error) {
      console.error('Failed to send confirmation email via SendGrid:', error);
      if (error.response) {
        console.error('SendGrid error details:', error.response.body);
      }
      return { error: error.message };
    }
  }

  async sendCancellationConfirmation(bookingData) {
    try {
      if (!process.env.SENDGRID_API_KEY) {
        console.log('SendGrid not configured, skipping cancellation email');
        return { messageId: 'skipped-no-api-key' };
      }

      console.log('Sending cancellation email via SendGrid:', bookingData.customerEmail);
      
      const htmlTemplate = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #1E293B; color: white; padding: 20px; text-align: center; }
            .content { background: #f9f9f9; padding: 20px; }
            .booking-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>D<span style="color: #EF4444;">O</span>ME</h1>
              <h2>Booking Cancelled</h2>
            </div>
            
            <div class="content">
              <p>Dear ${bookingData.customerName},</p>
              <p>Your booking has been successfully cancelled.</p>
              
              <div class="booking-details">
                <h3>Cancelled Booking Details</h3>
                <p><strong>Facility:</strong> ${bookingData.facilityName}</p>
                <p><strong>Court:</strong> ${bookingData.courtName}</p>
                <p><strong>Date:</strong> ${bookingData.bookingDate}</p>
                <p><strong>Time:</strong> ${bookingData.startTime} - ${bookingData.endTime}</p>
                <p><strong>Booking ID:</strong> ${bookingData.bookingId}</p>
              </div>

              <p>If this cancellation was made in error, please contact us immediately.</p>
            </div>
            
            <div class="footer">
              <p>Thank you for using DOME Sports Facility</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const msg = {
        to: bookingData.customerEmail,
        from: process.env.EMAIL_FROM || 'noreply@domesports.com',
        subject: `Booking Cancelled - ${bookingData.facilityName}`,
        html: htmlTemplate
      };

      const result = await sgMail.send(msg);
      console.log('SendGrid cancellation email sent successfully:', result[0].statusCode);
      return { messageId: result[0].headers['x-message-id'] };
      
    } catch (error) {
      console.error('Failed to send cancellation email via SendGrid:', error);
      if (error.response) {
        console.error('SendGrid error details:', error.response.body);
      }
      return { error: error.message };
    }
  }
}

module.exports = new EmailService();