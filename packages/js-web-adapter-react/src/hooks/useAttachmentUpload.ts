import { useState, useCallback, useRef } from "react";
import { PendingAttachment, UploadConfig, isMultiStepUpload } from "../types/AttachmentUpload";

function generateAttachmentId(): string {
  return `att-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function useAttachmentUpload(uploadConfig: UploadConfig) {
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const abortControllers = useRef<Map<string, AbortController>>(new Map());
  const uploadFileRef = useRef<(attachment: PendingAttachment) => Promise<void>>();

  const addFiles = useCallback((files: FileList | File[]) => {
    const fileArray = Array.isArray(files) ? files : Array.from(files);

    const newAttachments: PendingAttachment[] = fileArray.map((file) => ({
      id: generateAttachmentId(),
      file,
      name: file.name,
      mimeType: file.type,
      size: file.size,
      status: "pending",
      progress: 0,
    }));

    setAttachments((prev) => [...prev, ...newAttachments]);

    newAttachments.forEach((att) => uploadFileRef.current?.(att));
  }, []);

  const uploadFile = useCallback(
    async (attachment: PendingAttachment) => {
      const controller = new AbortController();
      abortControllers.current.set(attachment.id, controller);

      try {
        setAttachments((prev) =>
          prev.map((a) =>
            a.id === attachment.id ? { ...a, status: "uploading", progress: 0 } : a,
          ),
        );

        if (isMultiStepUpload(uploadConfig)) {
          const signedUrl = await uploadConfig.requestSignedUrl({
            name: attachment.name,
            mimeType: attachment.mimeType,
            size: attachment.size,
          });

          if (controller.signal.aborted) return;

          const uploadSuccess = await uploadConfig.uploadToSignedUrl(
            signedUrl,
            attachment.file,
            (progress) => {
              setAttachments((prev) =>
                prev.map((a) => (a.id === attachment.id ? { ...a, progress } : a)),
              );
            },
          );

          if (controller.signal.aborted) return;

          if (!uploadSuccess) {
            throw new Error("Upload to signed URL failed");
          }

          const finalUrl = await uploadConfig.confirmUpload(signedUrl, {
            name: attachment.name,
            mimeType: attachment.mimeType,
            size: attachment.size,
          });

          setAttachments((prev) =>
            prev.map((a) =>
              a.id === attachment.id
                ? { ...a, status: "uploaded", progress: 100, url: finalUrl }
                : a,
            ),
          );
        } else {
          const formData = new FormData();
          formData.append("file", attachment.file);

          const xhr = new XMLHttpRequest();

          xhr.upload.addEventListener("progress", (e) => {
            if (e.lengthComputable) {
              const progress = Math.round((e.loaded / e.total) * 100);
              setAttachments((prev) =>
                prev.map((a) => (a.id === attachment.id ? { ...a, progress } : a)),
              );
            }
          });

          const response = await new Promise<{ url: string }>((resolve, reject) => {
            xhr.onload = () => {
              if (xhr.status >= 200 && xhr.status < 300) {
                resolve(JSON.parse(xhr.responseText));
              } else {
                reject(new Error(`Upload failed: ${xhr.status}`));
              }
            };
            xhr.onerror = () => reject(new Error("Network error"));
            xhr.onabort = () => reject(new Error("Upload cancelled"));

            xhr.open("POST", uploadConfig.endpoint);
            if (uploadConfig.headers) {
              Object.entries(uploadConfig.headers).forEach(([key, value]) => {
                xhr.setRequestHeader(key, value);
              });
            }
            xhr.send(formData);
          });

          setAttachments((prev) =>
            prev.map((a) =>
              a.id === attachment.id
                ? { ...a, status: "uploaded", progress: 100, url: response.url }
                : a,
            ),
          );
        }
      } catch (error) {
        if (controller.signal.aborted) return;

        setAttachments((prev) =>
          prev.map((a) =>
            a.id === attachment.id
              ? {
                  ...a,
                  status: "error",
                  error: error instanceof Error ? error.message : "Upload failed",
                }
              : a,
          ),
        );
      } finally {
        abortControllers.current.delete(attachment.id);
      }
    },
    [uploadConfig],
  );

  uploadFileRef.current = uploadFile;

  const removeAttachment = useCallback((id: string) => {
    const controller = abortControllers.current.get(id);
    if (controller) {
      controller.abort();
    }
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const clearAttachments = useCallback(() => {
    abortControllers.current.forEach((c) => c.abort());
    abortControllers.current.clear();
    setAttachments([]);
  }, []);

  const resetUploads = useCallback(() => {
    setAttachments((prev) =>
      prev.map((a) =>
        a.status === "error" ? { ...a, status: "pending", progress: 0, error: undefined } : a,
      ),
    );
  }, []);

  const getUploadedAttachments = useCallback(() => {
    return attachments.filter((a) => a.status === "uploaded" && a.url);
  }, [attachments]);

  const isUploading = attachments.some((a) => a.status === "uploading");

  const isComplete =
    attachments.length > 0 &&
    attachments.every((a) => a.status === "uploaded" || a.status === "error");

  return {
    attachments,
    addFiles,
    removeAttachment,
    clearAttachments,
    resetUploads,
    getUploadedAttachments,
    isUploading,
    isComplete,
  };
}
