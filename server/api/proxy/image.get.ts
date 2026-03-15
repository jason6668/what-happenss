import { ApiResponse } from '../../utils/response'
import axios from 'axios';
import {createHash} from 'crypto';
import {genRandomUserAgent} from '../../utils';
// --- 缓存机制 ---
// 只要服务器实例正在运行，这个缓存就会一直存在。
const CACHE_TIME = 24 * 60 * 60 * 1000; // 24小时
const imageCache = new Map<string, { data: Buffer; timestamp: number; contentType: string }>();

// 定时清理过期的缓存条目。
setInterval(() => {
    const now = Date.now();
    for (const [key, value] of imageCache) {
        if (now - value.timestamp > CACHE_TIME) {
            imageCache.delete(key);
        }
    }
}, CACHE_TIME);
export default defineEventHandler(async (event) => {
    const query = getQuery(event)
    const {
        url,
        w: width,
        h: height,
        q: quality,
        fmt: format,
        cache = 'true'
    } = query;

    if (!url || typeof url !== 'string') {
        return ApiResponse.error('缺少 url 参数', 400);
    }

    if (!verifyRequest(query)) {
        return ApiResponse.error('无效或已过期的请求', 403);
    }
    const options = {
        width: width ? parseInt(width as string) : undefined,
        height: height ? parseInt(height as string) : undefined,
        quality: quality ? parseInt(quality as string) : 80,
        format: format as 'jpeg' | 'png' | 'webp' | 'gif' | undefined,
    };
    try {
        const cacheKey = generateCacheKey(url, options);
        if (cache === 'true' && imageCache.has(cacheKey)) {
            const cached = imageCache.get(cacheKey)!;
            if (Date.now() - cached.timestamp < CACHE_TIME) {
                setResponseHeader(event, 'Content-Type', cached.contentType);
                setResponseHeader(event, 'X-Cache', 'HIT');
                setResponseHeader(event, 'Cache-Control', `public, max-age=${CACHE_TIME / 1000}`);
                return send(event, cached.data);
            }
        }

        const decodedUrl = decodeURIComponent(url);
        const response = await axios.get(decodedUrl, {
            responseType: 'arraybuffer',
            headers: { 'User-Agent': genRandomUserAgent() },
        });

        const imageBuffer = Buffer.from(response.data);
        const originalFormat = detectImageFormat(imageBuffer);

        if (originalFormat === 'gif' && !options.format && !options.width && !options.height) {
            if (cache === 'true') {
                imageCache.set(cacheKey, {
                    data: imageBuffer,
                    timestamp: Date.now(),
                    contentType: 'image/gif',
                });
            }
            setResponseHeader(event, 'Content-Type', 'image/gif');
            setResponseHeader(event, 'X-Cache', 'MISS');
            setResponseHeader(event, 'Cache-Control', `public, max-age=${CACHE_TIME / 1000}`);
            return send(event, imageBuffer);
        }

        // 尝试使用 Sharp 处理图片
        // Cloudflare Workers / Edge 环境不支持 sharp 原生模块，会自动降级为直接透传原图
        let processedImage: Buffer = imageBuffer;
        let finalFormat = options.format || originalFormat;
        try {
            const sharp = (await import('sharp')).default;
            let image = sharp(imageBuffer, { animated: originalFormat === 'gif' });

            if (options.width || options.height) {
                image.resize(options.width, options.height, {
                    fit: 'inside',
                    withoutEnlargement: true,
                });
            }

            switch (finalFormat) {
                case 'jpeg':
                    image.jpeg({ quality: options.quality });
                    break;
                case 'png':
                    image.png({ quality: options.quality });
                    break;
                case 'webp':
                    image.webp({ quality: options.quality });
                    break;
                case 'gif':
                    image.gif();
                    break;
            }

            processedImage = await image.toBuffer();
        } catch (_sharpError) {
            // Cloudflare Workers / Edge 环境不支持 sharp 原生模块，直接透传原图
            processedImage = imageBuffer;
            finalFormat = originalFormat;
        }

        const finalContentType = `image/${finalFormat}`;
        if (cache === 'true') {
            imageCache.set(cacheKey, {
                data: processedImage,
                timestamp: Date.now(),
                contentType: finalContentType,
            });
        }

        setResponseHeader(event, 'Content-Type', finalContentType);
        setResponseHeader(event, 'X-Cache', 'MISS');
        setResponseHeader(event, 'Cache-Control', `public, max-age=${CACHE_TIME / 1000}`);

        return send(event, processedImage);

    } catch (error: any) {
        console.error('图片代理出错:', error.message);
        if (error.isAxiosError && error.response) {
            return ApiResponse.error(`获取图片失败: ${error.response.statusText}`, error.response.status);
        }
        return ApiResponse.error('处理图片时发生错误', 500);
    }
})

const generateCacheKey = (url: string, options: any): string => {
    const str = `${url}-${JSON.stringify(options)}`;
    return createHash('md5').update(str).digest('hex');
};

const verifyRequest = (query: ReturnType<typeof getQuery>): boolean => {
    const config = useRuntimeConfig();
    if (!config.proxySecret) return true;
    // @ts-ignore
    const timestamp = parseInt(query.t as string);
    if (isNaN(timestamp) || Date.now() - timestamp > 300000) {
        return false;
    }
    return true;
};

const detectImageFormat = (buffer: Buffer): string => {
    if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) return 'gif';
    if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) return 'png';
    if (buffer[0] === 0xFF && buffer[1] === 0xD8) return 'jpeg';
    if (buffer.length > 12 && buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50) return 'webp';
    return 'jpeg';
};
