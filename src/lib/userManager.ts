import fs from 'fs/promises';
import path from 'path';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { User } from '@/types/auth';

const USERS_FILE = path.join(process.cwd(), 'data', 'users', 'users.json');

export async function loadUsers(): Promise<User[]> {
  try {
    const data = await fs.readFile(USERS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

export async function saveUsers(users: User[]): Promise<void> {
  const dir = path.dirname(USERS_FILE);
  await fs.mkdir(dir, { recursive: true });

  const tempFile = USERS_FILE + '.tmp';
  await fs.writeFile(tempFile, JSON.stringify(users, null, 2));
  await fs.rename(tempFile, USERS_FILE);
}

export async function findUserByUsername(username: string): Promise<User | null> {
  const users = await loadUsers();
  return users.find(u => u.username.toLowerCase() === username.toLowerCase()) || null;
}

export async function findUserById(userId: string): Promise<User | null> {
  const users = await loadUsers();
  return users.find(u => u.id === userId) || null;
}

export async function createUser(username: string, password: string): Promise<User> {
  const users = await loadUsers();

  if (users.some(u => u.username.toLowerCase() === username.toLowerCase())) {
    throw new Error('Username already exists');
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user: User = {
    id: randomUUID(),
    username,
    passwordHash,
    createdAt: new Date().toISOString(),
    library: [],
  };

  users.push(user);
  await saveUsers(users);

  return user;
}

export async function verifyPassword(user: User, password: string): Promise<boolean> {
  return bcrypt.compare(password, user.passwordHash);
}

export async function addToLibrary(userId: string, bookId: string): Promise<void> {
  const users = await loadUsers();
  const user = users.find(u => u.id === userId);

  if (!user) {
    throw new Error('User not found');
  }

  if (!user.library.includes(bookId)) {
    user.library.push(bookId);
    await saveUsers(users);
  }
}

export async function removeFromLibrary(userId: string, bookId: string): Promise<void> {
  const users = await loadUsers();
  const user = users.find(u => u.id === userId);

  if (!user) {
    throw new Error('User not found');
  }

  user.library = user.library.filter(id => id !== bookId);
  await saveUsers(users);
}

export async function getUserLibrary(userId: string): Promise<string[]> {
  const user = await findUserById(userId);
  return user?.library || [];
}
