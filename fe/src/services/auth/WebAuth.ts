import { signIn } from "next-auth/react";
import { BaseAuth } from "./BaseAuth";

export class WebAuth extends BaseAuth {
  async loginWithGoogle(callbackUrl: string): Promise<void> {
    await signIn("google", { callbackUrl });
  }
}
