export interface PendingAttachment {
  id: string;
  file: File;
  name: string;
  mimeType: string;
  size: number;
  status: "pending" | "uploading" | "uploaded" | "error";
  progress: number;
  url?: string;
  error?: string;
}

export interface SignedUploadUrl {
  uploadUrl: string;
  finalUrl: string;
  headers?: Record<string, string>;
  metadata?: Record<string, unknown>;
}

export interface AttachmentUploadConfig {
  requestSignedUrl: (file: {
    name: string;
    mimeType: string;
    size: number;
  }) => Promise<SignedUploadUrl>;
  uploadToSignedUrl: (
    signedUrl: SignedUploadUrl,
    file: File,
    onProgress?: (pct: number) => void,
  ) => Promise<boolean>;
  confirmUpload: (
    signedUrl: SignedUploadUrl,
    fileMeta: { name: string; mimeType: string; size: number },
  ) => Promise<string>;
}

export interface SimpleUploadConfig {
  endpoint: string;
  headers?: Record<string, string>;
}

export type UploadConfig = AttachmentUploadConfig | SimpleUploadConfig;

export function isMultiStepUpload(config: UploadConfig): config is AttachmentUploadConfig {
  return "requestSignedUrl" in config;
}
