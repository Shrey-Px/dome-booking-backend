// src/services/emailService.js - Simplified string-based approach
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

  // SIMPLIFIED: Format date string "2025-10-04" to "Saturday, October 4, 2025"
  formatDateString(dateStr) {
    try {
      const [year, month, day] = dateStr.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      console.error('Date formatting error:', error);
      return dateStr;
    }
  }

  // SIMPLIFIED: Format time string "08:00" to "8:00 AM"
  formatTimeString(timeStr) {
    try {
      const [hours, minutes] = timeStr.split(':').map(Number);
      const period = hours >= 12 ? 'PM' : 'AM';
      const displayHour = hours % 12 || 12;
      
      return `${displayHour}:${minutes.toString().padStart(2, '0')} ${period}`;
    } catch (error) {
      console.error('Time formatting error:', error);
      return timeStr;
    }
  }

  async sendBookingConfirmation(bookingData) {
    try {
      if (!process.env.SENDGRID_API_KEY) {
        console.log('SendGrid not configured, skipping email');
        return { messageId: 'skipped-no-api-key' };
      }

      console.log('Sending confirmation email via SendGrid:', bookingData.customerEmail);
      console.log('Email data received:', bookingData);
      
      // Use string formatting for consistent display
      const formattedDate = this.formatDateString(bookingData.bookingDate);
      const formattedStartTime = this.formatTimeString(bookingData.startTime);
      const formattedEndTime = this.formatTimeString(bookingData.endTime);
      
      console.log('Formatted for email:', {
        original: {
          date: bookingData.bookingDate,
          startTime: bookingData.startTime,
          endTime: bookingData.endTime
        },
        formatted: {
          date: formattedDate,
          startTime: formattedStartTime,
          endTime: formattedEndTime
        }
      });
      
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
            .amount-breakdown { background: #f8f9fa; padding: 15px; border-radius: 6px; margin: 15px 0; border-left: 4px solid #1E293B; }
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
            .amount-row { display: flex; justify-content: space-between; margin: 8px 0; padding: 2px 0; }
            .amount-total { font-weight: bold; border-top: 2px solid #1E293B; padding-top: 8px; margin-top: 12px; font-size: 16px; }
            .discount-row { color: #28a745; font-weight: 500; }
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
                <p><strong>Date:</strong> ${formattedDate}</p>
                <p><strong>Time:</strong> ${formattedStartTime} - ${formattedEndTime}</p>
                <p><strong>Duration:</strong> ${bookingData.duration} minutes</p>
                <p><strong>Booking ID:</strong> ${bookingData.bookingId}</p>

                <div class="amount-breakdown">
                  <h4 style="margin-top: 0; color: #1E293B;">Payment Summary</h4>

                  <div class="amount-row">
                    <span>Court Rental (${bookingData.duration} minutes):</span>
                    <span>$${bookingData.courtRental}</span>
                  </div>

                  <div class="amount-row">
                    <span>Service Fee (1% of court rental):</span>
                    <span>$${bookingData.serviceFee}</span>
                  </div>

                  ${bookingData.discountAmount && parseFloat(bookingData.discountAmount) > 0 ? `
                    <div class="amount-row discount-row">
                      <span>Discount Applied (10%):</span>
                      <span>-$${bookingData.discountAmount}</span>
                    </div>
                  ` : ''}

                  <div class="amount-row">
                    <span>Subtotal:</span>
                    <span>$${bookingData.subtotal}</span>
                  </div>
            
                  <div class="amount-row">
                    <span>Tax (13% HST):</span>
                    <span>$${bookingData.tax}</span>
                  </div>

                  <div class="amount-row amount-total">
                    <span>Total Charged:</span>
                    <span>$${bookingData.totalAmount}</span>
                  </div>
                </div>
              </div>

              <div style="text-align: center;">
                <a href="${bookingData.cancelUrl}" class="cancel-button">Cancel Booking</a>
              </div>

              <p><strong>Cancellation Policy:</strong> Bookings can be cancelled up to 24 hours before the scheduled time.</p>
            </div>
            
            <div class="footer">
              <p>Thank you for choosing DOME Sports Facility</p>
              <p>If you have any questions, please contact us at info@dafloinnovations.com</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const msg = {
        to: bookingData.customerEmail,
        from: process.env.EMAIL_FROM || 'info@dafloinnovations.com',
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
      console.log('Cancellation email data received:', bookingData);
      
      // Use string formatting for consistent display
      const formattedDate = this.formatDateString(bookingData.bookingDate);
      const formattedStartTime = this.formatTimeString(bookingData.startTime);
      const formattedEndTime = this.formatTimeString(bookingData.endTime);
      
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
            .cancellation-notice { background: #fef2f2; padding: 15px; border-radius: 6px; margin: 15px 0; border-left: 4px solid #DC2626; }
            .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
            .cancelled-status { color: #DC2626; font-weight: bold; font-size: 18px; text-align: center; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>D<span style="color: #EF4444;">O</span>ME</h1>
              <h2>Booking Cancellation Confirmation</h2>
            </div>
            
            <div class="content">
              <p>Dear ${bookingData.customerName},</p>
              <p>Your booking has been successfully cancelled. Here are the details of your cancelled booking:</p>
              
              <div class="cancelled-status">
                ✗ BOOKING CANCELLED
              </div>
              
              <div class="booking-details">
                <h3>Cancelled Booking Details</h3>
                <p><strong>Facility:</strong> ${bookingData.facilityName}</p>
                <p><strong>Court:</strong> ${bookingData.courtName}</p>
                <p><strong>Date:</strong> ${formattedDate}</p>
                <p><strong>Time:</strong> ${formattedStartTime} - ${formattedEndTime}</p>
                <p><strong>Duration:</strong> ${bookingData.duration || 60} minutes</p>
                <p><strong>Booking ID:</strong> ${bookingData.bookingId}</p>
                <p><strong>Cancellation Date:</strong> ${new Date().toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}</p>
              </div>

              <div class="cancellation-notice">
                <h4 style="margin-top: 0; color: #DC2626;">Cancellation Notice</h4>
                <p>Your booking has been cancelled and you will receive a full refund within 3-5 business days to your original payment method.</p>
                <p>If you have any questions about your refund, please contact us at info@dafloinnovations.com</p>
              </div>

              <p>We hope to see you again soon at DOME Sports Facility!</p>
            </div>
            
            <div class="footer">
              <p>Thank you for choosing DOME Sports Facility</p>
              <p>If you have any questions, please contact us at info@dafloinnovations.com</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const msg = {
        to: bookingData.customerEmail,
        from: process.env.EMAIL_FROM || 'info@dafloinnovations.com',
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