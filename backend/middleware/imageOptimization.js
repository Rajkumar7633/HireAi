const sharp = require('sharp');

/**
 * Optimize uploaded images
 * @param {Buffer} imageBuffer - The image buffer
 * @param {Object} options - Optimization options
 * @returns {Promise<Buffer>} Optimized image buffer
 */
const optimizeImage = async (imageBuffer, options = {}) => {
  const {
    width = 1200,
    height = null,
    quality = 80,
    format = 'jpeg',
    resize = true
  } = options;

  try {
    let image = sharp(imageBuffer);

    // Get image metadata
    const metadata = await image.metadata();

    // Resize if requested
    if (resize && (width || height)) {
      image = image.resize(width, height, {
        fit: 'inside',
        withoutEnlargement: true
      });
    }

    // Optimize based on format
    switch (format.toLowerCase()) {
      case 'jpeg':
      case 'jpg':
        image = image.jpeg({ quality, progressive: true });
        break;
      case 'png':
        image = image.png({ quality, compressionLevel: 9 });
        break;
      case 'webp':
        image = image.webp({ quality });
        break;
      case 'avif':
        image = image.avif({ quality });
        break;
      default:
        image = image.jpeg({ quality, progressive: true });
    }

    const optimizedBuffer = await image.toBuffer();
    
    // Calculate size reduction
    const originalSize = imageBuffer.length;
    const optimizedSize = optimizedBuffer.length;
    const reduction = ((originalSize - optimizedSize) / originalSize * 100).toFixed(2);
    
    console.log(`Image optimized: ${originalSize} bytes -> ${optimizedSize} bytes (${reduction}% reduction)`);
    
    return optimizedBuffer;
  } catch (error) {
    console.error('Image optimization error:', error);
    // Return original buffer if optimization fails
    return imageBuffer;
  }
};

/**
 * Generate thumbnails for images
 * @param {Buffer} imageBuffer - The image buffer
 * @param {Array} sizes - Array of thumbnail sizes [{width, height, name}]
 * @returns {Promise<Array>} Array of thumbnail buffers
 */
const generateThumbnails = async (imageBuffer, sizes = [
  { width: 150, height: 150, name: 'thumbnail' },
  { width: 300, height: 300, name: 'small' },
  { width: 600, height: 600, name: 'medium' }
]) => {
  const thumbnails = [];
  
  for (const size of sizes) {
    try {
      const thumbnail = await optimizeImage(imageBuffer, {
        width: size.width,
        height: size.height,
        quality: 75,
        format: 'webp',
        resize: true
      });
      thumbnails.push({
        name: size.name,
        buffer: thumbnail,
        width: size.width,
        height: size.height
      });
    } catch (error) {
      console.error(`Error generating ${size.name} thumbnail:`, error);
    }
  }
  
  return thumbnails;
};

module.exports = {
  optimizeImage,
  generateThumbnails
};
