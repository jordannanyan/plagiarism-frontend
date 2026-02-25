export type RoleName = "admin" | "dosen" | "mahasiswa";

export type User = {
  id: number;
  name: string;
  email: string;
  role: RoleName;
};

export type LoginResponse = {
  ok: true;
  token: string;
  user: User;
};