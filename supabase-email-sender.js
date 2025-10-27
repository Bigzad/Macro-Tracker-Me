// Email sending functionality for invitation system

class InvitationEmailSender {
    constructor() {
        this.supabaseUrl = window.supabaseConfig?.url;
        this.supabaseAnonKey = window.supabaseConfig?.anonKey;
    }

    // Method 1: Send via Edge Function (for testing with Supabase email)
    async sendViaEdgeFunction(email, invitationLink, expiresAt) {
        try {
            const { data, error } = await window.supabaseClient.functions.invoke('send-invitation-email', {
                body: {
                    to_email: email,
                    invitation_link: invitationLink,
                    expires_at: expiresAt
                }
            });

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Edge function email error:', error);
            return { success: false, error: error.message };
        }
    }

    // Method 2: Send via EmailJS (free service, good for small volumes)
    async sendViaEmailJS(email, invitationLink, expiresAt) {
        try {
            // Initialize EmailJS (you'll need to get these from emailjs.com)
            const serviceId = 'service_8dirsxw';
            const templateId = 'template_9jnm2s8';
            const publicKey = 'XuoBzofT42rkwgQ0Y';

            const templateParams = {
                to_email: email,
                invitation_link: invitationLink,
                expires_date: new Date(expiresAt).toLocaleDateString(),
                app_name: 'NutriTracker Pro'
            };

            // Load EmailJS library if not already loaded
            if (!window.emailjs) {
                await this.loadEmailJSLibrary();
            }

            const response = await window.emailjs.send(serviceId, templateId, templateParams, publicKey);
            return { success: true, data: response };
        } catch (error) {
            console.error('EmailJS error:', error);
            return { success: false, error: error.message };
        }
    }

    // Method 3: Send via Resend API (SERVER-SIDE ONLY - CORS blocked from browser)
    async sendViaResend(email, invitationLink, expiresAt) {
        // Note: This method will fail in browser due to CORS policy
        // Use this only in server-side implementations or Edge Functions
        return { success: false, error: 'Resend API requires server-side implementation due to CORS policy' };
        
        /*
        try {
            const resendApiKey = 'YOUR_RESEND_API_KEY'; // Replace with your Resend API key
            
            const response = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${resendApiKey}`
                },
                body: JSON.stringify({
                    from: 'noreply@yourdomain.com', // Replace with your verified domain
                    to: [email],
                    subject: 'You\'re invited to NutriTracker Pro!',
                    html: this.getEmailTemplate(invitationLink, expiresAt)
                })
            });

            if (!response.ok) {
                throw new Error(`Resend API error: ${response.status}`);
            }

            const data = await response.json();
            return { success: true, data };
        } catch (error) {
            console.error('Resend API error:', error);
            return { success: false, error: error.message };
        }
        */
    }

    // Load EmailJS library dynamically
    loadEmailJSLibrary() {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@3/dist/email.min.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    // Email template
    getEmailTemplate(invitationLink, expiresAt) {
        const expiresDate = new Date(expiresAt).toLocaleDateString();
        
        return `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
                .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; padding: 30px; }
                .header { text-align: center; margin-bottom: 30px; }
                .logo { color: #10B981; font-size: 24px; font-weight: bold; }
                .button { display: inline-block; background-color: #10B981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
                .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 14px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="logo">🥗 NutriTracker Pro</div>
                </div>
                
                <h2>You're invited to join NutriTracker Pro!</h2>
                
                <p>Hello!</p>
                
                <p>You've been invited to join our nutrition tracking platform. NutriTracker Pro helps you monitor your daily nutrition, track meals, and achieve your health goals with personalized coaching.</p>
                
                <p style="text-align: center;">
                    <a href="${invitationLink}" class="button">Complete Your Registration</a>
                </p>
                
                <p><strong>Important:</strong> This invitation expires on ${expiresDate}. Please complete your registration before then.</p>
                
                <p>What you'll get access to:</p>
                <ul>
                    <li>Comprehensive nutrition tracking</li>
                    <li>Personalized meal planning</li>
                    <li>Progress monitoring and analytics</li>
                    <li>Expert coaching support</li>
                </ul>
                
                <p>If you have any questions, feel free to reply to this email.</p>
                
                <div class="footer">
                    <p>Best regards,<br>The NutriTracker Pro Team</p>
                    <p><small>If you didn't request this invitation, you can safely ignore this email.</small></p>
                </div>
            </div>
        </body>
        </html>
        `;
    }

    // Method 3: Send Password Reset Email via EmailJS
    async sendPasswordResetViaEmailJS(email, resetLink, expiresAt) {
        try {
            // Initialize EmailJS with password reset template
            const serviceId = 'service_8dirsxw';
            const templateId = 'template_supedxf'; // Your password reset template ID
            const publicKey = 'XuoBzofT42rkwgQ0Y';



            const templateParams = {
                to_email: email,
                reset_link: resetLink,
                expires_date: new Date(expiresAt).toLocaleDateString()
            };



            // Load EmailJS library if not already loaded
            if (!window.emailjs) {
                await this.loadEmailJSLibrary();
            }

            const response = await window.emailjs.send(serviceId, templateId, templateParams, publicKey);
            return { success: true, data: response };
        } catch (error) {
            console.error('Password reset EmailJS error:', error);
            return { success: false, error: error.message };
        }
    }

    // Main method to send invitation email (tries multiple methods)
    async sendInvitationEmail(email, invitationLink, expiresAt) {
        console.log(`Sending invitation email to ${email}...`);

        // Try methods in order of preference (browser-compatible first)
        const methods = [
            { name: 'EmailJS', method: this.sendViaEmailJS },
            { name: 'EdgeFunction', method: this.sendViaEdgeFunction },
            // Note: Resend requires server-side implementation due to CORS
            // { name: 'Resend', method: this.sendViaResend }
        ];

        for (const methodObj of methods) {
            try {
                console.log(`Attempting email send via ${methodObj.name}...`);
                const result = await methodObj.method.call(this, email, invitationLink, expiresAt);
                if (result.success) {
                    console.log(`✅ Email sent successfully via ${methodObj.name}`);
                    return result;
                } else {
                    console.warn(`❌ ${methodObj.name} failed:`, result.error);
                }
            } catch (error) {
                console.warn(`❌ ${methodObj.name} failed with exception:`, error.message);
            }
        }

        throw new Error('All email sending methods failed');
    }

    // Main method to send password reset email
    async sendPasswordResetEmail(email, resetLink, expiresAt) {
        console.log(`Sending password reset email to ${email}...`);

        // Try EmailJS method for password reset
        try {
            console.log('Attempting password reset email send via EmailJS...');
            const result = await this.sendPasswordResetViaEmailJS(email, resetLink, expiresAt);
            if (result.success) {
                console.log('✅ Password reset email sent successfully via EmailJS');
                return { success: true, data: { service: 'EmailJS', ...result.data } };
            } else {
                console.warn('❌ EmailJS password reset failed:', result.error);
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('❌ Password reset email failed:', error.message);
            throw new Error('Failed to send password reset email');
        }
    }
}

// Export for use in other files
window.InvitationEmailSender = InvitationEmailSender;