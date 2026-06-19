import { useRef } from "react";
import { ImagePlus, Loader as Loader2, X, CircleAlert as AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BucketName } from "@/lib/storage";
import { useUpload } from "@/hooks/use-upload";

// ============================================================
// StorageImagePicker
// Drop-in replacement for the data-URL ImagePicker used in
// onboarding. Uploads immediately on file select and calls
// onUploaded with the public URL once done.
// ============================================================
type StorageImagePickerProps = {
  bucket: BucketName;
  getPath: (file: File) => string;
  value?: string | null;
  onUploaded: (url: string, path: string) => void;
  onRemove?: () => void;
  label?: string;
  aspect?: "square" | "wide";
  className?: string;
  accept?: string;
};

export function StorageImagePicker({
  bucket,
  getPath,
  value,
  onUploaded,
  onRemove,
  label = "Upload image",
  aspect = "square",
  className,
  accept = "image/*",
}: StorageImagePickerProps) {
  const ref = useRef<HTMLInputElement>(null);
  const { uploading, error, progress, upload } = useUpload(bucket, getPath);

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const result = await upload(file);
    if (result.url) onUploaded(result.url, result.path);
    // Reset the input so the same file can be re-selected after a remove
    e.target.value = "";
  };

  return (
    <div className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => !uploading && ref.current?.click()}
        className={cn(
          "glass relative grid w-full place-items-center overflow-hidden rounded-2xl border border-dashed border-border text-muted-foreground transition-colors",
          aspect === "wide" ? "aspect-[16/7]" : "aspect-square",
          uploading ? "cursor-wait opacity-70" : "hover:text-foreground",
          error && "border-destructive/50",
        )}
      >
        {value ? (
          <img src={value} alt={label} className="h-full w-full object-cover" />
        ) : uploading ? (
          <div className="flex flex-col items-center gap-1.5 p-3 text-center text-xs">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>{progress}%</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-1 p-3 text-center text-xs text-destructive">
            <AlertCircle className="h-5 w-5" />
            <span>Upload failed</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1 p-3 text-center text-xs">
            <ImagePlus className="h-5 w-5" />
            {label}
          </div>
        )}

        {/* Upload progress bar */}
        {uploading && (
          <div className="absolute bottom-0 left-0 h-0.5 w-full bg-border">
            <div
              className="h-full bg-primary transition-all duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </button>

      {/* Remove button — only shown when a URL is set */}
      {value && onRemove && !uploading && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="absolute right-1.5 top-1.5 z-10 rounded-full bg-background/80 p-1 text-muted-foreground shadow-sm backdrop-blur-sm transition-colors hover:bg-destructive/10 hover:text-destructive"
          aria-label="Remove image"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}

      <input
        ref={ref}
        type="file"
        accept={accept}
        className="hidden"
        onChange={handleChange}
      />
    </div>
  );
}

// ============================================================
// AvatarUploader
// Shows the user's avatar with an upload-on-click interaction.
// Used in /dashboard/settings Profile tab.
// ============================================================
import { useAvatarUpload } from "@/hooks/use-upload";

type AvatarUploaderProps = {
  userId: string;
  currentUrl?: string | null;
  onUploaded: (url: string) => void;
  size?: "sm" | "md" | "lg";
  initials?: string;
};

const sizeMap = {
  sm: "h-10 w-10 text-sm",
  md: "h-16 w-16 text-lg",
  lg: "h-24 w-24 text-2xl",
};

export function AvatarUploader({
  userId,
  currentUrl,
  onUploaded,
  size = "md",
  initials = "?",
}: AvatarUploaderProps) {
  const ref = useRef<HTMLInputElement>(null);
  const { uploading, progress, error, upload } = useAvatarUpload();

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const result = await upload(userId, file);
    if (result.url) onUploaded(result.url);
    e.target.value = "";
  };

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => !uploading && ref.current?.click()}
        className={cn(
          "relative overflow-hidden rounded-full border-2 border-border bg-secondary",
          sizeMap[size],
          uploading ? "cursor-wait" : "cursor-pointer hover:opacity-80",
        )}
        title="Change photo"
      >
        {currentUrl ? (
          <img
            src={currentUrl}
            alt="Avatar"
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center font-semibold text-muted-foreground">
            {initials.slice(0, 2).toUpperCase()}
          </span>
        )}

        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-sm">
            <Loader2 className="h-5 w-5 animate-spin text-foreground" />
          </div>
        )}

        {/* Progress ring */}
        {uploading && (
          <svg
            className="absolute inset-0 -rotate-90"
            viewBox="0 0 100 100"
            fill="none"
          >
            <circle
              cx="50"
              cy="50"
              r="46"
              stroke="currentColor"
              strokeWidth="4"
              className="text-primary"
              strokeDasharray={`${progress * 2.89} 289`}
            />
          </svg>
        )}
      </button>

      {error && (
        <span className="mt-1 block text-center text-[10px] text-destructive">
          {error}
        </span>
      )}

      <input
        ref={ref}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={handleChange}
      />
    </div>
  );
}

// ============================================================
// PrivateFileUploader
// For driver documents and SOS attachments — shows a label
// and a loading state but never renders a preview (private buckets).
// ============================================================
type PrivateFileUploaderProps = {
  bucket: BucketName;
  getPath: (file: File) => string;
  label: string;
  accept?: string;
  onUploaded: (path: string) => void;
  currentPath?: string | null;
};

export function PrivateFileUploader({
  bucket,
  getPath,
  label,
  accept = "image/jpeg,image/png,application/pdf",
  onUploaded,
  currentPath,
}: PrivateFileUploaderProps) {
  const ref = useRef<HTMLInputElement>(null);
  const { uploading, error, progress, upload } = useUpload(bucket, getPath);

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const result = await upload(file);
    if (result.path) onUploaded(result.path);
    e.target.value = "";
  };

  return (
    <button
      type="button"
      onClick={() => !uploading && ref.current?.click()}
      className={cn(
        "glass flex w-full items-center gap-3 rounded-2xl border border-dashed border-border px-4 py-3 text-sm transition-colors",
        uploading
          ? "cursor-wait opacity-70"
          : "hover:border-primary/50 hover:text-foreground",
        error && "border-destructive/40 text-destructive",
        currentPath && "border-solid border-border",
      )}
    >
      {uploading ? (
        <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
      ) : error ? (
        <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
      ) : (
        <ImagePlus className="h-4 w-4 shrink-0 text-muted-foreground" />
      )}

      <span className="flex-1 truncate text-left">
        {error
          ? "Upload failed — tap to retry"
          : uploading
            ? `Uploading… ${progress}%`
            : currentPath
              ? "File uploaded"
              : label}
      </span>

      {uploading && (
        <div className="h-1 w-16 overflow-hidden rounded-full bg-border">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      <input
        ref={ref}
        type="file"
        accept={accept}
        className="hidden"
        onChange={handleChange}
      />
    </button>
  );
}
