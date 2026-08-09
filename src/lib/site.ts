/** عنوان الموقع العام — السيرفر الحالي بلا نطاق مملوك */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.SITE_URL ||
  "http://192.3.12.130"
).replace(/\/$/, "");
