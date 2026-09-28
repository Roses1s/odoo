import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useRef, useState } from "react";
import { api } from "@/shared/api/client";
import { apiErrorMessage, unwrapList } from "@/shared/lib/http";
import type { Attachment } from "@/shared/types";
import { previewKind } from "@/shared/ui/file-preview";

export interface PreviewState {
  file: Attachment;
  url?: string;
  text?: string;
  loading: boolean;
  error?: string;
}

/** Blob.text() is missing in older Safari, so fall back to FileReader. */
function blobToText(blob: Blob): Promise<string> {
  if (typeof blob.text === "function") return blob.text();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob);
  });
}

/**
 * Everything the lead card does with files: listing, uploading, deleting,
 * previewing and downloading.
 *
 * Attachments are served by an authorised endpoint, so they cannot be linked
 * to directly — the content is fetched and shown from memory. Fetched blobs
 * are cached per attachment because the feed re-renders after every note,
 * stage change and save, and inline thumbnails would otherwise be downloaded
 * again each time.
 */
export function useLeadAttachments(id: string | undefined, enabled: boolean) {
  const qc = useQueryClient();
  const cache = useRef(new Map<number, Promise<Blob>>());
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [downloadError, setDownloadError] = useState("");

  const listQuery = useQuery({
    queryKey: ["lead-attachments", id],
    enabled,
    queryFn: async () =>
      unwrapList<Attachment>((await api.get(`/crm/leads/${id}/attachments/`)).data),
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => {
      const data = new FormData();
      data.append("file", file);
      return api.post(`/crm/leads/${id}/attachments/`, data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lead-attachments", id] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (attachmentId: number) =>
      api.delete(`/crm/leads/${id}/attachments/${attachmentId}/`),
    onSuccess: (_data, attachmentId) => {
      cache.current.delete(attachmentId);
      qc.invalidateQueries({ queryKey: ["lead-attachments", id] });
      qc.invalidateQueries({ queryKey: ["timeline", id] });
    },
  });

  const load = useCallback(
    (attachment: Attachment): Promise<Blob> => {
      const cached = cache.current.get(attachment.id);
      if (cached) return cached;
      const request = api
        .get(`/crm/leads/${id}/attachments/${attachment.id}/download/`, { responseType: "blob" })
        // Rebuild the blob with the stored content type: the preview relies on
        // it to pick between an image, a PDF viewer and plain text.
        .then(
          (response) =>
            new Blob([response.data as Blob], {
              type: attachment.content_type || (response.data as Blob).type,
            }),
        )
        .catch((e) => {
          cache.current.delete(attachment.id);
          throw e;
        });
      cache.current.set(attachment.id, request);
      return request;
    },
    [id],
  );

  const closePreview = useCallback(() => {
    setPreview((current) => {
      if (current?.url) URL.revokeObjectURL(current.url);
      return null;
    });
  }, []);

  const openPreview = useCallback(
    async (attachment: Attachment) => {
      const kind = previewKind(attachment);
      if (kind === "none") {
        setPreview({ file: attachment, loading: false });
        return;
      }
      setPreview({ file: attachment, loading: true });
      try {
        const blob = await load(attachment);
        if (kind === "text") {
          setPreview({ file: attachment, text: await blobToText(blob), loading: false });
          return;
        }
        setPreview({ file: attachment, url: URL.createObjectURL(blob), loading: false });
      } catch (e) {
        setPreview({
          file: attachment,
          loading: false,
          error: apiErrorMessage(e, "Не удалось открыть файл"),
        });
      }
    },
    [load],
  );

  const download = useCallback(
    async (attachment: Attachment) => {
      try {
        const blob = await load(attachment);
        setDownloadError("");
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = attachment.name;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
      } catch (e) {
        setDownloadError(apiErrorMessage(e, "Не удалось скачать файл"));
      }
    },
    [load],
  );

  const error =
    downloadError ||
    (uploadMutation.error
      ? apiErrorMessage(uploadMutation.error, "Не удалось загрузить файл")
      : "") ||
    (deleteMutation.error
      ? apiErrorMessage(deleteMutation.error, "Не удалось удалить вложение")
      : "") ||
    undefined;

  return {
    attachments: listQuery.data ?? [],
    isUploading: uploadMutation.isPending,
    error,
    upload: (file: File) => uploadMutation.mutate(file),
    remove: (attachmentId: number) => deleteMutation.mutate(attachmentId),
    load,
    preview,
    openPreview,
    closePreview,
    download,
  };
}
