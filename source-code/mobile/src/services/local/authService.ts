import { getDb } from '@/db';
import type { Role } from '@/types/user';

import type { AuthService } from '../types';

type UserRow = { id: string; name: string; phone: string; password: string; role: Role };

export const localAuthService: AuthService = {
  async login(phone, password) {
    const db = await getDb();
    const row = await db.getFirstAsync<UserRow>('SELECT * FROM users WHERE phone = ?', phone.trim());
    if (!row || row.password !== password) {
      return { ok: false, error: 'Phone number or password is incorrect.' };
    }
    return { ok: true, user: { id: row.id, name: row.name, phone: row.phone, role: row.role } };
  },

  async getDemoAccounts() {
    const db = await getDb();
    const rows = await db.getAllAsync<UserRow>('SELECT * FROM users ORDER BY role');
    return rows.map((row) => ({ name: row.name, phone: row.phone, role: row.role }));
  },
};
