/** Matches IAM ResetPasswordDto / ChangePasswordDto rules. */
export const PASSWORD_COMPLEXITY_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/

export const PASSWORD_REQUIREMENTS_HINT =
  'At least 8 characters, with uppercase, lowercase, a number, and a special character (@$!%*?&).'

export function validateNewPassword(password: string): string | null {
  if (!password) {
    return 'Password is required.'
  }
  if (password.length < 8) {
    return 'Password must be at least 8 characters.'
  }
  if (password.length > 128) {
    return 'Password cannot exceed 128 characters.'
  }
  if (!PASSWORD_COMPLEXITY_REGEX.test(password)) {
    return PASSWORD_REQUIREMENTS_HINT
  }
  return null
}

export function validatePasswordConfirmation(
  password: string,
  confirmPassword: string,
): string | null {
  if (!confirmPassword) {
    return 'Confirm your password.'
  }
  if (password !== confirmPassword) {
    return 'Passwords do not match.'
  }
  return null
}
