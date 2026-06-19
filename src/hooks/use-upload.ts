import { useState, useCallback } from "react";
import { type BucketName, type UploadResult, uploadFile } from "@/lib/storage";

type UploadState = {
  url: string | null;
  path: string | null;
  uploading: boolean;
  error: string | null;
  progress: number;
};

type UseUploadReturn = UploadState & {
  upload: (file: File) => Promise<UploadResult>;
  reset: () => void;
};

const INITIAL_STATE: UploadState = {
  url: null,
  path: null,
  uploading: false,
  error: null,
  progress: 0,
};

// ============================================================
// useUpload
// Generic upload hook — pass in a path-resolver so each usage
// site controls the bucket + path without duplicating state logic.
// ============================================================
export function useUpload(
  bucket: BucketName,
  getPath: (file: File) => string,
): UseUploadReturn {
  const [state, setState] = useState<UploadState>(INITIAL_STATE);

  const upload = useCallback(
    async (file: File): Promise<UploadResult> => {
      setState({ ...INITIAL_STATE, uploading: true, progress: 10 });

      const path = getPath(file);

      // Simulate progress during upload (Supabase JS SDK doesn't expose XHR progress)
      const ticker = setInterval(() => {
        setState((s) => ({
          ...s,
          progress: Math.min(s.progress + 15, 85),
        }));
      }, 200);

      const result = await uploadFile(bucket, path, file);
      clearInterval(ticker);

      if (result.error) {
        setState({ ...INITIAL_STATE, error: result.error });
      } else {
        setState({
          url: result.url,
          path: result.path,
          uploading: false,
          error: null,
          progress: 100,
        });
      }

      return result;
    },
    [bucket, getPath],
  );

  const reset = useCallback(() => setState(INITIAL_STATE), []);

  return { ...state, upload, reset };
}

// ============================================================
// useAvatarUpload — scoped to the authenticated user's folder
// ============================================================
import { uploadAvatar } from "@/lib/storage";

type AvatarUploadReturn = Omit<UseUploadReturn, "upload"> & {
  upload: (userId: string, file: File) => Promise<UploadResult>;
};

export function useAvatarUpload(): AvatarUploadReturn {
  const [state, setState] = useState<UploadState>(INITIAL_STATE);

  const upload = useCallback(
    async (userId: string, file: File): Promise<UploadResult> => {
      setState({ ...INITIAL_STATE, uploading: true, progress: 10 });

      const ticker = setInterval(() => {
        setState((s) => ({ ...s, progress: Math.min(s.progress + 15, 85) }));
      }, 200);

      const result = await uploadAvatar(userId, file);
      clearInterval(ticker);

      if (result.error) {
        setState({ ...INITIAL_STATE, error: result.error });
      } else {
        setState({ url: result.url, path: result.path, uploading: false, error: null, progress: 100 });
      }

      return result;
    },
    [],
  );

  const reset = useCallback(() => setState(INITIAL_STATE), []);

  return { ...state, upload, reset };
}
