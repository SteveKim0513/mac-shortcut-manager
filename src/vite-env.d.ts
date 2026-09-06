/// <reference types="vite/client" />
import type { MsmApi } from '../electron/preload';

declare global {
  interface Window {
    msm: MsmApi;
  }
}

export {};
