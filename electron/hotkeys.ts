import { globalShortcut } from 'electron';

interface Claim {
  accelerator: string;
  ownerId: string;
  ownerLabel: string;
  callback: () => void;
}

export interface ClaimResult {
  ok: boolean;
  /** Set when another owner (a script, or the palette) already holds this
   * accelerator — lets the caller show *who* it conflicts with instead of a
   * generic "try something else". */
  conflictLabel?: string;
}

// The single source of truth for "who owns this global accelerator" —
// scripts (via registry.ts) and the palette (via main.ts) both claim through
// here instead of calling globalShortcut directly. Electron itself silently
// *replaces* a same-process registration rather than failing it, so without
// this layer two scripts sharing a hotkey (or a script colliding with the
// palette's) would fail silently: whichever registered last would just work,
// with no error shown anywhere.
class HotkeyRegistrar {
  private claims = new Map<string, Claim>(); // accelerator -> claim

  /** Claims `accelerator` for `ownerId`. Releases any other accelerator this
   * same owner previously held. Returns ok:false without side effects if the
   * accelerator is already held by a *different* owner (in-app conflict) or
   * rejected by the OS (another app already has it). */
  claim(accelerator: string, ownerId: string, ownerLabel: string, callback: () => void): ClaimResult {
    const existing = this.claims.get(accelerator);
    if (existing && existing.ownerId !== ownerId) {
      return { ok: false, conflictLabel: existing.ownerLabel };
    }
    if (existing && existing.ownerId === ownerId) {
      return { ok: true }; // already correctly registered, nothing to do
    }

    this.release(ownerId); // drop this owner's previous accelerator, if any

    const registered = globalShortcut.register(accelerator, callback);
    if (!registered) return { ok: false };
    this.claims.set(accelerator, { accelerator, ownerId, ownerLabel, callback });
    return { ok: true };
  }

  /** Releases every accelerator held by `ownerId` (e.g. the hotkey was
   * cleared, or the script was deleted). */
  release(ownerId: string): void {
    for (const [accel, claim] of [...this.claims]) {
      if (claim.ownerId === ownerId) {
        globalShortcut.unregister(accel);
        this.claims.delete(accel);
      }
    }
  }

  releaseAll(): void {
    for (const accel of this.claims.keys()) globalShortcut.unregister(accel);
    this.claims.clear();
  }

  /** Unregisters every held accelerator at the OS level *without* forgetting
   * who owns what — used while the user is recording a new hotkey, so that
   * pressing a combo an existing script already owns just gets captured as
   * input instead of also firing that script in the background. */
  suspendAll(): void {
    for (const accel of this.claims.keys()) globalShortcut.unregister(accel);
  }

  /** Re-registers every claim that `suspendAll` unregistered. */
  resumeAll(): void {
    for (const claim of this.claims.values()) globalShortcut.register(claim.accelerator, claim.callback);
  }
}

export const hotkeyRegistrar = new HotkeyRegistrar();
