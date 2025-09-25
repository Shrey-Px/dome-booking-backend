// src/services/emailService.js - Updated with robust SMTP configuration
const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    // More robust Gmail SMTP configuration
    this.transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      },
      tls: {
        rejectUnauthorized: false
      },
      connectionTimeout: 60000, // 60 seconds
      greetingTimeout: 30000, // 30 seconds
      socketTimeout: 60000, // 60 seconds
    });
  }

  async sendBookingConfirmation(bookingData) {
    try {
      console.log('Sending confirmation email with data:', bookingData);
      
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

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: bookingData.customerEmail,
        subject: `Booking Confirmation - ${bookingData.facilityName}`,
        html: htmlTemplate
      };

      // Add timeout wrapper
      const sendWithTimeout = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Email sending timeout after 30 seconds'));
        }, 30000);

        this.transporter.sendMail(mailOptions)
          .then(result => {
            clearTimeout(timeout);
            resolve(result);
          })
          .catch(error => {
            clearTimeout(timeout);
            reject(error);
          });
      });

      const result = await sendWithTimeout;
      console.log('Confirmation email sent successfully:', result.messageId);
      return result;
      
    } catch (error) {
      console.error('Failed to send confirmation email:', error);
      // Don't throw error - let booking succeed even if email fails
      return { error: error.message };
    }
  }

  async sendCancellationConfirmation(bookingData) {
    try {
      console.log('Sending cancellation email with data:', bookingData);
      
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

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: bookingData.customerEmail,
        subject: `Booking Cancelled - ${bookingData.facilityName}`,
        html: htmlTemplate
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('Cancellation email sent successfully:', result.messageId);
      return result;
      
    } catch (error) {
      console.error('Failed to send cancellation email:', error);
      return { error: error.message };
    }
  }
}

module.exports = new EmailService();