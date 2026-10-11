import { apiRequest } from "./client";

export interface PublicUser {
  id: string;
  name: string;
  role: string;
  phone: string;
  factory?: string;
  estate?: string;
}

export interface LoginResult {
  accessToken: string;
  user: PublicUser;
}

export async function login(
  phone: string,
  password: string,
): Promise<LoginResult> {
  return apiRequest<LoginResult>("/auth/mobile/login", {
    method: "POST",
    body: JSON.stringify({
      phone,
      password,
    }),
  });
}

export async function register(
  name: string,
  phoneNumber: number,
  NIC: string,
  password: string,
  confirmPassword: string
) {
  console.log({
      name,
      phoneNumber,
      NIC,
      password,
      confirmPassword,
    } );
    return true;
}