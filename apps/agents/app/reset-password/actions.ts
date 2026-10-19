"use server";

import { createServerSupabase } from "@bs/auth/server";
import { updateRecoveryPassword, type PasswordState } from "@bs/auth/recovery";

export async function updatePassword(_previous: PasswordState, formData: FormData): Promise<PasswordState> {
  return updateRecoveryPassword(formData, createServerSupabase);
}
