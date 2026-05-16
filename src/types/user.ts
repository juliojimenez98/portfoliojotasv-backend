export interface IUser {
  _id: string;
  email: string;
  username: string;
  password: string;
  allowedApps: string[];
  isAdmin: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserInput {
  email: string;
  username: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface SafeUser {
  _id: string;
  email: string;
  username: string;
  allowedApps: string[];
  isAdmin: boolean;
  createdAt: Date;
  updatedAt: Date;
}
