# 🔐 Admin Portal Complete Guide

## **How to Access the Admin Portal**

### **Method 1: Direct URL (Recommended)**
1. **Go to**: `http://localhost:8080/admin`
2. **Sign in with**:
   - **Email**: `apollo.sankii@gmail.com`
   - **Password**: Any password (you can change it later)

### **Method 2: Through Your App**
1. **Log into your app** normally with your email
2. **Look for the "Admin" button** in the top-right header (next to the theme toggle)
3. **Click the Admin button** to access the portal

---

## **🔑 How to Change Your Password**

### **Step-by-Step Password Change**
1. **Access the admin portal** (using either method above)
2. **Click "Change Password"** button in the top-right corner
3. **Enter your current password** (or any password if it's your first time)
4. **Enter your new password** (minimum 6 characters)
5. **Confirm your new password**
6. **Click "Update Password"**

### **Password Requirements**
- ✅ Minimum 6 characters
- ✅ Can contain letters, numbers, and symbols
- ✅ Case sensitive
- ✅ Must match confirmation

---

## **📱 How M-Pesa Configuration Updates Work**

### **Real-Time Updates**
✅ **Yes, M-Pesa configuration changes update in Supabase immediately!**

### **How It Works**
1. **You update the M-Pesa configuration** in the admin portal
2. **The change is saved to Supabase** instantly
3. **All future payments** automatically use the new M-Pesa settings
4. **No system restart required** - changes are immediate

### **Step-by-Step M-Pesa Configuration Update**
1. **Access the admin portal**
2. **Scroll to "Landlord M-Pesa Configuration"**
3. **Find the landlord** you want to update
4. **Enter the M-Pesa paybill number** (e.g., `174379`)
5. **Enter the account reference** (e.g., `RENT_PAYMENT`)
6. **Click "Save Changes"** to update all modified landlords at once

### **What Happens When You Update**
- ✅ **Database updated** in real-time
- ✅ **All future payments** use M-Pesa STK Push
- ✅ **Payment logging** includes the updated M-Pesa details
- ✅ **Landlord receives payments** via their M-Pesa paybill
- ✅ **No downtime** or system restart needed

---

## **🎯 Admin Portal Features**

### **📊 System Dashboard**
- **Total landlords count**
- **Total properties count**
- **Total tenants count**
- **Recent payments overview**
- **Landlords with M-Pesa configuration status**

### **🔧 Landlord M-Pesa Configuration**
- **Visual interface** to update M-Pesa paybill numbers and account references
- **Real-time validation** of M-Pesa configuration
- **Shows which landlords** have been modified
- **Bulk save functionality**
- **Clear instructions** on how M-Pesa STK Push works

### **📈 Payment Monitoring**
- **Recent payment activity**
- **Payment status tracking**
- **Multi-landlord payment routing**

---

## **🔒 Security Features**

### **Access Control**
- ✅ **Only your email** (`apollo.sankii@gmail.com`) can access
- ✅ **No registration allowed** for other users
- ✅ **Automatic logout** on invalid access attempts
- ✅ **Secure authentication** with Supabase

### **Password Security**
- ✅ **Secure password change** functionality
- ✅ **Password validation** and confirmation
- ✅ **Session management** with automatic logout

---

## **🚀 Getting Started**

### **First Time Setup**
1. **Start your development server**: `npm run dev`
2. **Go to**: `http://localhost:8080/admin`
3. **Sign in** with your email and any password
4. **Change your password** using the "Change Password" button
5. **Update M-Pesa configurations** for STK Push payments
6. **Test the payment flow** with different landlords

### **Regular Usage**
1. **Access the portal** whenever you need to:
   - Update M-Pesa configurations
   - Monitor system activity
   - Check payment status
   - Manage landlord configurations

---

## **💡 Tips & Best Practices**

### **M-Pesa Configuration Management**
- **Update configurations** when you get new M-Pesa paybill numbers
- **Use descriptive account references** for easy payment tracking
- **Test configurations** with sandbox environment first
- **Test payments** after updating codes
- **Keep backup** of old codes in case of issues
- **Verify payments** are routing correctly

### **Security**
- **Change your password** regularly
- **Log out** when done with admin tasks
- **Don't share** your admin credentials
- **Monitor** who has access to the portal

### **Troubleshooting**
- **If you can't access**: Check your email is correct
- **If password doesn't work**: Use the "Change Password" feature
- **If subaccount codes don't update**: Check your internet connection
- **If payments don't route correctly**: Verify subaccount codes are valid

---

## **📞 Support**

If you need help with the admin portal:
1. **Check this guide** first
2. **Run the test scripts** to verify everything is working
3. **Check the browser console** for any error messages
4. **Verify your Supabase connection** is working

---

**🎉 Your admin portal is now fully functional and ready to use!**
