import prisma from './prisma';
import bcrypt from 'bcryptjs';

async function debugPassword() {
  try {
    // Find the employee
    const employee = await prisma.employee.findFirst({
      where: { username: 'daskhu' }
    });
    
    if (!employee) {
      console.log('Employee not found with username: daskhu');
      return;
    }
    
    console.log('Employee found:', {
      id: employee.employeeId,
      username: employee.username,
      fullName: employee.fullName,
      hashedPassword: employee.password.substring(0, 20) + '...',
      passwordLength: employee.password.length
    });
    
    // Test password comparison with the provided password
    const passwordToTest = 'Pass@123';
    const isValid = await bcrypt.compare(passwordToTest, employee.password);
    console.log('Password "Pass@123" is valid:', isValid);
    
    // Try different variations
    const variations = ['Pass@123', 'pass@123', 'Pass123@', 'Pass@123!', 'Pass@1234'];
    for (const pwd of variations) {
      const result = await bcrypt.compare(pwd, employee.password);
      if (result) {
        console.log('MATCH FOUND! The password is:', pwd);
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

debugPassword();