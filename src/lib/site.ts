/** عنوان الموقع العام — السيرفر الحالي بلا نطاق مملوك */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.SITE_URL ||
  "http://13.53.56.196"
).replace(/\/$/, "");
