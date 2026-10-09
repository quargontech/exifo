"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect } from "react";
import { Dropzone } from "@/components/Dropzone";
import { useFiles } from "@/store/files";

/** Drop or paste images on the home page: they are queued and Clean opens with them. */
export function HomeDropzone() {
  const router = useRouter();
  useEffect(() => router.prefetch("/clean/"), [router]);
  const onFiles = useCallback(
    async (files: File[]) => {
      await useFiles.getState().add(files);
      router.push("/clean/");
    },
    [router],
  );
  return (
    <Dropzone
      onFiles={onFiles}
      variant="panel"
      title="Drop images to clean"
      hint="JPEG · PNG · WebP · up to 50 MB each · nothing is uploaded"
      className="min-h-[320px] sm:min-h-[360px]"
    />
  );
}
