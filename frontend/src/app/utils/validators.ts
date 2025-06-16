// utils/validators.ts

// Simple email regex pattern
export const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Password validation rules (e.g., minimum 8 characters, at least one letter & one number)
export const isValidPassword = (password: string): boolean => {
  const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/;
  return passwordRegex.test(password);
};

// Optional: Full name validation
export const isValidFullName = (name: string): boolean => {
  return name.trim().length >= 3;
};
