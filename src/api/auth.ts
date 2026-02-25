import { api } from "./client";
import type { LoginResponse } from "../types/auth";

export async function login(email: string, password: string) {
  const { data } = await api.post<LoginResponse>("/api/auth/login", { email, password });
  return data;
}

export async function logout() {
  const { data } = await api.post("/api/auth/logout");
  return data;
}