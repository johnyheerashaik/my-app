export const ENV_CONFIG = {
    development: {
        API_URL: 'http://localhost:8787/api/chat/stream',
        name: 'Development (Local)'
    },
    staging: {
        API_URL: 'http://localhost:8787/api/chat/stream',
        name: 'Staging (Local)'
    },
    production: {
        API_URL: 'https://my-app-2744.onrender.com/api/chat/stream',
        name: 'Production (Render)'
    }
} as const;

export type Environment = keyof typeof ENV_CONFIG;

// Debug: Log what we're getting from import.meta.env
console.log('DEBUG - import.meta.env.VITE_ENV:', import.meta.env.VITE_ENV);
console.log('DEBUG - All env vars:', import.meta.env);

export const CURRENT_ENV: Environment =
    (import.meta.env.VITE_ENV as Environment) || 'development';

export const config = ENV_CONFIG[CURRENT_ENV];

export const isDev = CURRENT_ENV === 'development';
export const isStaging = CURRENT_ENV === 'staging';
export const isProd = CURRENT_ENV === 'production';

// Log current environment on load
console.log(`🌍 Environment: ${CURRENT_ENV}`);
console.log(`📡 API URL: ${config.API_URL}`);
