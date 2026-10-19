export type User = {
  id: string;
  name: string;
  email: string;
  role: "user" | "admin";
  createdAt: string;
};

export type Theme = "light" | "dark";
export type Palette = "classic" | "maroon";
