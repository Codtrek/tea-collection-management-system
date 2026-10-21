export function getPhoneNumberError(value: string): string | undefined {
  const phoneNumber = value.trim();

  if (!phoneNumber) {
    return "Phone number is required.";
  }

  if (!/^07\d{8}$/.test(phoneNumber)) {
    return "Enter a valid 10-digit mobile number (e.g. 0712345678).";
  }

  return undefined;
}

export function getPhoneNumberResponseError(
  message: string,
  context: "login" | "register",
): string {
  const normalizedMessage = message.toLowerCase();

  if (context === "login" && /no account found|account found/.test(normalizedMessage)) {
    return "No account found for this phone number.";
  }

  if (context === "register" && /already exists|account exists/.test(normalizedMessage)) {
    return "An account already exists for this phone number.";
  }

  if (/valid phone|phone number/.test(normalizedMessage)) {
    return "Enter a valid 10-digit mobile number (e.g. 0712345678).";
  }

  return "Phone number is required.";
}
