import type { PlatformMeta } from "./types.js";

export const PLATFORM_META: Record<string, PlatformMeta> = {
  douyin: {
    id: "douyin",
    name: "抖音",
    nameEn: "Douyin",
    mode: "official_api",
    description: "抖音开放平台内容发布 API。需应用审核通过后，用用户授权发布图文/视频。",
    docsUrl: "https://developer.open-douyin.com/",
    credentialFields: [
      {
        key: "DOUYIN_CLIENT_KEY",
        label: "Client Key",
        required: true,
      },
      {
        key: "DOUYIN_CLIENT_SECRET",
        label: "Client Secret",
        secret: true,
        required: true,
      },
      {
        key: "DOUYIN_ACCESS_TOKEN",
        label: "User Access Token",
        secret: true,
        required: true,
        help: "完成 OAuth 授权后写入，或手动粘贴有效 token",
      },
      {
        key: "DOUYIN_OPEN_ID",
        label: "Open ID",
        required: true,
      },
    ],
  },
  x: {
    id: "x",
    name: "X",
    nameEn: "Twitter / X",
    mode: "official_api",
    description: "X API v2 发帖。支持 OAuth 1.0a 用户上下文，或带 tweet.write 的 OAuth 2.0 user token。",
    docsUrl: "https://developer.x.com/",
    credentialFields: [
      { key: "X_API_KEY", label: "API Key", required: false },
      { key: "X_API_SECRET", label: "API Secret", secret: true, required: false },
      { key: "X_ACCESS_TOKEN", label: "Access Token", secret: true, required: false },
      {
        key: "X_ACCESS_TOKEN_SECRET",
        label: "Access Token Secret",
        secret: true,
        required: false,
      },
      {
        key: "X_BEARER_USER_TOKEN",
        label: "OAuth2 User Bearer (可选)",
        secret: true,
        required: false,
        help: "若填写则优先使用 OAuth 2.0 user token 发帖",
      },
    ],
  },
  facebook: {
    id: "facebook",
    name: "Facebook",
    nameEn: "Facebook Page",
    mode: "official_api",
    description: "Meta Graph API 向 Page 发帖。需要 pages_manage_posts 与 Page Access Token。",
    docsUrl: "https://developers.facebook.com/docs/pages-api/posts/",
    credentialFields: [
      { key: "META_APP_ID", label: "App ID", required: true },
      { key: "META_APP_SECRET", label: "App Secret", secret: true, required: true },
      { key: "META_PAGE_ID", label: "Page ID", required: true },
      {
        key: "META_PAGE_ACCESS_TOKEN",
        label: "Page Access Token",
        secret: true,
        required: true,
      },
    ],
  },
  instagram: {
    id: "instagram",
    name: "Instagram",
    nameEn: "Instagram Professional",
    mode: "official_api",
    description:
      "Instagram Content Publishing API。仅支持专业号；图片需可被 Meta 拉取的公网 URL（本机验证时用临时公网或已托管 URL）。",
    docsUrl: "https://developers.facebook.com/docs/instagram-platform/content-publishing/",
    credentialFields: [
      { key: "META_APP_ID", label: "App ID", required: true },
      { key: "META_APP_SECRET", label: "App Secret", secret: true, required: true },
      { key: "META_IG_USER_ID", label: "IG User ID", required: true },
      {
        key: "META_PAGE_ACCESS_TOKEN",
        label: "Page / IG Access Token",
        secret: true,
        required: true,
      },
      {
        key: "INSTAGRAM_IMAGE_PUBLIC_URL",
        label: "测试图公网 URL（可选）",
        required: false,
        help: "IG API 需要可公网访问的 image_url；未填则只能验证到容器创建前一步",
      },
    ],
  },
  tiktok: {
    id: "tiktok",
    name: "TikTok",
    nameEn: "TikTok",
    mode: "official_api",
    description:
      "TikTok Content Posting API（图文 Direct Post）。需 video.publish 授权；图片须来自已验证域名的公网 URL。未审核应用仅能发 SELF_ONLY。",
    docsUrl: "https://developers.tiktok.com/doc/content-posting-api-get-started",
    credentialFields: [
      {
        key: "TIKTOK_CLIENT_KEY",
        label: "Client Key",
        required: false,
        help: "TikTok for Developers 应用 Client Key（可选，便于对照）",
      },
      {
        key: "TIKTOK_CLIENT_SECRET",
        label: "Client Secret",
        secret: true,
        required: false,
      },
      {
        key: "TIKTOK_ACCESS_TOKEN",
        label: "User Access Token",
        secret: true,
        required: true,
        help: "用户授权后的 access token，需含 video.publish",
      },
      {
        key: "TIKTOK_IMAGE_PUBLIC_URL",
        label: "测试图公网 URL（可选）",
        required: false,
        help: "图文 Direct Post 仅支持 PULL_FROM_URL，且域名须在开发者后台验证；未填则停在媒体可达性步骤",
      },
      {
        key: "TIKTOK_PRIVACY_LEVEL",
        label: "隐私级别（可选）",
        required: false,
        placeholder: "SELF_ONLY",
        help: "须落在 creator_info/query 返回的 privacy_level_options 内；未审核客户端默认 SELF_ONLY",
      },
    ],
  },
};

export const PLATFORM_ORDER = [
  "douyin",
  "tiktok",
  "x",
  "facebook",
  "instagram",
] as const;
