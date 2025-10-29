/**
 * Generate a memorable password based on a person's name
 * Format: FirstName + Symbol + Word + 3-digit number
 * Example: John@Home456, Sarah#Rent789
 */
export function generateMemorablePassword(firstName: string, lastName?: string): string {
  // Clean the first name (capitalize first letter, lowercase rest)
  const cleanFirstName = firstName.trim().charAt(0).toUpperCase() + firstName.trim().slice(1).toLowerCase();
  
  // Array of memorable words related to housing/property
  const words = ['Home', 'Rent', 'Keys', 'Safe', 'Stay', 'Live', 'Door', 'Room'];
  
  // Array of special characters
  const symbols = ['@', '#', '$', '!'];
  
  // Pick a random word and symbol
  const randomWord = words[Math.floor(Math.random() * words.length)];
  const randomSymbol = symbols[Math.floor(Math.random() * symbols.length)];
  
  // Generate a 3-digit random number
  const randomNumber = Math.floor(100 + Math.random() * 900); // 100-999
  
  // Construct the password: FirstName + Symbol + Word + Number
  const password = `${cleanFirstName}${randomSymbol}${randomWord}${randomNumber}`;
  
  return password;
}

/**
 * Legacy random password generator (kept for backward compatibility)
 * Generates a completely random password
 */
export function generateRandomPassword(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

