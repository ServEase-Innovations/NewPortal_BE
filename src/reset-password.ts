import prisma from './prisma';
import bcrypt from 'bcryptjs';

async function resetPassword() {
  try {
    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('Pass@123', salt);
    
    // Update the employee
    const updated = await prisma.employee.update({
      where: { username: 'daskhu' },
      data: { password: hashedPassword }
    });
    
    console.log('Password reset for:', updated.username);
    console.log('New password hash:', updated.password.substring(0, 30) + '...');
    
    // Verify the new password works
    const isValid = await bcrypt.compare('Pass@123', updated.password);
    console.log('New password verification:', isValid);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

resetPassword();