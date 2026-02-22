/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['papaparse'],
  outputFileTracingIncludes: {
    '/api/chat': ['./hvac_construction_dataset/**/*.csv'],
  },
}

export default nextConfig
