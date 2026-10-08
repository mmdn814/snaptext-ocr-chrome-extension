import { CropArea } from "../types";

/**
 * Crops a designated area from an image (dataURL or Image element) using HTML5 Canvas
 */
export async function cropImage(
  imageSource: string | HTMLImageElement,
  cropArea: CropArea
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = typeof imageSource === "string" ? new Image() : imageSource;
    if (typeof imageSource === "string") {
      img.crossOrigin = "anonymous";
      img.src = imageSource;
    }

    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Failed to get 2D canvas context"));
          return;
        }

        // Clamp crop area
        const x = Math.max(0, Math.min(cropArea.x, img.naturalWidth || img.width));
        const y = Math.max(0, Math.min(cropArea.y, img.naturalHeight || img.height));
        const width = Math.min(cropArea.width, (img.naturalWidth || img.width) - x);
        const height = Math.min(cropArea.height, (img.naturalHeight || img.height) - y);

        if (width <= 0 || height <= 0) {
          // If area invalid, return entire image
          canvas.width = img.naturalWidth || img.width;
          canvas.height = img.naturalHeight || img.height;
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL("image/png"));
          return;
        }

        canvas.width = width;
        canvas.height = height;

        ctx.drawImage(
          img,
          x,
          y,
          width,
          height,
          0,
          0,
          width,
          height
        );

        resolve(canvas.toDataURL("image/png"));
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = (err) => reject(err);

    // If image is already loaded
    if (img.complete && (img.naturalWidth !== 0 || img.width !== 0)) {
      img.onload(new Event("load"));
    }
  });
}

/**
 * Capture frame from an HTMLVideoElement at current playback position
 */
export function captureVideoFrame(video: HTMLVideoElement): string {
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth || 640;
  canvas.height = video.videoHeight || 360;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/png");
  }
  return "";
}

/**
 * Create a small thumbnail for history display
 */
export async function createThumbnail(dataUrl: string, maxDim: number = 140): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = dataUrl;
    img.onload = () => {
      const canvas = document.createElement("canvas");
      let w = img.naturalWidth || img.width;
      let h = img.naturalHeight || img.height;
      if (w > h) {
        if (w > maxDim) {
          h = Math.round((h * maxDim) / w);
          w = maxDim;
        }
      } else {
        if (h > maxDim) {
          w = Math.round((w * maxDim) / h);
          h = maxDim;
        }
      }
      canvas.width = Math.max(1, w);
      canvas.height = Math.max(1, h);
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.75));
      } else {
        resolve(dataUrl);
      }
    };
    img.onerror = () => resolve(dataUrl);
  });
}
