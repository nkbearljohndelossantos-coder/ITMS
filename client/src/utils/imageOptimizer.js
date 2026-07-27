/**
 * Image Optimizer Utility for ITMS WebApp.
 * Automatically resizes and compresses high-resolution camera photos from smartphones.
 * Converts 10MB+ raw camera shots to crisp, HD web-optimized JPEGs (300KB - 800KB).
 */
export async function optimizeImageQuality(file, maxWidth = 1920, maxHeight = 1920, quality = 0.85) {
  if (!file || !file.type.startsWith('image/')) {
    return file;
  }

  return new Promise((resolve) => {
    const image = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
      image.src = e.target.result;
    };

    image.onload = () => {
      let width = image.width;
      let height = image.height;

      // Calculate aspect ratio preserving dimensions
      if (width > maxWidth || height > maxHeight) {
        if (width > height) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        } else {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(image, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file);
            return;
          }

          const fileName = file.name.replace(/\.[^/.]+$/, '') + '_optimized.jpg';
          const optimizedFile = new File([blob], fileName, {
            type: 'image/jpeg',
            lastModified: Date.now(),
          });

          console.log(
            `[ImageOptimizer] Original size: ${(file.size / 1024).toFixed(1)} KB -> Optimized HD size: ${(optimizedFile.size / 1024).toFixed(1)} KB (${width}x${height})`
          );

          resolve(optimizedFile);
        },
        'image/jpeg',
        quality
      );
    };

    image.onerror = () => {
      resolve(file);
    };

    reader.readAsDataURL(file);
  });
}
