export interface SharePayload {
  title?: string;
  text?: string;
  url?: string;
  files?: File[];
}

export interface ShareProvider {
  /** Resolves `true` if the share sheet was shown and completed (or there's no way to tell — best-effort). */
  share(payload: SharePayload): Promise<boolean>;
  /** Whether this platform can share `files`, not just text/links. */
  canShareFiles(): boolean;
}
