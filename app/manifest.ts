import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'nice work',
        short_name: 'nice work',
        description: 'Loyalty program for nice work restaurants',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#000000',
        icons: [
            {
                src: '/icon',
                sizes: 'any',
                type: 'image/png',
            },
            {
                src: '/apple-icon',
                sizes: 'any',
                type: 'image/png',
            }
        ],
    }
}
